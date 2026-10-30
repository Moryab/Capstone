"""EP-02 · HU-21, HU-22 y HU-23: solicitud de verificación del estudiante, su revisión y la revocación.

Archivo de esta área: solo lo edita quien tiene estas historias. Las rutas de administración usan
Depends(solo_admin) (app/deps.py) y los avisos al usuario se envían con app.notificaciones.notificar.
"""

import hashlib
from datetime import datetime, timezone
from typing import Literal

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse, JSONResponse

from app.config import settings
from app.db import db, siguiente_codigo
from app.deps import solo_admin, usuario_actual
from app.media import formato_comprobante, guardar_comprobante, ruta_comprobante
from app.notificaciones import notificar
from app.schemas.verificacion import (
    RechazoIn, RevocacionIn, SolicitanteOut, SolicitudAdminOut, SolicitudOut, SolicitudResumenOut, TipoComprobante,
    VerificacionOut,
)

router = APIRouter(prefix="/api/verificacion", tags=["Verificación"])

# Con estos estados el estudiante puede enviar una solicitud nueva (CA-21.4)
PUEDE_SOLICITAR = ("no_verificado", "rechazado", "revocado")
MENSAJES_NO_PUEDE = {
    "pendiente": "Ya tienes una solicitud pendiente de validación",
    "verificado": "Tu condición de estudiante ya está verificada",
}

TIPOS_MIME = {"pdf": "application/pdf", "jpg": "image/jpeg", "png": "image/png"}


def datos_invalidos(errores: dict) -> JSONResponse:
    return JSONResponse(status_code=422, content={"detail": "Datos inválidos", "errores": errores})


async def verificacion_out(usuario: dict) -> VerificacionOut:
    estado = usuario.get("verificacion", {}).get("estado", "no_verificado")
    solicitud = await db.solicitudes_verificacion.find_one(
        {"usuario_id": usuario["_id"]}, sort=[("fecha_solicitud", -1)]
    )
    if solicitud:
        institucion = await db.instituciones.find_one({"_id": solicitud["institucion_id"]}, {"nombre": 1})
        solicitud = SolicitudOut.desde_doc(solicitud, institucion and institucion["nombre"])
    return VerificacionOut(
        estado=estado,
        puede_solicitar=estado in PUEDE_SOLICITAR,
        motivo_revocacion=usuario.get("verificacion", {}).get("motivo_revocacion") if estado == "revocado" else None,
        solicitud=solicitud,
    )


@router.get("", response_model=VerificacionOut)
async def ver_verificacion(usuario: dict = Depends(usuario_actual)):
    """CA-21.4: estado de la verificación y de la última solicitud (con el motivo, si se rechazó)."""
    return await verificacion_out(usuario)


