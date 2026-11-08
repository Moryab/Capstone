"""Mensajes entre estudiantes (chat).

Una conversación por par de estudiantes, sin importar desde qué publicación o perfil se inició; cada
mensaje puede adjuntar la publicación de la que se habla. Solo escriben estudiantes verificados (el
administrador no chatea) y solo los dos participantes ven la conversación.

El frontend no usa WebSockets: la conversación abierta pide los mensajes nuevos cada pocos segundos
(?despues=<id del último>) y el menú consulta /no-leidas junto con los avisos.
"""
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.db import db
from app.deps import SIN_VERIFICAR, esta_verificado, usuario_actual
from app.routers.perfil import datos_invalidos
from app.schemas.conversaciones import ConversacionIn, MensajeIn

router = APIRouter(prefix="/api/conversaciones", tags=["Mensajes"])

NO_ENCONTRADA = HTTPException(status.HTTP_404_NOT_FOUND, "Conversación no encontrada")
NO_DISPONIBLE = "Esta persona ya no está disponible en RoomMatch"
POR_PAGINA = 50
# Freno contra el spam: mensajes por minuto de una misma cuenta
MAX_POR_MINUTO = 20


async def solo_estudiante(usuario: dict = Depends(usuario_actual)) -> dict:
    if usuario["rol"] == "administrador":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Los mensajes son entre estudiantes")
    if not esta_verificado(usuario):
        raise HTTPException(status.HTTP_403_FORBIDDEN, SIN_VERIFICAR)
    return usuario


def disponible(usuario: dict | None) -> bool:
    """Se le puede escribir: estudiante activo y verificado (igual que para ver su perfil)."""
    return bool(
        usuario
        and usuario["rol"] != "administrador"
        and usuario["estado_cuenta"] not in ("suspendida", "inhabilitada", "eliminada")
        and esta_verificado(usuario)
    )


def a_oid(valor: str, error: HTTPException) -> ObjectId:
    try:
        return ObjectId(valor)
    except (InvalidId, TypeError):
        raise error


def clave_par(a: ObjectId, b: ObjectId) -> str:
    """Identifica al par sin importar quién escribió primero."""
    return "_".join(sorted((str(a), str(b))))


def resumen_usuario(u: dict | None, oid: ObjectId) -> dict:
    """Lo que se muestra del otro participante. Si su cuenta ya no está disponible, solo el nombre."""
    if not u:
        return {"id": str(oid), "nombre": "Usuario", "ap_paterno": None, "foto_url": None,
                "verificado": False, "disponible": False}
    return {
        "id": str(u["_id"]),
        "nombre": u["nombre"],
        "ap_paterno": u.get("ap_paterno"),
        "foto_url": u.get("perfil", {}).get("foto_url") if disponible(u) else None,
        "verificado": esta_verificado(u),
        "disponible": disponible(u),
    }


def el_otro(conv: dict, yo: ObjectId) -> ObjectId:
    return next(p for p in conv["participantes"] if p != yo)


async def conversacion_propia(conversacion_id: str, usuario: dict) -> dict:
    """La conversación, solo si el usuario participa en ella (a los demás, como si no existiera)."""
    oid = a_oid(conversacion_id, NO_ENCONTRADA)
    conv = await db.conversaciones.find_one({"_id": oid, "participantes": usuario["_id"]})
    if not conv:
        raise NO_ENCONTRADA
    return conv


def conversacion_out(conv: dict, yo: ObjectId, otro: dict | None) -> dict:
    ultimo = conv.get("ultimo_mensaje")
    return {
        "id": str(conv["_id"]),
        "otro": resumen_usuario(otro, el_otro(conv, yo)),
        "ultimo_mensaje": {
            "texto": ultimo["texto"], "es_mio": ultimo["autor_id"] == yo, "fecha": ultimo["fecha"],
        } if ultimo else None,
        "no_leidos": conv.get("no_leidos", {}).get(str(yo), 0),
        "fecha_actividad": conv["fecha_actividad"],
    }


