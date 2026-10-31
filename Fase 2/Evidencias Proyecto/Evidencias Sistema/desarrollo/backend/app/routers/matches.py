from typing import Literal

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.compatibilidad import nivel_de
from app.db import db
from app.deps import usuario_actual
from app.matching import ABIERTAS, VIGENCIA, MatchNoDisponible, generar_propuestas, responder
from app.routers.compatibilidades import el_otro, resumenes
from app.routers.evaluaciones import estado_evaluacion
from app.routers.perfil import datos_invalidos
from app.schemas.seguimiento import TerminoIn
from app.seguimiento import NoSePuedeTerminar, avisar_evaluaciones, terminar_convivencia

router = APIRouter(prefix="/api/matches", tags=["Match"])

NO_ENCONTRADO = HTTPException(status.HTTP_404_NOT_FOUND, "Propuesta no encontrada")
HISTORIAL = 10  # propuestas cerradas que se muestran


class BusquedaIn(BaseModel):
    buscando: bool


class RechazoIn(BaseModel):
    motivo: Literal["baja_compatibilidad", "alojamiento_no_conviene", "ya_encontro_alojamiento", "otro"] | None = None


async def vista(matches: list[dict], yo: ObjectId) -> list[dict]:
    """Cada propuesta vista desde quien consulta: la otra persona, el alojamiento y las respuestas."""
    otros = [u async for u in db.usuarios.find({"_id": {"$in": [el_otro(m, yo) for m in matches]}})]
    tarjetas = await resumenes(otros)
    publicaciones = {
        p["_id"]: p
        async for p in db.publicaciones.find(
            {"_id": {"$in": [m["publicacion_id"] for m in matches]}},
            {"titulo": 1, "tipo": 1, "costo_mensual": 1, "ubicacion.comuna_nombre": 1, "fotos": 1, "estado": 1},
        )
    }

    def una(m: dict) -> dict:
        soy_a = m["usuario_a_id"] == yo
        pub = publicaciones.get(m["publicacion_id"], {})
        principal = next((f["url"] for f in pub.get("fotos", []) if f["es_principal"]), None)
        return {
            "id": str(m["_id"]),
            "codigo": m["codigo"],
            "estado": m["estado"],
            "rol": "buscador" if soy_a else "oferente",
            "otro": tarjetas.get(el_otro(m, yo)),
            "publicacion": {
                "id": str(m["publicacion_id"]),
                "titulo": pub.get("titulo", "Alojamiento no disponible"),
                "tipo": pub.get("tipo"),
                "costo_mensual": pub.get("costo_mensual"),
                "comuna": pub.get("ubicacion", {}).get("comuna_nombre"),
                "foto_url": principal,
                "visible": pub.get("estado") == "activa",
            },
            "porcentaje": m["pctj_compatibilidad"],
            "nivel": nivel_de(m["pctj_compatibilidad"]),
            "mi_respuesta": m["respuesta_a" if soy_a else "respuesta_b"]["estado"],
            "su_respuesta": m["respuesta_b" if soy_a else "respuesta_a"]["estado"],
            "fecha_sugerencia": m["fecha_sugerencia"],
            "vence": m["fecha_sugerencia"] + VIGENCIA if m["estado"] in ABIERTAS else None,
            "fecha_confirmacion": m["fecha_confirmacion"],
            # HU-18: evaluación de la convivencia al mes
            "evaluacion": estado_evaluacion(m, yo) if m["estado"] == "confirmado" else None,
            "fecha_fin": m.get("fecha_fin_convivencia"),
            "motivo_fin": m.get("motivo_fin"),
        }

    return [una(m) for m in matches]


@router.get("")
async def mis_propuestas(usuario: dict = Depends(usuario_actual)):
    """HU-17: las propuestas de match de RoomMatch, como buscador y como oferente."""
    yo = usuario["_id"]
    await generar_propuestas(usuario)  # también vence las que pasaron su plazo
    await avisar_evaluaciones()
    usuario = await db.usuarios.find_one({"_id": yo})

    mias = {"$or": [{"usuario_a_id": yo}, {"usuario_b_id": yo}]}
    abiertas = [m async for m in db.matches.find({**mias, "estado": {"$in": ABIERTAS}}).sort("fecha_sugerencia", -1)]
    confirmados = [m async for m in db.matches.find({**mias, "estado": "confirmado"}).sort("fecha_confirmacion", -1)]
    cerradas = [m async for m in db.matches.find({**mias, "estado": {"$in": ["rechazado", "expirado", "finalizado"]}})]
    # Lo más reciente primero: el término de la convivencia o la respuesta a la propuesta
    cerradas.sort(key=lambda m: m.get("fecha_fin_convivencia") or m["fecha_respuesta"] or m["fecha_sugerencia"], reverse=True)
    cerradas = cerradas[:HISTORIAL]
    return {
        "modo": usuario.get("modo"),
        "buscando": bool(usuario.get("buscando_alojamiento")),
        "con_convivencia": bool(usuario.get("match_activo_id")),
        "propuestas": await vista(abiertas, yo),
        "confirmados": await vista(confirmados, yo),
        "historial": await vista(cerradas, yo),
    }


