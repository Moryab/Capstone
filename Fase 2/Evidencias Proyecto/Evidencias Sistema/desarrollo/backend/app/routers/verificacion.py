import hashlib
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse, JSONResponse

from app.config import settings
from app.db import db, siguiente_codigo
from app.deps import usuario_actual
from app.media import formato_comprobante, guardar_comprobante, ruta_comprobante
from app.schemas.verificacion import SolicitudOut, TipoComprobante, VerificacionOut

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
    return VerificacionOut(estado=estado, puede_solicitar=estado in PUEDE_SOLICITAR, solicitud=solicitud)


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



@router.get("/solicitudes/{solicitud_id}/comprobante")
async def ver_comprobante(solicitud_id: str, usuario: dict = Depends(usuario_actual)):
    """CA-21.5: solo el propio estudiante y los administradores pueden ver el comprobante."""
    try:
        oid = ObjectId(solicitud_id)
    except InvalidId:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Solicitud no encontrada")
    solicitud = await db.solicitudes_verificacion.find_one({"_id": oid})
    if not solicitud:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Solicitud no encontrada")
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
