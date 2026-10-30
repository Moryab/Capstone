"""EP-08 · HU-18 y HU-19: evaluación de la convivencia al mes y razones cuando no funcionó.

Archivo de esta área: solo lo edita quien tiene estas historias. Las rutas de administración usan
Depends(solo_admin) (app/deps.py) y los avisos al usuario se envían con app.notificaciones.notificar.
"""

from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from pymongo import ReturnDocument

from app.db import db
from app.deps import usuario_actual
from app.routers.compatibilidades import el_otro, resumenes
from app.routers.perfil import datos_invalidos
from app.schemas.seguimiento import RazonesIn
from app.seguimiento import MOMENTO, aprender_de_razones, avisar_evaluaciones, evaluacion_de

router = APIRouter(prefix="/api/evaluaciones", tags=["Seguimiento post-match"])

NO_ENCONTRADA = HTTPException(status.HTTP_404_NOT_FOUND, "No encontramos esa convivencia")


class EvaluacionIn(BaseModel):
    """CA-18.3: si funciona (sí o no), una nota de 1 a 5 y un comentario opcional."""

    funciona: bool
    calificacion: int = Field(ge=1, le=5)
    comentario: str | None = Field(default=None, max_length=300)

    @field_validator("comentario")
    @classmethod
    def comentario_opcional(cls, v):
        return (v or "").strip() or None


async def convivencia_de(match_id: str, usuario: dict) -> dict:
    """El match confirmado en que participa el usuario; si no, 404 (no se revela si existe)."""
    try:
        oid = ObjectId(match_id)
    except InvalidId:
        raise NO_ENCONTRADA
    match = await db.matches.find_one({
        "_id": oid,
        "estado": {"$in": ["confirmado", "finalizado"]},
        "$or": [{"usuario_a_id": usuario["_id"]}, {"usuario_b_id": usuario["_id"]}],
    })
    if not match:
        raise NO_ENCONTRADA
    return match


def evaluacion_out(e: dict | None) -> dict | None:
    if not e:
        return None
    return {
        "funciona": e["funciona"],
        "calificacion": e["calificacion"],
        "comentario": e["comentario"],
        "fecha": e["fecha_eval"],
        "razones": e.get("razones", []),
        "razon_otra_detalle": e.get("razon_otra_detalle"),
    }


def estado_evaluacion(match: dict, usuario_id: ObjectId) -> dict:
    """Si el usuario ya puede evaluar esa convivencia y si ya lo hizo. Lo usan también las propuestas."""
    habilitacion = match["fecha_habilitacion_evaluacion"]
    return {
        "habilitada": habilitacion is not None and habilitacion <= datetime.now(timezone.utc),
        "fecha_habilitacion": habilitacion,
        "evaluada": evaluacion_de(match, usuario_id) is not None,
    }


@router.get("/{match_id}")
async def ver_evaluacion(match_id: str, usuario: dict = Depends(usuario_actual)):
    """Datos para la pantalla de evaluación: con quién y dónde, si ya se puede y si ya se hizo."""
    await avisar_evaluaciones()
    match = await convivencia_de(match_id, usuario)
    yo = usuario["_id"]
    otro = await db.usuarios.find_one({"_id": el_otro(match, yo)})
    pub = await db.publicaciones.find_one({"_id": match["publicacion_id"]}, {"titulo": 1, "ubicacion.comuna_nombre": 1})
    mia = evaluacion_de(match, yo)
    return {
        "id": str(match["_id"]),
        "rol": "buscador" if match["usuario_a_id"] == yo else "oferente",
        "otro": (await resumenes([otro]))[otro["_id"]] if otro else None,
        "publicacion": {
            "id": str(match["publicacion_id"]),
            "titulo": (pub or {}).get("titulo", "Alojamiento no disponible"),
            "comuna": (pub or {}).get("ubicacion", {}).get("comuna_nombre"),
        },
        "estado": match["estado"],
        "fecha_inicio": match["fecha_inicio_convivencia"],
        "fecha_fin": match.get("fecha_fin_convivencia"),
        "motivo_fin": match.get("motivo_fin"),
        # Si ya explicó qué no funcionó (al mes o al terminar), no se le vuelve a preguntar
        "razones_indicadas": any(e["evaluador_id"] == yo and e.get("razones") for e in match.get("evaluacion", [])),
        **estado_evaluacion(match, yo),
        "mi_evaluacion": evaluacion_out(mia),
        # CA-18.5: si no funciona, se piden las razones (HU-19)
        "pedir_razones": bool(mia and not mia["funciona"] and not mia.get("razones")),
    }