@router.post("", status_code=status.HTTP_201_CREATED)
async def solicitar_verificacion(
    institucion_id: str = Form(...),
    tipo_comprobante: TipoComprobante = Form(...),
    comprobante: UploadFile = File(...),
    usuario: dict = Depends(usuario_actual),
):
    """HU-21: el estudiante indica su institución y adjunta un comprobante (CA-21.1 y CA-21.2)."""
    estado = usuario.get("verificacion", {}).get("estado", "no_verificado")
    if estado not in PUEDE_SOLICITAR:
        raise HTTPException(status.HTTP_409_CONFLICT, MENSAJES_NO_PUEDE[estado])

    try:
        institucion_oid = ObjectId(institucion_id)
    except InvalidId:
        return datos_invalidos({"institucion_id": "Selecciona una institución válida"})
    if not await db.instituciones.find_one({"_id": institucion_oid, "activa": True}, {"_id": 1}):
        return datos_invalidos({"institucion_id": "Selecciona una institución válida"})

    # CA-21.3: PDF, JPG o PNG de hasta 5 MB, según el contenido real y no la extensión
    limite = settings.max_comprobante_mb * 1024 * 1024
    contenido = await comprobante.read(limite + 1)
    if not contenido:
        return datos_invalidos({"comprobante": "Adjunta tu comprobante"})
    if len(contenido) > limite:
        return datos_invalidos(
            {"comprobante": f"El archivo debe pesar como máximo {settings.max_comprobante_mb} MB"}
        )
    formato = formato_comprobante(contenido)
    if not formato:
        return datos_invalidos({"comprobante": "El archivo debe ser PDF, JPG o PNG"})

    # Se marca «pendiente» de forma atómica: dos envíos simultáneos no crean dos solicitudes
    ahora = datetime.now(timezone.utc)
    marcado = await db.usuarios.update_one(
        {"_id": usuario["_id"], "verificacion.estado": {"$nin": ["pendiente", "verificado"]}},
        {"$set": {"verificacion.estado": "pendiente", "fecha_actualizacion": ahora}},
    )
    if not marcado.modified_count:
        raise HTTPException(status.HTTP_409_CONFLICT, MENSAJES_NO_PUEDE["pendiente"])

    nombre = await run_in_threadpool(guardar_comprobante, str(usuario["_id"]), contenido, formato)
    solicitud = {
        "codigo": await siguiente_codigo("solicitudes_verificacion"),
        "usuario_id": usuario["_id"],
        "institucion_id": institucion_oid,
        "admin_revisor_id": None,
        "tipo_comprobante": tipo_comprobante,
        "vigencia_hasta": None,
        "fecha_solicitud": ahora,
        "fecha_revision": None,
        "estado": "pendiente",
        "motivo_rechazo": None,
        "observaciones": None,
        "archivo": {
            "ruta": nombre,
            # Solo para mostrarlo; en disco se guarda con un nombre generado
            "nombre_original": (comprobante.filename or f"comprobante.{formato}")[-120:],
            "formato": formato,
            "tamano_bytes": len(contenido),
            "hash_sha256": hashlib.sha256(contenido).hexdigest(),
        },
    }
    resultado = await db.solicitudes_verificacion.insert_one(solicitud)
    await db.usuarios.update_one(
        {"_id": usuario["_id"]}, {"$set": {"verificacion.solicitud_id": resultado.inserted_id}}
    )

    usuario["verificacion"] = {**usuario.get("verificacion", {}), "estado": "pendiente"}
    return {
        "mensaje": "Recibimos tu comprobante. Tu solicitud quedó pendiente de validación",
        "verificacion": await verificacion_out(usuario),
    }



# ---------- HU-22: revisión de las solicitudes por un administrador ----------

# Estados en que la solicitud todavía se puede aprobar o rechazar (CA-22.4)
POR_REVISAR = ["pendiente", "en_revision"]


async def buscar_solicitud(solicitud_id: str) -> dict:
    try:
        oid = ObjectId(solicitud_id)
    except InvalidId:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Solicitud no encontrada")
    solicitud = await db.solicitudes_verificacion.find_one({"_id": oid})
    if not solicitud:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Solicitud no encontrada")
    return solicitud


async def nombres_instituciones(ids: set) -> dict:
    return {i["_id"]: i["nombre"] async for i in db.instituciones.find({"_id": {"$in": list(ids)}}, {"nombre": 1})}


def nombre_completo(doc: dict) -> str:
    return " ".join(p for p in (doc["nombre"], doc.get("ap_paterno"), doc.get("ap_materno")) if p)


@router.get("/solicitudes", response_model=list[SolicitudResumenOut])
async def listar_solicitudes(
    estado: Literal["pendientes", "procesadas"] = "pendientes", _admin: dict = Depends(solo_admin)
):
    """CA-22.1: pendientes de la más antigua a la más reciente. Las procesadas quedan como
    historial (CA-22.4), de la última revisada hacia atrás."""
    if estado == "pendientes":
        filtro, orden = {"estado": {"$in": POR_REVISAR}}, [("fecha_solicitud", 1)]
    else:
        filtro, orden = {"estado": {"$nin": POR_REVISAR}}, [("fecha_revision", -1)]
    solicitudes = await db.solicitudes_verificacion.find(filtro).sort(orden).to_list(500)

    usuarios = {
        u["_id"]: u
        async for u in db.usuarios.find(
            {"_id": {"$in": [s["usuario_id"] for s in solicitudes]}},
            {"nombre": 1, "ap_paterno": 1, "ap_materno": 1, "correo": 1},
        )
    }
    instituciones = await nombres_instituciones({s["institucion_id"] for s in solicitudes})
    filas = []
    for s in solicitudes:
        u = usuarios.get(s["usuario_id"])
        if not u:
            continue  # la cuenta se eliminó
        filas.append(SolicitudResumenOut(
            id=str(s["_id"]),
            codigo=s["codigo"],
            usuario_id=str(u["_id"]),
            nombre=nombre_completo(u),
            correo=u["correo"],
            institucion_nombre=instituciones.get(s["institucion_id"]),
            tipo_comprobante=s["tipo_comprobante"],
            estado=s["estado"],
            fecha_solicitud=s["fecha_solicitud"],
            fecha_revision=s.get("fecha_revision"),
        ))
    return filas


