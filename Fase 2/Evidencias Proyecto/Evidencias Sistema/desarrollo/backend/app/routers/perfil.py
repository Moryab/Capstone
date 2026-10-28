from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from pymongo.errors import DuplicateKeyError

from app.config import settings
from app.db import db
from app.deps import usuario_actual
from app.media import borrar_foto, guardar_foto, tipo_imagen
from app.routers.auth import datos_en_uso
from app.schemas.perfil import PerfilIn, PerfilOut, calcular_faltantes
from app.schemas.usuarios import fecha_a_datetime

router = APIRouter(prefix="/api/perfil", tags=["Perfil"])


def datos_invalidos(errores: dict) -> JSONResponse:
    """Mismo formato que los 422 de validación, para errores que se detectan en la base."""
    return JSONResponse(status_code=422, content={"detail": "Datos inválidos", "errores": errores})


@router.get("", response_model=PerfilOut)
async def ver_perfil(usuario: dict = Depends(usuario_actual)):
    """CA-03.1: datos para «Mi perfil»."""
    return PerfilOut.desde_doc(usuario)


@router.put("")
async def guardar_perfil(datos: PerfilIn, usuario: dict = Depends(usuario_actual)):
    """HU-03 y HU-04. Siempre actúa sobre el usuario del token, nunca sobre otro (CA-04.5)."""
    try:
        institucion_id = ObjectId(datos.institucion_id)
    except InvalidId:
        return datos_invalidos({"institucion_id": "Selecciona una institución válida"})
    institucion = await db.instituciones.find_one({"_id": institucion_id, "activa": True})
    if not institucion:
        return datos_invalidos({"institucion_id": "Selecciona una institución válida"})
    if datos.sede not in [sede["nombre"] for sede in institucion.get("sedes", [])]:
        return datos_invalidos({"sede": "Selecciona una sede de tu institución"})

    # CA-04.3: el correo nuevo no puede pertenecer a otra cuenta
    otro = await db.usuarios.find_one(
        {"correo": datos.correo, "_id": {"$ne": usuario["_id"]}}, {"_id": 1}
    )
    if otro:
        return datos_en_uso(["correo"])

    perfil = {
        "institucion_id": institucion_id,
        "sede": datos.sede,
        "carrera": datos.carrera,
        "anio_ingreso": datos.anio_ingreso,
        "direccion": datos.direccion,
        "ciudad_origen": datos.ciudad_origen,
        "region_origen": datos.region_origen,
        "telefono": datos.telefono,
        "descripcion": datos.descripcion,
    }
    faltantes = calcular_faltantes(perfil)
    cambios = {
        "nombre": datos.nombre,
        "ap_paterno": datos.ap_paterno,
        "ap_materno": datos.ap_materno,
        "fecha_nac": fecha_a_datetime(datos.fecha_nac),
        "genero": datos.genero,
        "correo": datos.correo,
        "fecha_actualizacion": datetime.now(timezone.utc),
        # Campo a campo para no borrar lo que el perfil tenga aparte (foto, etc.)
        **{f"perfil.{campo}": valor for campo, valor in perfil.items()},
        "perfil.campos_faltantes": faltantes,
        "perfil.perfil_completo": not faltantes,  # CA-03.5
    }
    if datos.correo != usuario["correo"]:
        cambios["correo_verificado"] = False  # el correo nuevo aún no se ha verificado

    try:
        await db.usuarios.update_one({"_id": usuario["_id"]}, {"$set": cambios})
    except DuplicateKeyError:
        return datos_en_uso(["correo"])

    actualizado = await db.usuarios.find_one({"_id": usuario["_id"]})
    return {"mensaje": "Perfil guardado", "perfil": PerfilOut.desde_doc(actualizado)}


@router.post("/foto")
async def subir_foto(foto: UploadFile = File(...), usuario: dict = Depends(usuario_actual)):
    """Foto de perfil: JPG, PNG o WebP de hasta 5 MB. Reemplaza la anterior."""
    limite = settings.max_foto_mb * 1024 * 1024
    contenido = await foto.read(limite + 1)
    if len(contenido) > limite:
        return datos_invalidos({"foto": f"La foto debe pesar como máximo {settings.max_foto_mb} MB"})
    extension = tipo_imagen(contenido)
    if not extension:
        return datos_invalidos({"foto": "La foto debe ser una imagen JPG, PNG o WebP"})

    url = await run_in_threadpool(guardar_foto, str(usuario["_id"]), contenido, extension)
    await db.usuarios.update_one(
        {"_id": usuario["_id"]},
        {"$set": {"perfil.foto_url": url, "fecha_actualizacion": datetime.now(timezone.utc)}},
    )
    await run_in_threadpool(borrar_foto, usuario.get("perfil", {}).get("foto_url"))
    return {"mensaje": "Foto actualizada", "foto_url": url}


@router.delete("/foto")
async def quitar_foto(usuario: dict = Depends(usuario_actual)):
    await db.usuarios.update_one(
        {"_id": usuario["_id"]},
        {"$set": {"perfil.foto_url": None, "fecha_actualizacion": datetime.now(timezone.utc)}},
    )
    await run_in_threadpool(borrar_foto, usuario.get("perfil", {}).get("foto_url"))
    return {"mensaje": "Foto eliminada"}
