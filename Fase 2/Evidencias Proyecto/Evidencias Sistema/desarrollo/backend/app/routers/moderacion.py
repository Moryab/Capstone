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
from app.matching import ABIERTAS
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
                    # Al reactivar vuelve a este estado: una cuenta eliminada sigue eliminada
                    "estado_previo": usuario["estado_cuenta"],
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
    # estado_previo: al restaurar, una publicación que estaba pausada vuelve a «pausada»
    moderacion = {"ultima_accion_id": accion_id, "motivo": justificacion, "fecha": ahora,
                  "estado_previo": publicacion["estado"]}
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
    """CA-27.5: la cuenta vuelve a la normalidad, con las publicaciones que ocultó la suspensión. Si
    estaba eliminada cuando se suspendió, vuelve a «eliminada» (y puede volver a registrarse)."""
    try:
        oid = ObjectId(usuario_id)
    except InvalidId:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    ahora = datetime.now(timezone.utc)
    usuario = await db.usuarios.find_one({"_id": oid, "estado_cuenta": "suspendida"})
    previo = ((usuario or {}).get("suspension") or {}).get("estado_previo") or "activa"
    # Solo si sigue suspendida: dos reactivaciones simultáneas no se aplican dos veces
    reactivada = usuario and await db.usuarios.update_one(
        {"_id": oid, "estado_cuenta": "suspendida"},
        {"$set": {"estado_cuenta": previo, "suspension": None, "fecha_actualizacion": ahora}},
    )
    if not reactivada or not reactivada.modified_count:
        raise HTTPException(status.HTTP_409_CONFLICT, "Esta cuenta no está suspendida")

    suspension_id = usuario["suspension"].get("accion_id")
    if previo == "eliminada":
        await registrar_accion(
            ObjectId(), "reactivar_usuario", admin, ("usuario", oid), datos.justificacion,
            ("suspendida", "eliminada"), [], ahora, afectado_notificado=False, revierte=suspension_id,
        )
        return {"mensaje": "Se levantó la suspensión. La cuenta sigue eliminada y puede volver a registrarse"}

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


@router.post("/usuarios/{usuario_id}/suspender")
async def suspender_directo(usuario_id: str, datos: JustificacionIn, admin: dict = Depends(solo_admin)):
    """Suspensión desde la ficha del usuario (HU-28), tenga reportes o no. Bloquea la cuenta: no puede
    ingresar y, como el registro sigue existiendo, su correo, RUT y teléfono no sirven para otra cuenta.
    También se puede suspender una cuenta eliminada, para que no vuelva a registrarse."""
    try:
        oid = ObjectId(usuario_id)
    except InvalidId:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    usuario = await db.usuarios.find_one({"_id": oid})
    if not usuario:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    if usuario["rol"] == "administrador":
        raise HTTPException(status.HTTP_409_CONFLICT, "Esta acción no se aplica a un administrador")
    if usuario["estado_cuenta"] not in ("activa", "eliminada"):
        raise HTTPException(status.HTTP_409_CONFLICT, "Esta cuenta ya está suspendida")

    accion, resolucion = ACCIONES["suspender"]
    accion_id, ahora = ObjectId(), datetime.now(timezone.utc)
    # Igual que en la HU-30: sus reportes abiertos quedan vinculados a esta acción y resueltos
    cerrados = await cerrar_abiertos("usuario", oid, cierre_de_reporte(resolucion, admin, accion_id, ahora))
    await suspender_cuenta(usuario, admin, datos.justificacion, accion_id, ahora)
    avisar = usuario["estado_cuenta"] == "activa"  # una cuenta eliminada ya no ve sus avisos
    await registrar_accion(
        accion_id, accion, admin, ("usuario", oid), datos.justificacion,
        (usuario["estado_cuenta"], "suspendida"), [r["_id"] for r in cerrados], ahora, afectado_notificado=avisar,
    )
    if avisar:
        titulo, texto = AVISOS["suspender"]
        await notificar(oid, "accion_moderacion", titulo, f"{texto}. Motivo: {datos.justificacion.rstrip('.')}.",
                        ("usuario", oid))
    await avisar_reportantes(cerrados)
    return {"mensaje": f"La cuenta de {nombre_completo(usuario)} fue suspendida"}


async def terminar_convivencias(oid: ObjectId, ahora: datetime) -> None:
    """La convivencia activa de la cuenta eliminada se da por terminada (no se borra: queda con sus
    evaluaciones). El buscador queda libre y, si se va el buscador, el cupo vuelve al alojamiento."""
    async for match in db.matches.find({"$or": [{"usuario_a_id": oid}, {"usuario_b_id": oid}], "estado": "confirmado"}):
        inicio = match.get("fecha_inicio_convivencia")
        terminada = await db.matches.update_one({"_id": match["_id"], "estado": "confirmado"}, {"$set": {
            "estado": "finalizado",
            "fecha_fin_convivencia": ahora,
            "motivo_fin": "otro",
            "fin_por_cuenta_eliminada": True,  # campo nuevo (no está en el modelo de datos)
            "duracion_convivencia_dias": (ahora - inicio).days if inicio else 0,
        }})
        if not terminada.modified_count:
            continue
        buscador_id = match["usuario_a_id"]
        pub = await db.publicaciones.find_one({"_id": match["publicacion_id"]})
        titulo = pub["titulo"] if pub else "el alojamiento"
        if buscador_id != oid:
            await db.usuarios.update_one(
                {"_id": buscador_id, "match_activo_id": match["_id"]},
                {"$set": {"match_activo_id": None, "buscando_alojamiento": False}},
            )
            await notificar(
                buscador_id, "respuesta_match", "Una convivencia terminó",
                f"La cuenta de quien ofrecía «{titulo}» ya no está en RoomMatch. "
                "Si necesitas otro lugar, activa «Estoy buscando alojamiento» en tus propuestas.",
                ("match", match["_id"]),
            )
            continue
        if pub and pub["estado"] in ("activa", "completa") and pub["cupos_disponibles"] < pub["cupos_totales"]:
            await db.publicaciones.update_one(
                {"_id": pub["_id"]}, {"$inc": {"cupos_disponibles": 1}, "$set": {"estado": "activa"}}
            )
        await notificar(
            match["usuario_b_id"], "respuesta_match", "Una convivencia terminó",
            f"La cuenta de quien vivía en «{titulo}» ya no está en RoomMatch. El cupo quedó disponible otra vez.",
            ("match", match["_id"]),
        )


