"""EP-06 y EP-07 · HU-27 y HU-30: acciones del administrador sobre perfiles y publicaciones.

Archivo de esta área: solo lo edita quien tiene estas historias. Las rutas de administración usan
Depends(solo_admin) (app/deps.py) y los avisos al usuario se envían con app.notificaciones.notificar.
"""

from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from app.db import db, siguiente_codigo
from app.deps import solo_admin
from app.notificaciones import notificar
from app.routers.reportes import buscar_reporte
from app.routers.verificacion import nombre_completo, quitar_verificacion
from app.schemas.moderacion import (
    ACCIONES_PERFIL, ACCIONES_PUBLICACION, MOTIVOS_INCUMPLIMIENTO, AccionHistorialOut, AccionPublicacionIn,
    AccionReporteIn, JustificacionIn, PublicacionAdminOut, ReporteHistorialOut,
)
from app.schemas.publicaciones import PublicacionOut

router = APIRouter(prefix="/api/moderacion", tags=["Moderación"])

# Acción elegida -> (valor en acciones_moderacion.accion, valor en reportes.resolucion)
ACCIONES = {
    "desestimar": ("desestimar_reporte", "sin_accion"),
    "advertir": ("advertir_usuario", "advertencia"),
    "suspender": ("suspender_usuario", "cuenta_suspendida"),
    "quitar_verificacion": ("revocar_verificacion", "verificacion_revocada"),
    "ocultar": ("suspender_publicacion", "publicacion_suspendida"),
    "eliminar": ("eliminar_publicacion", "publicacion_eliminada"),
}

# Lo que se le avisa a la persona afectada (CA-27.6). Desestimar no la afecta: no se le avisa nada
AVISOS = {
    "advertir": ("Recibiste una advertencia", "RoomMatch te envió una advertencia"),
    "suspender": ("Tu cuenta fue suspendida", "Tu cuenta fue suspendida"),
    "ocultar": ("Tu publicación fue ocultada", "Ocultamos tu publicación «{titulo}»"),
    "eliminar": ("Tu publicación fue eliminada", "Eliminamos tu publicación «{titulo}»"),
}


async def registrar_accion(
    accion_id: ObjectId, accion: str, admin: dict, objetivo: tuple[str, ObjectId], justificacion: str,
    estados: tuple[str | None, str | None], reportes_ids: list[ObjectId], ahora: datetime,
    afectado_notificado: bool, revierte: ObjectId | None = None, motivo: str | None = None,
) -> None:
    """CA-27.4: queda registrado qué administrador la aplicó, cuándo, cuál fue y por qué."""
    await db.acciones_moderacion.insert_one({
        "_id": accion_id,
        "codigo": await siguiente_codigo("acciones_moderacion"),
        "admin_id": admin["_id"],
        "objetivo_tipo": objetivo[0],
        "objetivo_id": objetivo[1],
        "accion": accion,
        "motivo": motivo,  # tipificado solo en la HU-30; en un reporte basta la justificación
        "justificacion": justificacion,
        "reportes_ids": reportes_ids,
        "estado_anterior": estados[0],
        "estado_nuevo": estados[1],
        "revierte_accion_id": revierte,
        "afectado_notificado": afectado_notificado,
        "fecha_accion": ahora,
    })


async def validar_sobre_perfil(accion: str, reporte: dict) -> dict | None:
    """La persona reportada; se rechaza lo que no se puede aplicar antes de cerrar el reporte."""
    usuario = await db.usuarios.find_one({"_id": reporte["elemento_reportado_id"]})
    if accion == "desestimar":
        return usuario
    if not usuario:
        raise HTTPException(status.HTTP_409_CONFLICT, "La cuenta reportada ya no existe")
    if usuario["rol"] == "administrador":
        raise HTTPException(status.HTTP_409_CONFLICT, "Esta acción no se aplica a un administrador")
    if accion == "suspender" and usuario["estado_cuenta"] != "activa":
        raise HTTPException(status.HTTP_409_CONFLICT, "Esta cuenta ya no está activa")
    if accion == "quitar_verificacion" and usuario.get("verificacion", {}).get("estado") != "verificado":
        raise HTTPException(status.HTTP_409_CONFLICT, "Este perfil no tiene una verificación vigente")
    return usuario


