from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.compatibilidad import recalcular
from app.db import db, siguiente_codigo
from app.deps import usuario_actual
from app.schemas.cuestionario import CuestionarioIn, CuestionarioOut, importancia_de, respuestas_de

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
    anterior = usuario.get("cuestionario") or {}
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

    return {
        "mensaje": "Cuestionario guardado",
        "cuestionario": CuestionarioOut.desde_doc({"cuestionario": cuestionario}),
        "compatibilidades_calculadas": calculadas,
    }
