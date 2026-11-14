from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.compatibilidad import recalcular
from app.matching import generar_propuestas
from app.db import db, siguiente_codigo
from app.deps import usuario_actual
from app.routers.perfil import datos_invalidos
from app.schemas.cuestionario import (
    MAX_IMPRESCINDIBLES,
    CuestionarioAvanceIn,
    CuestionarioIn,
    CuestionarioOut,
    importancia_de,
    respuestas_de,
)

router = APIRouter(prefix="/api/cuestionario", tags=["Cuestionario"])


@router.get("", response_model=CuestionarioOut)
async def ver_cuestionario(usuario: dict = Depends(usuario_actual)):
    """CA-13.5: las respuestas anteriores, para verlas y modificarlas."""
    return CuestionarioOut.desde_doc(usuario)


@router.put("")
async def guardar_cuestionario(datos: CuestionarioIn, usuario: dict = Depends(usuario_actual)):
    """HU-13: guarda las respuestas en el usuario (CA-13.2) y deja en historial_cuestionario
    cada respuesta o importancia que cambió, para la mejora del algoritmo (EP-08)."""
    ahora = datetime.now(timezone.utc)
    # El avance guardado antes de completarlo (PATCH) no cuenta como respuesta anterior: el
    # historial parte desde la primera vez que el cuestionario queda completo
    anterior = usuario.get("cuestionario") or {}
    if not anterior.get("completo"):
        anterior = {}
    respuestas = datos.model_dump(exclude={"importancia"})

    cambios = [
        ("respuesta", categoria, respuestas_de(anterior)[categoria], respuestas[categoria])
        for categoria in respuestas
    ] + [
        # La primera vez que se responde, el valor anterior queda en null
        ("importancia", categoria, importancia_de(anterior)[categoria] if anterior else None, nivel)
        for categoria, nivel in datos.importancia.items()
    ]
    historial = [
        {
            "codigo": await siguiente_codigo("historial_cuestionario"),
            "usuario_id": usuario["_id"],
            "categoria": categoria,
            "campo": campo,
            "valor_anterior": antes,
            "valor_nuevo": despues,
            "origen": "usuario",
            "interacciones_ids": [],
            "fecha": ahora,
        }
        for campo, categoria, antes, despues in cambios
        if antes != despues
    ]

    cuestionario = {
        **respuestas,
        "importancia": [{"categoria": c, "nivel": n} for c, n in datos.importancia.items()],
        "completo": True,
        "campos_faltantes": [],
        "fecha_respuesta": anterior.get("fecha_respuesta") or ahora,
        "fecha_actualizacion": ahora,
    }
    await db.usuarios.update_one(
        {"_id": usuario["_id"]},
        {"$set": {"cuestionario": cuestionario, "fecha_actualizacion": ahora}},
    )
    if historial:
        await db.historial_cuestionario.insert_many(historial)

    # CA-14.5 y CA-04.4: la compatibilidad se recalcula con las respuestas nuevas
    calculadas = await recalcular({**usuario, "cuestionario": cuestionario})
    await generar_propuestas()  # HU-17: con la compatibilidad nueva pueden aparecer propuestas

    return {
        "mensaje": "Cuestionario guardado",
        "cuestionario": CuestionarioOut.desde_doc({"cuestionario": cuestionario}),
        "compatibilidades_calculadas": calculadas,
    }


@router.patch("")
async def guardar_avance(datos: CuestionarioAvanceIn, usuario: dict = Depends(usuario_actual)):
    """Autoguardado mientras se responde por primera vez, una respuesta a la vez, para no perder
    nada si se cierra la pestaña. Usa los mismos campos que el cuestionario completo y lo deja con
    completo=false, así la compatibilidad (que solo usa cuestionarios completos) no cambia.
    Al responder la última pregunta se guarda con PUT, que lo completa y recalcula la compatibilidad."""
    anterior = usuario.get("cuestionario") or {}
    if anterior.get("completo"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tu cuestionario ya está completo; los cambios se guardan con PUT",
        )

    respuestas = {**respuestas_de(anterior), **datos.model_dump(exclude={"importancia"}, exclude_none=True)}
    importancia = {**importancia_de(anterior), **datos.importancia}
    if list(importancia.values()).count("imprescindible") > MAX_IMPRESCINDIBLES:
        return datos_invalidos(
            {"importancia": f"Puedes marcar hasta {MAX_IMPRESCINDIBLES} categorías como imprescindibles"}
        )

    ahora = datetime.now(timezone.utc)
    cuestionario = {
        **respuestas,
        "importancia": [{"categoria": c, "nivel": n} for c, n in importancia.items()],
        "completo": False,
        "campos_faltantes": [c for c, v in respuestas.items() if v is None],
        "fecha_respuesta": None,
        "fecha_actualizacion": ahora,
    }
    await db.usuarios.update_one(
        {"_id": usuario["_id"]},
        {"$set": {"cuestionario": cuestionario, "fecha_actualizacion": ahora}},
    )
    return {"mensaje": "Avance guardado", "cuestionario": CuestionarioOut.desde_doc({"cuestionario": cuestionario})}