@router.post("/{match_id}")
async def evaluar(match_id: str, datos: EvaluacionIn, usuario: dict = Depends(usuario_actual)):
    """CA-18.2 a CA-18.6: una sola evaluación por estudiante y convivencia, desde el mes."""
    match = await convivencia_de(match_id, usuario)
    yo = usuario["_id"]
    ahora = datetime.now(timezone.utc)

    if not estado_evaluacion(match, yo)["habilitada"]:
        fecha = match["fecha_habilitacion_evaluacion"].astimezone().strftime("%d-%m-%Y")
        raise HTTPException(status.HTTP_409_CONFLICT, f"Podrás evaluar esta convivencia desde el {fecha}")

    evaluacion = {
        "evaluador_id": yo,
        "evaluado_id": el_otro(match, yo),
        "momento": MOMENTO,
        "funciona": datos.funciona,
        "calificacion": datos.calificacion,
        "comentario": datos.comentario,
        "razones": [],  # HU-19
        "razon_otra_detalle": None,
        "fecha_eval": ahora,
    }
    # Solo si aún no evaluó: así dos envíos seguidos no crean dos evaluaciones (CA-18.6)
    match = await db.matches.find_one_and_update(
        {"_id": match["_id"], "evaluacion": {"$not": {"$elemMatch": {"evaluador_id": yo, "momento": MOMENTO}}}},
        {"$push": {"evaluacion": evaluacion}},
        return_document=ReturnDocument.AFTER,
    )
    if not match:
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya evaluaste esta convivencia")

    # CA-18.4: basta que uno diga que no funciona para que el match quede «no exitoso»
    resultado = "exitoso" if all(e["funciona"] for e in match["evaluacion"]) else "no_exitoso"
    seguimiento = {"$set": {"seguimiento.$[s].evaluado": True}}
    if any(s["usuario_id"] == yo and s["momento"] == MOMENTO for s in match.get("seguimiento", [])):
        await db.matches.update_one({"_id": match["_id"]}, seguimiento,
                                    array_filters=[{"s.usuario_id": yo, "s.momento": MOMENTO}])
    else:
        # Evaluó antes de que llegara el aviso: se deja registro para no enviárselo después
        await db.matches.update_one({"_id": match["_id"]}, {"$push": {"seguimiento": {
            "usuario_id": yo, "momento": MOMENTO, "fecha_aviso": None, "fecha_recordatorio": None, "evaluado": True,
        }}})
    await db.matches.update_one({"_id": match["_id"]}, {"$set": {"resultado": resultado}})

    return {
        "mensaje": "¡Gracias por tu evaluación!",
        "evaluacion": evaluacion_out(evaluacion),
        "pedir_razones": not datos.funciona,
    }


@router.post("/{match_id}/razones")
async def indicar_razones(match_id: str, datos: RazonesIn, usuario: dict = Depends(usuario_actual)):
    """HU-19: razones de la incompatibilidad cuando la convivencia no funcionó.

    CA-19.2: al menos una razón, y «otra» con su detalle. CA-19.5: solo si evaluó que no funciona.
    """
    match = await convivencia_de(match_id, usuario)
    yo = usuario["_id"]
    mia = evaluacion_de(match, yo)
    if not mia:
        raise HTTPException(status.HTTP_409_CONFLICT, "Primero evalúa la convivencia")
    if mia["funciona"]:
        raise HTTPException(status.HTTP_409_CONFLICT, "Tu convivencia está funcionando: no hace falta indicar razones")

    if errores := datos.errores():
        return datos_invalidos(errores)
    razones = datos.sin_repetir()
    con_otra = any(r["razon"] == "otra" for r in razones)

    # Solo si aún no las indicó: las razones se registran una vez por convivencia
    hecho = await db.matches.update_one(
        {"_id": match["_id"], "evaluacion": {"$elemMatch": {
            "evaluador_id": yo, "momento": MOMENTO, "funciona": False, "razones": {"$size": 0},
        }}},
        {"$set": {
            "evaluacion.$[e].razones": razones,
            "evaluacion.$[e].razon_otra_detalle": datos.razon_otra_detalle if con_otra else None,
        }},
        array_filters=[{"e.evaluador_id": yo, "e.momento": MOMENTO}],
    )
    if not hecho.modified_count:
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya indicaste las razones de esta convivencia")

    # CA-19.4: el aprendizaje cambia sus próximas compatibilidades y propuestas
    await aprender_de_razones(usuario, razones)

    return {
        "mensaje": "Gracias. Usaremos estas razones para mejorar tus próximas recomendaciones",  # CA-19.3
        "razones": razones,
    }
