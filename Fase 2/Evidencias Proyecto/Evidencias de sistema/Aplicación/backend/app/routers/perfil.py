import unicodedata
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from pymongo.errors import DuplicateKeyError

from app.comunas_chile import COMUNAS_CHILE
from app.config import settings
from app.db import db
from app.deps import usuario_actual
from app.media import borrar_foto, guardar_foto, tipo_imagen
from app.modos import CambioNoPermitido, Modo, cambiar_modo, resumen_cambio
from app.routers.auth import campos_duplicados, datos_en_uso, enviar_codigo_sin_fallar
from app.routers.catalogos import comunas_cerca_de, ids_comunas
from app.schemas.busqueda import Preferencias, PreferenciasIn, error_rango
from app.schemas.perfil import DescripcionIn, EstudiosIn, OrigenIn, PerfilIn, PerfilOut, calcular_faltantes
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
    carrera = await revisar_carrera(institucion_id, datos.carrera, datos.carrera_otra, usuario)
    if not carrera:
        return datos_invalidos(CARRERA_FUERA_DE_LISTA)
    origen = revisar_origen(datos.ciudad_origen, datos.region_origen, usuario)
    if not origen:
        return datos_invalidos(CIUDAD_FUERA_DE_LISTA)

    # CA-04.3: el correo y el teléfono nuevos no pueden pertenecer a otra cuenta
    repetidos = [
        campo
        for campo, ruta in (("correo", "correo"), ("telefono", "perfil.telefono"))
        if await db.usuarios.find_one(
            {ruta: getattr(datos, campo), "_id": {"$ne": usuario["_id"]}}, {"_id": 1}
        )
    ]
    if repetidos:
        return datos_en_uso(repetidos)

    perfil = {
        "institucion_id": institucion_id,
        "sede": datos.sede,
        "carrera": carrera[0],
        "carrera_otra": carrera[1],
        "anio_ingreso": datos.anio_ingreso,
        "direccion": datos.direccion,
        "ciudad_origen": origen[0],
        "region_origen": origen[1],
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
    except DuplicateKeyError as e:
        return datos_en_uso(campos_duplicados(e))

    actualizado = await db.usuarios.find_one({"_id": usuario["_id"]})
    if datos.correo != usuario["correo"]:
        # Hasta ingresar el código, la cuenta queda bloqueada como al registrarse (deps.usuario_actual)
        await enviar_codigo_sin_fallar(actualizado)
        return {"mensaje": f"Perfil guardado. Te enviamos un código a {datos.correo} para verificarlo",
                "perfil": PerfilOut.desde_doc(actualizado), "verificar_correo": True}
    return {"mensaje": "Perfil guardado", "perfil": PerfilOut.desde_doc(actualizado)}


async def revisar_carrera(
    institucion_id: ObjectId, carrera: str, otra: bool, usuario: dict
) -> tuple[str, bool] | None:
    """La carrera tal como está en la lista de la institución (con sus mayúsculas y tildes) o, si el
    estudiante marcó «No encuentro mi carrera», lo que escribió. None si dice venir de la lista y no está.
    Si escribió a mano una que sí está en la lista, se guarda la de la lista. La que ya tenía guardada
    (de antes de que existiera la lista) se acepta sin cambios, como escrita a mano."""
    de_lista = await db.carreras.find_one(
        {"institucion_id": institucion_id, "nombre": carrera, "activa": True},
        collation={"locale": "es", "strength": 1},  # sin distinguir mayúsculas ni tildes
    )
    if de_lista:
        return de_lista["nombre"], False
    actual = usuario.get("perfil", {}).get("carrera")
    return (carrera, True) if otra or carrera == actual else None


def _sin_tildes(texto: str) -> str:
    return unicodedata.normalize("NFD", texto).encode("ascii", "ignore").decode().lower().strip()


COMUNA_DE = {_sin_tildes(comuna): (comuna, region) for comuna, region in COMUNAS_CHILE.items()}


def revisar_origen(ciudad: str, region: str, usuario: dict) -> tuple[str, str] | None:
    """La ciudad de origen es una de las 346 comunas de Chile y la región es siempre la de esa comuna
    (con el nombre oficial, aunque se escriba sin tildes). La que ya tenía guardada de antes de la lista
    se acepta sin cambios, con su región. None si no es una comuna."""
    oficial = COMUNA_DE.get(_sin_tildes(ciudad))
    # Sin cambios y escrita a mano («san pedro» puede ser San Pedro o San Pedro de la Paz): tal cual
    if ciudad == usuario.get("perfil", {}).get("ciudad_origen") and (not oficial or oficial[0] != ciudad):
        return ciudad, region
    return oficial


CIUDAD_FUERA_DE_LISTA = {"ciudad_origen": "Elige tu ciudad de la lista de comunas"}
CARRERA_FUERA_DE_LISTA = {"carrera": "Elige tu carrera de la lista o usa «No encuentro mi carrera»"}


async def guardar_parte(usuario: dict, campos: dict) -> dict:
    """Guarda solo algunos campos del perfil y recalcula qué falta (CA-03.5)."""
    perfil = {**usuario.get("perfil", {}), **campos}
    faltantes = calcular_faltantes(perfil)
    await db.usuarios.update_one(
        {"_id": usuario["_id"]},
        {"$set": {
            **{f"perfil.{campo}": valor for campo, valor in campos.items()},
            "perfil.campos_faltantes": faltantes,
            "perfil.perfil_completo": not faltantes,
            "fecha_actualizacion": datetime.now(timezone.utc),
        }},
    )
    actualizado = await db.usuarios.find_one({"_id": usuario["_id"]})
    return {"mensaje": "Perfil guardado", "perfil": PerfilOut.desde_doc(actualizado)}


@router.put("/estudios")
async def guardar_estudios(datos: EstudiosIn, usuario: dict = Depends(usuario_actual)):
    """Paso «Tus estudios» del cuestionario de bienvenida: institución, sede y carrera."""
    try:
        institucion_id = ObjectId(datos.institucion_id)
    except InvalidId:
        return datos_invalidos({"institucion_id": "Selecciona una institución válida"})
    institucion = await db.instituciones.find_one({"_id": institucion_id, "activa": True})
    if not institucion:
        return datos_invalidos({"institucion_id": "Selecciona una institución válida"})
    if datos.sede not in [sede["nombre"] for sede in institucion.get("sedes", [])]:
        return datos_invalidos({"sede": "Selecciona una sede de tu institución"})
    carrera = await revisar_carrera(institucion_id, datos.carrera, datos.carrera_otra, usuario)
    if not carrera:
        return datos_invalidos(CARRERA_FUERA_DE_LISTA)
    return await guardar_parte(usuario, {
        "institucion_id": institucion_id,
        "sede": datos.sede,
        "carrera": carrera[0],
        "carrera_otra": carrera[1],
        "anio_ingreso": datos.anio_ingreso,
    })


@router.put("/descripcion")
async def guardar_descripcion(datos: DescripcionIn, usuario: dict = Depends(usuario_actual)):
    """«Sobre mí» editado en línea desde el perfil, sin pasar por el formulario completo."""
    return await guardar_parte(usuario, {"descripcion": datos.descripcion})


@router.put("/origen")
async def guardar_origen(datos: OrigenIn, usuario: dict = Depends(usuario_actual)):
    """Paso «De dónde eres» del cuestionario de bienvenida: ciudad, región y dirección."""
    origen = revisar_origen(datos.ciudad_origen, datos.region_origen, usuario)
    if not origen:
        return datos_invalidos(CIUDAD_FUERA_DE_LISTA)
    return await guardar_parte(usuario, {
        "ciudad_origen": origen[0], "region_origen": origen[1], "direccion": datos.direccion,
    })


def preferencias_out(usuario: dict) -> dict:
    guardadas = usuario.get("preferencias_busqueda") or {}
    return {
        **Preferencias.model_validate(guardadas).model_dump(),
        "comunas_ids": [str(c) for c in guardadas.get("comunas_ids", [])],
    }


@router.get("/preferencias-busqueda")
async def ver_preferencias(usuario: dict = Depends(usuario_actual)):
    """CA-12.2: filtros guardados para «Usar mis preferencias»."""
    return preferencias_out(usuario)


@router.put("/preferencias-busqueda")
async def guardar_preferencias(datos: PreferenciasIn, usuario: dict = Depends(usuario_actual)):
    if error := error_rango(datos.costo_min, datos.costo_max):
        return datos_invalidos(error)
    comunas = await ids_comunas(datos.comunas_ids)
    if comunas is None:
        return datos_invalidos({"comunas_ids": "Selecciona comunas de la lista"})
    if datos.cerca_institucion and await comunas_cerca_de(usuario) is None:
        return datos_invalidos({
            "cerca_institucion": "Indica tu institución y sede en tu perfil para usar esta opción"
        })

    preferencias = {**datos.model_dump(), "comunas_ids": comunas}
    await db.usuarios.update_one(
        {"_id": usuario["_id"]},
        {"$set": {"preferencias_busqueda": preferencias, "fecha_actualizacion": datetime.now(timezone.utc)}},
    )
    return {
        "mensaje": "Preferencias guardadas",
        "preferencias": preferencias_out({"preferencias_busqueda": preferencias}),
    }


class ModoIn(BaseModel):
    modo: Modo


@router.get("/modo")
async def ver_modo(usuario: dict = Depends(usuario_actual)):
    """Rol actual y lo que pasaría al cambiarlo, para explicarlo antes de confirmar."""
    return await resumen_cambio(usuario)


@router.put("/modo")
async def elegir_modo(datos: ModoIn, usuario: dict = Depends(usuario_actual)):
    """Elegir el rol después del cuestionario o cambiarlo desde el inicio o la configuración.
    Con una convivencia activa no se puede cambiar (modos.py)."""
    if usuario["rol"] != "estudiante":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo los estudiantes tienen rol de buscador u oferente")
    try:
        resultado = await cambiar_modo(usuario, datos.modo)
    except CambioNoPermitido as e:
        raise HTTPException(status.HTTP_409_CONFLICT, str(e))
    textos = {"buscador": "Ahora buscas dónde vivir", "oferente": "Ahora ofreces un espacio"}
    return {"mensaje": textos[datos.modo], **resultado}


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