@router.get("/solicitudes/{solicitud_id}", response_model=SolicitudAdminOut)
async def ver_solicitud(solicitud_id: str, _admin: dict = Depends(solo_admin)):
    """CA-22.1: la solicitud junto con los datos del perfil del estudiante."""
    solicitud = await buscar_solicitud(solicitud_id)
    usuario = await db.usuarios.find_one({"_id": solicitud["usuario_id"]})
    if not usuario:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "La cuenta del estudiante ya no existe")

    perfil = usuario.get("perfil", {})
    instituciones = await nombres_instituciones({solicitud["institucion_id"], perfil.get("institucion_id")})
    revisor = solicitud.get("admin_revisor_id") and await db.usuarios.find_one(
        {"_id": solicitud["admin_revisor_id"]}, {"nombre": 1, "ap_paterno": 1, "ap_materno": 1}
    )
    fecha_nac = usuario.get("fecha_nac")
    base = SolicitudOut.desde_doc(solicitud, instituciones.get(solicitud["institucion_id"]))
    return SolicitudAdminOut(
        **base.model_dump(),
        observaciones=solicitud.get("observaciones"),
        admin_revisor=revisor and nombre_completo(revisor),
        solicitante=SolicitanteOut(
            id=str(usuario["_id"]),
            rut=usuario.get("rut"),
            nombre=usuario["nombre"],
            ap_paterno=usuario.get("ap_paterno"),
            nombre_completo=nombre_completo(usuario),
            correo=usuario["correo"],
            telefono=perfil.get("telefono"),
            fecha_nac=fecha_nac.date() if fecha_nac else None,
            foto_url=perfil.get("foto_url"),
            institucion_nombre=instituciones.get(perfil.get("institucion_id")),
            sede=perfil.get("sede"),
            carrera=perfil.get("carrera"),
            anio_ingreso=perfil.get("anio_ingreso"),
            fecha_registro=usuario["fecha_registro"],
            verificacion_estado=usuario.get("verificacion", {}).get("estado", "no_verificado"),
        ),
    )


async def resolver(solicitud_id: str, admin: dict, cambios: dict) -> dict:
    """Marca la solicitud como revisada solo si seguía pendiente: así una solicitud no se procesa
    dos veces, ni aunque dos administradores la resuelvan al mismo tiempo (CA-22.4)."""
    solicitud = await buscar_solicitud(solicitud_id)
    ahora = datetime.now(timezone.utc)
    resultado = await db.solicitudes_verificacion.update_one(
        {"_id": solicitud["_id"], "estado": {"$in": POR_REVISAR}},
        {"$set": {**cambios, "admin_revisor_id": admin["_id"], "fecha_revision": ahora}},
    )
    if not resultado.modified_count:
        raise HTTPException(status.HTTP_409_CONFLICT, "Esta solicitud ya fue procesada")
    return {**solicitud, "fecha_revision": ahora}


@router.post("/solicitudes/{solicitud_id}/aprobar")
async def aprobar_solicitud(solicitud_id: str, admin: dict = Depends(solo_admin)):
    """CA-22.2: el perfil pasa a «verificado», con la fecha y el administrador que lo validó."""
    solicitud = await resolver(solicitud_id, admin, {"estado": "aprobada", "motivo_rechazo": None})
    await db.usuarios.update_one(
        {"_id": solicitud["usuario_id"]},
        {"$set": {
            "verificacion": {
                "estado": "verificado",
                "fecha_verificacion": solicitud["fecha_revision"],
                "fecha_revocacion": None,
                "admin_id": admin["_id"],
                "solicitud_id": solicitud["_id"],
            },
            "fecha_actualizacion": solicitud["fecha_revision"],
        }},
    )
    await notificar(
        solicitud["usuario_id"], "verificacion_estudiante", "Tu condición de estudiante fue verificada",
        "Revisamos tu comprobante y tu perfil ya aparece como estudiante verificado.",
        ("usuario", solicitud["usuario_id"]),
    )
    return {"mensaje": "Solicitud aprobada. El estudiante quedó verificado"}