@router.post("/usuarios/{usuario_id}/eliminar")
async def eliminar_cuenta(usuario_id: str, datos: JustificacionIn, admin: dict = Depends(solo_admin)):
    """Eliminación lógica de una cuenta de estudiante: queda «eliminada», sin acceso y oculta para
    los demás, pero no se borra nada. Sus convivencias, evaluaciones, reportes y acciones de moderación
    se conservan, y si vuelve a registrarse con el mismo correo recupera este registro (auth.py)."""
    try:
        oid = ObjectId(usuario_id)
    except InvalidId:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    usuario = await db.usuarios.find_one({"_id": oid})
    if not usuario:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    if usuario["rol"] == "administrador":
        raise HTTPException(status.HTTP_409_CONFLICT, "No se puede eliminar la cuenta de un administrador")
    # Eliminada podría volver a registrarse: eso desharía el bloqueo de la suspensión
    if usuario["estado_cuenta"] == "suspendida":
        raise HTTPException(status.HTTP_409_CONFLICT, "Una cuenta suspendida no se puede eliminar")

    ahora = datetime.now(timezone.utc)
    accion_id = ObjectId()
    # Solo una vez, aunque dos administradores la eliminen al mismo tiempo. Subir token_version
    # cierra sus sesiones abiertas
    marcada = await db.usuarios.update_one(
        {"_id": oid, "estado_cuenta": {"$ne": "eliminada"}},
        {
            "$set": {
                "estado_cuenta": "eliminada",
                "eliminacion": {"fecha": ahora, "admin_id": admin["_id"], "accion_id": accion_id,
                                "motivo": datos.justificacion},
                "buscando_alojamiento": False,
                "fecha_actualizacion": ahora,
            },
            "$inc": {"seguridad.token_version": 1},
        },
    )
    if not marcada.modified_count:
        raise HTTPException(status.HTTP_409_CONFLICT, "Esta cuenta ya fue eliminada")

    await terminar_convivencias(oid, ahora)
    await db.usuarios.update_one({"_id": oid}, {"$set": {"match_activo_id": None}})
    # Sus propuestas abiertas ya no sirven; las cerradas quedan como historial
    await db.matches.update_many(
        {"$or": [{"usuario_a_id": oid}, {"usuario_b_id": oid}], "estado": {"$in": ABIERTAS}},
        {"$set": {"estado": "expirado", "fecha_respuesta": ahora}},
    )
    # Sus publicaciones dejan de mostrarse, igual que al eliminarlas (eliminación lógica)
    await db.publicaciones.update_many(
        {"oferente_id": oid, "estado": {"$ne": "eliminada"}},
        {"$set": {"estado": "eliminada", "eliminada_por": "administrador",
                  "moderacion": {"ultima_accion_id": accion_id, "motivo": "Cuenta eliminada", "fecha": ahora}}},
    )
    # La compatibilidad es un cálculo, no historial: se rehace si vuelve a registrarse
    await db.compatibilidades.delete_many({"$or": [{"usuario_a_id": oid}, {"usuario_b_id": oid}]})

    await registrar_accion(
        accion_id, "eliminar_usuario", admin, ("usuario", oid), datos.justificacion,
        (usuario["estado_cuenta"], "eliminada"), [], ahora, afectado_notificado=False,
    )
    return {"mensaje": f"La cuenta de {nombre_completo(usuario)} fue eliminada. Sus datos se conservan"}


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

    # Vuelve al estado que le corresponde hoy: si su dueño pasó a buscador mientras estaba oculta,
    # queda «pausada» igual que sus otras publicaciones (modos.py). Si ya estaba pausada al
    # ocultarla, también: su dueño aún no confirma que siga disponible. Sin cupos, «completa»
    oferente = await db.usuarios.find_one({"_id": publicacion["oferente_id"]}, {"modo": 1})
    estaba_pausada = (publicacion.get("moderacion") or {}).get("estado_previo") == "pausada"
    if estaba_pausada or (oferente and oferente.get("modo") == "buscador"):
        estado = "pausada"
    else:
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
    if estado != "pausada":
        detalle = "volvió a estar visible"
    elif oferente and oferente.get("modo") == "oferente":
        detalle = "volvió a tus publicaciones pausadas. Confirma en el inicio si sigue disponible"
    else:
        detalle = "volvió a tus publicaciones y podrás publicarla de nuevo cuando vuelvas a ofrecer un espacio"
    await notificar(publicacion["oferente_id"], "accion_moderacion", "Tu publicación fue restaurada",
                    f"Tu publicación «{publicacion['titulo']}» {detalle}.", ("publicacion", oid))
    return {"mensaje": "Publicación restaurada" if estado != "pausada"
            else "Publicación restaurada. Quedó pausada: su dueño decide si vuelve a publicarla"}