async def validar_sobre_publicacion(accion: str, publicacion_id: ObjectId) -> dict | None:
    publicacion = await db.publicaciones.find_one({"_id": publicacion_id})
    if accion == "desestimar":
        return publicacion
    if not publicacion or publicacion["estado"] == "eliminada":
        raise HTTPException(status.HTTP_409_CONFLICT, "Esta publicación ya fue eliminada")
    if accion == "ocultar" and publicacion["estado"] == "suspendida":
        raise HTTPException(status.HTTP_409_CONFLICT, "Esta publicación ya está oculta")
    return publicacion


async def suspender_cuenta(usuario: dict, admin: dict, justificacion: str, accion_id: ObjectId, ahora: datetime):
    """CA-27.5. Sus publicaciones visibles se ocultan marcadas con esta acción, para devolver
    solo esas al reactivar la cuenta. El cambio de token_version cierra su sesión."""
    await db.usuarios.update_one(
        {"_id": usuario["_id"]},
        {
            "$set": {
                "estado_cuenta": "suspendida",
                "suspension": {
                    "motivo": justificacion, "fecha": ahora, "admin_id": admin["_id"], "accion_id": accion_id,
                },
                "fecha_actualizacion": ahora,
            },
            "$inc": {"seguridad.token_version": 1},
        },
    )
    await db.publicaciones.update_many(
        {"oferente_id": usuario["_id"], "estado": "activa"},
        {"$set": {
            "estado": "suspendida",
            "moderacion": {"ultima_accion_id": accion_id, "motivo": "Cuenta suspendida", "fecha": ahora},
        }},
    )


async def aplicar_sobre_perfil(
    accion: str, usuario: dict, admin: dict, justificacion: str, accion_id: ObjectId, ahora: datetime,
) -> tuple[str, str]:
    """Aplica la acción y devuelve el estado anterior y el nuevo."""
    if accion == "suspender":
        await suspender_cuenta(usuario, admin, justificacion, accion_id, ahora)
        return usuario["estado_cuenta"], "suspendida"
    if accion == "quitar_verificacion":
        # También le avisa a la persona afectada
        await quitar_verificacion(usuario["_id"], admin, justificacion)
        return "verificado", "revocado"
    await db.usuarios.update_one(
        {"_id": usuario["_id"]}, {"$inc": {"advertencias_recibidas": 1}, "$set": {"fecha_actualizacion": ahora}}
    )
    return usuario["estado_cuenta"], usuario["estado_cuenta"]


async def aplicar_sobre_publicacion(
    accion: str, publicacion: dict, justificacion: str, accion_id: ObjectId, ahora: datetime,
) -> tuple[str, str]:
    moderacion = {"ultima_accion_id": accion_id, "motivo": justificacion, "fecha": ahora}
    cambios = {"estado": "suspendida", "moderacion": moderacion}
    if accion == "eliminar":  # eliminación lógica, igual que cuando la elimina el oferente
        cambios = {"estado": "eliminada", "moderacion": moderacion, "eliminada_por": "administrador",
                   "fecha_eliminacion": ahora}
    await db.publicaciones.update_one({"_id": publicacion["_id"]}, {"$set": cambios})
    return publicacion["estado"], cambios["estado"]


def cierre_de_reporte(resolucion: str, admin: dict, accion_id: ObjectId, ahora: datetime) -> dict:
    return {
        "estado": "resuelto", "resolucion": resolucion, "fecha_resolucion": ahora, "admin_revisor_id": admin["_id"],
        "accion_moderacion_id": accion_id, "reportante_notificado": True,
    }


async def cerrar_abiertos(tipo_elemento: str, elemento_id: ObjectId, cierre: dict) -> list[dict]:
    """Los reportes abiertos sobre un elemento quedan vinculados a la acción y resueltos (CA-30.6)."""
    abiertos = await db.reportes.find({
        "tipo_elemento": tipo_elemento,
        "elemento_reportado_id": elemento_id,
        "estado": {"$in": ["pendiente", "en_revision"]},
    }, {"reportante_id": 1}).to_list()
    await db.reportes.update_many({"_id": {"$in": [r["_id"] for r in abiertos]}}, {"$set": cierre})
    return abiertos