@router.put("/busqueda")
async def cambiar_busqueda(datos: BusquedaIn, usuario: dict = Depends(usuario_actual)):
    """«Estoy buscando alojamiento»: solo quien lo activa recibe propuestas como buscador."""
    if datos.buscando and usuario.get("modo") != "buscador":
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Para activar la búsqueda cambia tu rol a «Busco dónde vivir». Mientras ofreces un espacio no puedes buscar",
        )
    if datos.buscando and usuario.get("match_activo_id"):
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya tienes una convivencia activa")  # CA-17.4
    await db.usuarios.update_one({"_id": usuario["_id"]}, {"$set": {"buscando_alojamiento": datos.buscando}})
    if not datos.buscando:
        # Las propuestas que aún nadie ha respondido dejan de tener sentido
        await db.matches.update_many(
            {"usuario_a_id": usuario["_id"], "estado": "sugerido"}, {"$set": {"estado": "expirado"}}
        )
        return {"mensaje": "Dejaste de recibir propuestas", "propuestas_nuevas": 0}
    nuevas = await generar_propuestas({**usuario, "buscando_alojamiento": True})
    return {"mensaje": "Te avisaremos cuando encontremos alojamientos compatibles", "propuestas_nuevas": nuevas}


async def propuesta_de(match_id: str, usuario: dict) -> dict:
    try:
        oid = ObjectId(match_id)
    except InvalidId:
        raise NO_ENCONTRADO
    match = await db.matches.find_one(
        {"_id": oid, "$or": [{"usuario_a_id": usuario["_id"]}, {"usuario_b_id": usuario["_id"]}]}
    )
    if not match:
        raise NO_ENCONTRADO  # tampoco se revela si existe entre otras personas
    return match


async def contestar(match_id: str, usuario: dict, acepta: bool, motivo: str | None = None) -> dict:
    match = await propuesta_de(match_id, usuario)
    try:
        match = await responder(match, usuario, acepta, motivo)
    except MatchNoDisponible as e:
        raise HTTPException(status.HTTP_409_CONFLICT, str(e))
    mensajes = {
        "confirmado": "¡Match confirmado! Su convivencia comienza hoy",
        "rechazado": "Rechazaste la propuesta",
    }
    return {
        "mensaje": mensajes.get(match["estado"], "Aceptaste la propuesta. Falta la otra respuesta"),
        "propuesta": (await vista([match], usuario["_id"]))[0],
    }


@router.post("/{match_id}/aceptar")
async def aceptar(match_id: str, usuario: dict = Depends(usuario_actual)):
    """CA-17.2: cuando ambos aceptan, el match queda confirmado."""
    return await contestar(match_id, usuario, acepta=True)


@router.post("/{match_id}/rechazar")
async def rechazar(match_id: str, datos: RechazoIn, usuario: dict = Depends(usuario_actual)):
    """CA-17.3: la propuesta queda rechazada y no se crea convivencia."""
    return await contestar(match_id, usuario, acepta=False, motivo=datos.motivo)


@router.post("/{match_id}/terminar")
async def terminar(match_id: str, datos: TerminoIn, usuario: dict = Depends(usuario_actual)):
    """Terminar una convivencia confirmada. Si fue por incompatibilidad, con sus razones (HU-19)."""
    match = await propuesta_de(match_id, usuario)
    if match["estado"] != "confirmado":
        raise HTTPException(status.HTTP_409_CONFLICT, "Esta convivencia no está activa")

    yo = usuario["_id"]
    ya_explico = any(e["evaluador_id"] == yo and e.get("razones") for e in match.get("evaluacion", []))
    razones = []
    if datos.motivo == "incompatibilidad" and not ya_explico:
        if errores := datos.errores():
            return datos_invalidos(errores)
        razones = datos.sin_repetir()
    con_otra = any(r["razon"] == "otra" for r in razones)

    try:
        match = await terminar_convivencia(
            match, usuario, datos.motivo, razones, datos.razon_otra_detalle if con_otra else None,
            datos.comentario, datos.seguir_buscando,
        )
    except NoSePuedeTerminar as e:
        raise HTTPException(status.HTTP_409_CONFLICT, str(e))
    return {
        "mensaje": "La convivencia terminó. Usaremos lo que nos contaste para tus próximas recomendaciones"
        if razones else "La convivencia terminó",
        "propuesta": (await vista([match], yo))[0],
    }
