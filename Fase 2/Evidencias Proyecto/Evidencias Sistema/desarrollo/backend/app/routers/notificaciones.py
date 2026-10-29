from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, status

from app.db import db
from app.deps import usuario_actual

router = APIRouter(prefix="/api/notificaciones", tags=["Notificaciones"])

RECIENTES = 30  # avisos que se muestran en la campana


def aviso_out(n: dict) -> dict:
    ref = n.get("referencia") or {}
    return {
        "id": str(n["_id"]),
        "tipo": n["tipo"],
        "titulo": n["titulo"],
        "mensaje": n["mensaje"],
        "leido": n["leido"],
        "fecha": n["fecha_notificacion"],
        "referencia": {
            "tipo": ref.get("tipo_entidad"),
            "id": str(ref["entidad_id"]) if ref.get("entidad_id") else None,
        },
    }


@router.get("")
async def mis_notificaciones(usuario: dict = Depends(usuario_actual)):
    """Los avisos más recientes del usuario y cuántos no ha leído (la campana de la barra)."""
    mias = {"usuario_id": usuario["_id"]}
    avisos = db.notificaciones.find(mias).sort("fecha_notificacion", -1).limit(RECIENTES)
    return {
        "no_leidas": await db.notificaciones.count_documents({**mias, "leido": False}),
        "avisos": [aviso_out(n) async for n in avisos],
    }


@router.get("/resumen")
async def resumen(usuario: dict = Depends(usuario_actual)):
    """Solo la cantidad sin leer: la barra la consulta cada cierto tiempo."""
    return {"no_leidas": await db.notificaciones.count_documents({"usuario_id": usuario["_id"], "leido": False})}


@router.put("/leidas")
async def marcar_todas(usuario: dict = Depends(usuario_actual)):
    await db.notificaciones.update_many(
        {"usuario_id": usuario["_id"], "leido": False},
        {"$set": {"leido": True, "fecha_lectura": datetime.now(timezone.utc)}},
    )
    return {"mensaje": "Avisos marcados como leídos"}


@router.put("/{aviso_id}/leida")
async def marcar_una(aviso_id: str, usuario: dict = Depends(usuario_actual)):
    try:
        oid = ObjectId(aviso_id)
    except InvalidId:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Aviso no encontrado")
    hecho = await db.notificaciones.update_one(
        {"_id": oid, "usuario_id": usuario["_id"]},
        {"$set": {"leido": True, "fecha_lectura": datetime.now(timezone.utc)}},
    )
    if not hecho.matched_count:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Aviso no encontrado")
    return {"mensaje": "Aviso marcado como leído"}