async def avisar_reportantes(reportes: list[dict]) -> None:
    """Quien reportó solo sabe que se revisó su reporte, no qué se decidió (CA-27.6)."""
    for r in reportes:
        await notificar(r["reportante_id"], "reporte_resuelto", "Revisamos tu reporte",
                        "Un administrador revisó tu reporte. Gracias por ayudar a cuidar la comunidad.")


@router.post("/reportes/{reporte_id}/accion")
async def accion_sobre_reporte(reporte_id: str, datos: AccionReporteIn, admin: dict = Depends(solo_admin)):
    """HU-27: desestimar el reporte o actuar sobre lo reportado, siempre con una justificación."""
    reporte = await buscar_reporte(reporte_id)
    if reporte["estado"] == "pendiente":
        raise HTTPException(status.HTTP_409_CONFLICT, "Toma el reporte para revisión antes de aplicar una acción")
    if reporte["estado"] != "en_revision":
        raise HTTPException(status.HTTP_409_CONFLICT, "Este reporte ya fue resuelto")

    es_perfil = reporte["tipo_elemento"] == "usuario"
    if datos.accion not in (ACCIONES_PERFIL if es_perfil else ACCIONES_PUBLICACION):  # CA-27.1 y CA-27.2
        return JSONResponse(status_code=422, content={
            "detail": "Datos inválidos", "errores": {"accion": "Esta acción no se aplica a este tipo de reporte"},
        })
    elemento_id = reporte["elemento_reportado_id"]
    if es_perfil:
        objetivo = await validar_sobre_perfil(datos.accion, reporte)
    else:
        objetivo = await validar_sobre_publicacion(datos.accion, elemento_id)

    accion, resolucion = ACCIONES[datos.accion]
    accion_id, ahora = ObjectId(), datetime.now(timezone.utc)
    cierre = cierre_de_reporte(resolucion, admin, accion_id, ahora)
    # Solo si sigue en revisión: así un reporte no se resuelve dos veces
    cerrado = await db.reportes.update_one({"_id": reporte["_id"], "estado": "en_revision"}, {"$set": cierre})
    if not cerrado.modified_count:
        raise HTTPException(status.HTTP_409_CONFLICT, "Este reporte ya fue resuelto")

    # Una acción real también resuelve los demás reportes abiertos sobre lo mismo; desestimar no,
    # porque cada reporte puede traer antecedentes distintos
    otros = []
    if datos.accion != "desestimar":
        otros = await cerrar_abiertos(reporte["tipo_elemento"], elemento_id, cierre)
    cerrados = [reporte, *otros]

    afectado_id = reporte["usuario_reportado"]
    if datos.accion == "desestimar":
        estados = (reporte["estado"], "resuelto")
    elif es_perfil:
        estados = await aplicar_sobre_perfil(datos.accion, objetivo, admin, datos.justificacion, accion_id, ahora)
    else:
        estados = await aplicar_sobre_publicacion(datos.accion, objetivo, datos.justificacion, accion_id, ahora)

    if not es_perfil:
        await db.publicaciones.update_one(
            {"_id": elemento_id}, {"$inc": {"cantidad_reportes_pendiente": -len(cerrados)}}
        )

    await registrar_accion(
        accion_id, accion, admin, (reporte["tipo_elemento"], elemento_id), datos.justificacion,
        estados, [r["_id"] for r in cerrados], ahora, afectado_notificado=datos.accion != "desestimar",
    )

    # CA-27.6: quien fue afectado recibe el motivo; quien reportó, solo que se revisó su reporte
    if datos.accion in AVISOS:
        titulo, texto = AVISOS[datos.accion]
        texto = texto.format(titulo=objetivo.get("titulo", ""))
        motivo = datos.justificacion.rstrip(".")
        await notificar(afectado_id, "accion_moderacion", titulo, f"{texto}. Motivo: {motivo}.",
                        (reporte["tipo_elemento"], elemento_id))
    await avisar_reportantes(cerrados)
    return {"mensaje": "Acción aplicada. El reporte quedó resuelto"}