async def tarjetas_de(ids: set[ObjectId]) -> dict[ObjectId, dict]:
    """Tarjeta de cada publicación adjunta. Las que ya no están activas se marcan como no disponibles."""
    tarjetas = {}
    async for p in db.publicaciones.find(
        {"_id": {"$in": list(ids)}},
        {"titulo": 1, "costo_mensual": 1, "estado": 1, "fotos": 1, "ubicacion.comuna_nombre": 1},
    ):
        activa = p["estado"] == "activa"
        tarjetas[p["_id"]] = {
            "id": str(p["_id"]),
            "titulo": p["titulo"],
            "costo_mensual": p["costo_mensual"],
            "comuna": p["ubicacion"]["comuna_nombre"],
            "foto_url": next((f["url"] for f in p.get("fotos", []) if f["es_principal"]), None) if activa else None,
            "disponible": activa,
        }
    return tarjetas


async def mensajes_out(docs: list[dict], yo: ObjectId) -> list[dict]:
    tarjetas = await tarjetas_de({m["publicacion_id"] for m in docs if m.get("publicacion_id")})
    return [
        {
            "id": str(m["_id"]),
            "texto": m["texto"],
            "es_mio": m["autor_id"] == yo,
            "fecha_envio": m["fecha_envio"],
            "publicacion": tarjetas.get(m.get("publicacion_id")),
        }
        for m in docs
    ]


@router.get("")
async def mis_conversaciones(usuario: dict = Depends(solo_estudiante)):
    """Las conversaciones del estudiante, de la más reciente a la más antigua. Las que abrió otra
    persona sin escribir todavía no aparecen."""
    yo = usuario["_id"]
    convs = await db.conversaciones.find({
        "participantes": yo,
        "$or": [{"ultimo_mensaje": {"$ne": None}}, {"creada_por": yo}],
    }).sort("fecha_actividad", -1).to_list()
    otros = {
        u["_id"]: u
        async for u in db.usuarios.find(
            {"_id": {"$in": [el_otro(c, yo) for c in convs]}},
            {"nombre": 1, "ap_paterno": 1, "perfil.foto_url": 1, "rol": 1, "estado_cuenta": 1, "verificacion": 1},
        )
    }
    return [conversacion_out(c, yo, otros.get(el_otro(c, yo))) for c in convs]


@router.get("/no-leidas")
async def no_leidas(usuario: dict = Depends(usuario_actual)):
    """Total de mensajes sin leer, para el contador del menú. Sin acceso al chat, siempre 0."""
    if usuario["rol"] == "administrador" or not esta_verificado(usuario):
        return {"no_leidas": 0}
    campo = f"$no_leidos.{usuario['_id']}"
    filas = await (await db.conversaciones.aggregate([
        {"$match": {"participantes": usuario["_id"]}},
        {"$group": {"_id": None, "total": {"$sum": {"$ifNull": [campo, 0]}}}},
    ])).to_list()
    return {"no_leidas": filas[0]["total"] if filas else 0}