@router.post("/solicitudes/{solicitud_id}/rechazar")
async def rechazar_solicitud(solicitud_id: str, datos: RechazoIn, admin: dict = Depends(solo_admin)):
    """CA-22.3: sin motivo no se puede rechazar; con él, el estudiante recibe ese motivo."""
    solicitud = await resolver(solicitud_id, admin, {"estado": "rechazada", "motivo_rechazo": datos.motivo})
    await db.usuarios.update_one(
        {"_id": solicitud["usuario_id"]},
        {"$set": {
            "verificacion.estado": "rechazado",
            "verificacion.admin_id": admin["_id"],
            "verificacion.solicitud_id": solicitud["_id"],
            "fecha_actualizacion": solicitud["fecha_revision"],
        }},
    )
    await notificar(
        solicitud["usuario_id"], "verificacion_estudiante", "Tu solicitud de verificación fue rechazada",
        f"Motivo: {datos.motivo.rstrip('.')}. Puedes enviar una nueva solicitud con otro comprobante.",
        ("usuario", solicitud["usuario_id"]),
    )
    return {"mensaje": "Solicitud rechazada. Se le avisó al estudiante con el motivo"}


async def quitar_verificacion(oid: ObjectId, admin: dict, motivo: str) -> None:
    """CA-23.4: la insignia sale de todas las vistas porque todas la calculan desde
    verificacion.estado. La usan esta historia y las acciones sobre un reporte (HU-27)."""
    ahora = datetime.now(timezone.utc)
    resultado = await db.usuarios.update_one(
        {"_id": oid, "verificacion.estado": "verificado"},
        {"$set": {
            "verificacion.estado": "revocado",
            "verificacion.fecha_revocacion": ahora,
            "verificacion.admin_id": admin["_id"],
            # Campo nuevo (no está en el modelo de datos): se le muestra al estudiante
            "verificacion.motivo_revocacion": motivo,
            "fecha_actualizacion": ahora,
        }},
    )
    if not resultado.matched_count:
        raise HTTPException(status.HTTP_409_CONFLICT, "Este perfil no tiene una verificación vigente")
    await notificar(
        oid, "verificacion_estudiante", "Tu verificación de estudiante fue revocada",
        f"Motivo: {motivo.rstrip('.')}. Puedes volver a solicitarla con un comprobante actualizado.",
        ("usuario", oid),
    )


@router.post("/usuarios/{usuario_id}/revocar")
async def revocar_verificacion(usuario_id: str, datos: RevocacionIn, admin: dict = Depends(solo_admin)):
    """CA-23.4: un administrador deja sin efecto la verificación. El estudiante puede volver a
    solicitarla con un comprobante actualizado."""
    try:
        oid = ObjectId(usuario_id)
    except InvalidId:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    await quitar_verificacion(oid, admin, datos.motivo)
    return {"mensaje": "Verificación revocada. La insignia ya no aparece en el perfil"}


@router.get("/solicitudes/{solicitud_id}/comprobante")
async def ver_comprobante(solicitud_id: str, usuario: dict = Depends(usuario_actual)):
    """CA-21.5: solo el propio estudiante y los administradores pueden ver el comprobante."""
    solicitud = await buscar_solicitud(solicitud_id)
    if solicitud["usuario_id"] != usuario["_id"] and usuario["rol"] != "administrador":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes acceso a este comprobante")

    archivo = solicitud["archivo"]
    ruta = ruta_comprobante(archivo["ruta"])
    if not ruta.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "El archivo ya no está disponible")
    return FileResponse(
        ruta,
        media_type=TIPOS_MIME[archivo["formato"]],
        filename=archivo["nombre_original"],
        content_disposition_type="inline",
        headers={"Cache-Control": "private, no-store"},
    )