@router.post("/usuarios/{usuario_id}/reactivar")
async def reactivar_cuenta(usuario_id: str, datos: JustificacionIn, admin: dict = Depends(solo_admin)):
    """CA-27.5: la cuenta vuelve a la normalidad, con las publicaciones que ocultó la suspensión."""
    try:
        oid = ObjectId(usuario_id)
    except InvalidId:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    ahora = datetime.now(timezone.utc)
    usuario = await db.usuarios.find_one_and_update(
        {"_id": oid, "estado_cuenta": "suspendida"},
        {"$set": {"estado_cuenta": "activa", "suspension": None, "fecha_actualizacion": ahora}},
    )
    if not usuario:
        raise HTTPException(status.HTTP_409_CONFLICT, "Esta cuenta no está suspendida")

    suspension_id = (usuario.get("suspension") or {}).get("accion_id")
    if suspension_id:
        await db.publicaciones.update_many(
            {"oferente_id": oid, "estado": "suspendida", "moderacion.ultima_accion_id": suspension_id},
            {"$set": {"estado": "activa", "moderacion": None}},
        )
    await registrar_accion(
        ObjectId(), "reactivar_usuario", admin, ("usuario", oid), datos.justificacion, ("suspendida", "activa"),
        [], ahora, afectado_notificado=True, revierte=suspension_id,
    )
    await notificar(oid, "accion_moderacion", "Tu cuenta fue reactivada",
                    "Ya puedes volver a iniciar sesión y tus publicaciones están visibles nuevamente.",
                    ("usuario", oid))
    return {"mensaje": "Cuenta reactivada"}


# ---------- HU-30: gestión directa de publicaciones, tengan reportes o no ----------


def id_publicacion(publicacion_id: str) -> ObjectId:
    try:
        return ObjectId(publicacion_id)
    except InvalidId:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Publicación no encontrada")


async def oculta_por_cuenta(publicacion: dict) -> bool:
    """Si la ocultó la suspensión de la cuenta, vuelve al reactivarla, no con «Restaurar»."""
    accion_id = (publicacion.get("moderacion") or {}).get("ultima_accion_id")
    if publicacion["estado"] != "suspendida" or not accion_id:
        return False
    accion = await db.acciones_moderacion.find_one({"_id": accion_id}, {"accion": 1})
    return bool(accion) and accion["accion"] == "suspender_usuario"


@router.get("/publicaciones/{publicacion_id}", response_model=PublicacionAdminOut)
async def ver_publicacion(publicacion_id: str, _admin: dict = Depends(solo_admin)):
    """La publicación en cualquier estado, con sus reportes y sus acciones de moderación."""
    oid = id_publicacion(publicacion_id)
    publicacion = await db.publicaciones.find_one({"_id": oid})
    if not publicacion:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Publicación no encontrada")

    oferente = await db.usuarios.find_one({"_id": publicacion["oferente_id"]})
    acciones = await db.acciones_moderacion.find(
        {"objetivo_tipo": "publicacion", "objetivo_id": oid}
    ).sort("fecha_accion", -1).to_list()
    admins = {
        u["_id"]: nombre_completo(u)
        async for u in db.usuarios.find(
            {"_id": {"$in": [a["admin_id"] for a in acciones]}}, {"nombre": 1, "ap_paterno": 1, "ap_materno": 1}
        )
    }
    return PublicacionAdminOut(
        publicacion=PublicacionOut.desde_doc(publicacion, es_propia=False, oferente=oferente),
        cantidad_reportes=publicacion.get("cantidad_reportes", 0),
        eliminada_por=publicacion.get("eliminada_por"),
        oculta_por_cuenta=await oculta_por_cuenta(publicacion),
        reportes=[
            ReporteHistorialOut(id=str(r["_id"]), codigo=r["codigo"], motivo=r["motivo"], estado=r["estado"],
                                fecha_reporte=r["fecha_reporte"])
            async for r in db.reportes.find(
                {"tipo_elemento": "publicacion", "elemento_reportado_id": oid}
            ).sort("fecha_reporte", -1)
        ],
        acciones=[
            AccionHistorialOut(
                accion=a["accion"], motivo=a.get("motivo"), justificacion=a["justificacion"],
                estado_anterior=a.get("estado_anterior"), estado_nuevo=a.get("estado_nuevo"),
                admin=admins.get(a["admin_id"]), fecha_accion=a["fecha_accion"],
            )
            for a in acciones
        ],
    )