@router.post("")
async def abrir_conversacion(datos: ConversacionIn, usuario: dict = Depends(solo_estudiante)):
    """Abre la conversación con otro estudiante o devuelve la que ya tienen."""
    otro_id = a_oid(datos.usuario_id, HTTPException(status.HTTP_404_NOT_FOUND, NO_DISPONIBLE))
    if otro_id == usuario["_id"]:
        return datos_invalidos({"usuario_id": "No puedes enviarte mensajes a ti mismo"})
    otro = await db.usuarios.find_one({"_id": otro_id})
    if not disponible(otro):
        raise HTTPException(status.HTTP_404_NOT_FOUND, NO_DISPONIBLE)

    ahora = datetime.now(timezone.utc)
    clave = clave_par(usuario["_id"], otro_id)
    try:
        conv = await db.conversaciones.find_one_and_update(
            {"clave": clave},
            {"$setOnInsert": {
                "clave": clave,
                "participantes": [usuario["_id"], otro_id],
                "creada_por": usuario["_id"],
                "fecha_creacion": ahora,
                "fecha_actividad": ahora,
                "ultimo_mensaje": None,
                "no_leidos": {},
            }},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
    except DuplicateKeyError:  # los dos la abrieron a la vez: se usa la que quedó
        conv = await db.conversaciones.find_one({"clave": clave})
    return conversacion_out(conv, usuario["_id"], otro)


@router.get("/{conversacion_id}/mensajes")
async def ver_mensajes(
    conversacion_id: str,
    usuario: dict = Depends(solo_estudiante),
    despues: str | None = Query(default=None, description="Solo los mensajes posteriores a este id"),
    antes: str | None = Query(default=None, description="Los anteriores a este id (mensajes más antiguos)"),
):
    """Mensajes de la conversación, del más antiguo al más nuevo. Sin parámetros, los últimos 50.
    Ver la conversación la marca como leída."""
    conv = await conversacion_propia(conversacion_id, usuario)
    yo = usuario["_id"]
    filtro: dict = {"conversacion_id": conv["_id"]}
    error = datos_invalidos({"mensajes": "Referencia de mensaje inválida"})
    if despues:
        try:
            filtro["_id"] = {"$gt": ObjectId(despues)}
        except InvalidId:
            return error
        docs = await db.mensajes.find(filtro).sort("_id", 1).limit(POR_PAGINA * 4).to_list()
        hay_anteriores = None  # no aplica al pedir solo los nuevos
    else:
        if antes:
            try:
                filtro["_id"] = {"$lt": ObjectId(antes)}
            except InvalidId:
                return error
        docs = await db.mensajes.find(filtro).sort("_id", -1).limit(POR_PAGINA + 1).to_list()
        hay_anteriores = len(docs) > POR_PAGINA
        docs = list(reversed(docs[:POR_PAGINA]))

    if conv.get("no_leidos", {}).get(str(yo)):
        await db.conversaciones.update_one({"_id": conv["_id"]}, {"$set": {f"no_leidos.{yo}": 0}})
    otro = await db.usuarios.find_one({"_id": el_otro(conv, yo)})
    return {
        "conversacion": {**conversacion_out(conv, yo, otro), "no_leidos": 0},
        "mensajes": await mensajes_out(docs, yo),
        "hay_anteriores": hay_anteriores,
    }


@router.post("/{conversacion_id}/mensajes", status_code=status.HTTP_201_CREATED)
async def enviar_mensaje(conversacion_id: str, datos: MensajeIn, usuario: dict = Depends(solo_estudiante)):
    conv = await conversacion_propia(conversacion_id, usuario)
    yo = usuario["_id"]
    otro_id = el_otro(conv, yo)
    if not disponible(await db.usuarios.find_one({"_id": otro_id})):
        raise HTTPException(status.HTTP_409_CONFLICT, NO_DISPONIBLE)

    ahora = datetime.now(timezone.utc)
    recientes = await db.mensajes.count_documents({"autor_id": yo, "fecha_envio": {"$gte": ahora - timedelta(minutes=1)}})
    if recientes >= MAX_POR_MINUTO:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Estás enviando muchos mensajes. Espera un momento")

    publicacion_id = None
    if datos.publicacion_id:
        invalida = datos_invalidos({"publicacion_id": "Solo puedes adjuntar una publicación activa de alguno de los dos"})
        try:
            publicacion_id = ObjectId(datos.publicacion_id)
        except InvalidId:
            return invalida
        # Una publicación de alguno de los dos participantes, visible para el otro
        if not await db.publicaciones.find_one(
            {"_id": publicacion_id, "estado": "activa", "oferente_id": {"$in": conv["participantes"]}}, {"_id": 1}
        ):
            return invalida

    doc = {
        "conversacion_id": conv["_id"],
        "autor_id": yo,
        "texto": datos.texto,
        "publicacion_id": publicacion_id,
        "fecha_envio": ahora,
    }
    doc["_id"] = (await db.mensajes.insert_one(doc)).inserted_id
    await db.conversaciones.update_one({"_id": conv["_id"]}, {
        "$set": {"ultimo_mensaje": {"texto": datos.texto, "autor_id": yo, "fecha": ahora},
                 "fecha_actividad": ahora, f"no_leidos.{yo}": 0},
        "$inc": {f"no_leidos.{otro_id}": 1},
    })
    return (await mensajes_out([doc], yo))[0]