@router.post("/publicaciones/{publicacion_id}/accion")
async def accion_sobre_publicacion(
    publicacion_id: str, datos: AccionPublicacionIn, admin: dict = Depends(solo_admin)
):
    """CA-30.1 a CA-30.4: ocultar o eliminar con un motivo y un comentario."""
    oid = id_publicacion(publicacion_id)
    publicacion = await validar_sobre_publicacion(datos.accion, oid)
    accion, resolucion = ACCIONES[datos.accion]
    accion_id, ahora = ObjectId(), datetime.now(timezone.utc)

    # CA-30.6: si tenía reportes abiertos, quedan vinculados a esta acción y resueltos
    cerrados = await cerrar_abiertos("publicacion", oid, cierre_de_reporte(resolucion, admin, accion_id, ahora))
    estados = await aplicar_sobre_publicacion(datos.accion, publicacion, datos.justificacion, accion_id, ahora)
    if cerrados:
        await db.publicaciones.update_one({"_id": oid}, {"$inc": {"cantidad_reportes_pendiente": -len(cerrados)}})
    await registrar_accion(
        accion_id, accion, admin, ("publicacion", oid), datos.justificacion, estados, [r["_id"] for r in cerrados],
        ahora, afectado_notificado=True, motivo=datos.motivo,
    )

    titulo, texto = AVISOS[datos.accion]
    comentario = datos.justificacion.rstrip(".")
    await notificar(
        publicacion["oferente_id"], "accion_moderacion", titulo,
        f"{texto.format(titulo=publicacion['titulo'])}. "
        f"Motivo: {MOTIVOS_INCUMPLIMIENTO[datos.motivo]}. {comentario}.",
        ("publicacion", oid),
    )
    await avisar_reportantes(cerrados)
    return {"mensaje": "Publicación ocultada" if datos.accion == "ocultar" else "Publicación eliminada"}


@router.post("/publicaciones/{publicacion_id}/restaurar")
async def restaurar_publicacion(publicacion_id: str, datos: JustificacionIn, admin: dict = Depends(solo_admin)):
    """CA-30.5: la publicación ocultada vuelve a estar visible y la restauración queda registrada."""
    oid = id_publicacion(publicacion_id)
    publicacion = await db.publicaciones.find_one({"_id": oid})
    if not publicacion:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Publicación no encontrada")
    if publicacion["estado"] != "suspendida":
        raise HTTPException(status.HTTP_409_CONFLICT, "Solo se puede restaurar una publicación oculta")
    if await oculta_por_cuenta(publicacion):
        raise HTTPException(status.HTTP_409_CONFLICT, "Se ocultó por la suspensión de la cuenta: reactiva la cuenta")

    # Sin cupos no vuelve como activa: se habría ocultado estando completa
    estado = "activa" if publicacion["cupos_disponibles"] > 0 else "completa"
    ahora = datetime.now(timezone.utc)
    restaurada = await db.publicaciones.update_one(
        {"_id": oid, "estado": "suspendida"}, {"$set": {"estado": estado, "moderacion": None}}
    )
    if not restaurada.modified_count:
        raise HTTPException(status.HTTP_409_CONFLICT, "Solo se puede restaurar una publicación oculta")

    await registrar_accion(
        ObjectId(), "reactivar_publicacion", admin, ("publicacion", oid), datos.justificacion, ("suspendida", estado),
        [], ahora, afectado_notificado=True,
        revierte=(publicacion.get("moderacion") or {}).get("ultima_accion_id"),
    )
    await notificar(publicacion["oferente_id"], "accion_moderacion", "Tu publicación fue restaurada",
                    f"Tu publicación «{publicacion['titulo']}» volvió a estar visible.", ("publicacion", oid))
    return {"mensaje": "Publicación restaurada"}
