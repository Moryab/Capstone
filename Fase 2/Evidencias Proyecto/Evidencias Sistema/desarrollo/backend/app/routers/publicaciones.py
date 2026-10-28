from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool

from app.config import settings
from app.db import db, siguiente_codigo
from app.deps import usuario_actual
from app.media import borrar_foto, guardar_foto_publicacion, tipo_imagen
from app.routers.perfil import datos_invalidos
from app.schemas.publicaciones import MAX_FOTOS, PublicacionIn, PublicacionOut

router = APIRouter(prefix="/api/publicaciones", tags=["Publicaciones"])

NO_ENCONTRADA = HTTPException(status.HTTP_404_NOT_FOUND, "Publicación no encontrada")
NO_ES_TUYA = HTTPException(
    status.HTTP_403_FORBIDDEN, "Solo quien publicó el alojamiento puede modificarlo"
)
# CA-05.4: la publicación acepta JPG y PNG (la foto de perfil además acepta WebP)
FORMATOS_FOTO = ("jpg", "png")


async def buscar(publicacion_id: str) -> dict:
    """La publicación con ese id; las eliminadas se tratan como inexistentes (CA-08.2)."""
    try:
        oid = ObjectId(publicacion_id)
    except InvalidId:
        raise NO_ENCONTRADA
    doc = await db.publicaciones.find_one({"_id": oid, "estado": {"$ne": "eliminada"}})
    if not doc:
        raise NO_ENCONTRADA
    return doc


async def buscar_propia(publicacion_id: str, usuario: dict) -> dict:
    """CA-07.4 y CA-08.5: solo el oferente puede editar, eliminar o cambiar las fotos."""
    doc = await buscar(publicacion_id)
    if doc["oferente_id"] != usuario["_id"]:
        raise NO_ES_TUYA
    return doc


async def campos_desde(datos: PublicacionIn) -> dict | None:
    """Convierte lo enviado en los campos del documento. Devuelve None si la comuna no existe."""
    try:
        comuna = await db.comunas.find_one({"_id": ObjectId(datos.ubicacion.comuna_id)})
    except InvalidId:
        comuna = None
    if not comuna:
        return None

    gastos = datos.gastos.model_dump()
    return {
        "tipo": datos.tipo,
        "titulo": datos.titulo,
        "descripcion": datos.descripcion,
        "cupos_totales": datos.cupos_totales,
        "cupos_disponibles": datos.cupos_disponibles,
        "costo_mensual": datos.costo_mensual,
        "genero_preferido": datos.genero_preferido,
        # Sin cupos libres la publicación queda «completa» y sale de las búsquedas
        "estado": "activa" if datos.cupos_disponibles > 0 else "completa",
        "ubicacion": {
            "comuna_id": comuna["_id"],
            "comuna_nombre": comuna["nombre"],
            "sector": datos.ubicacion.sector,
            "direccion_referencia": datos.ubicacion.direccion_referencia,
            # Por ahora el centro de la comuna; más adelante se podrá marcar el punto exacto
            "coordenadas": comuna["centro"],
        },
        "gastos": {**gastos, "todos_incluidos": all(g["incluido"] for g in gastos.values())},
        "reglas": datos.reglas.model_dump(),
        "caracteristicas": datos.caracteristicas.model_dump(),
    }


COMUNA_INVALIDA = {"ubicacion.comuna_id": "Selecciona una comuna de la lista"}


@router.post("", status_code=status.HTTP_201_CREATED)
async def publicar(datos: PublicacionIn, usuario: dict = Depends(usuario_actual)):
    """HU-05 y HU-06: cualquier estudiante puede publicar con su misma cuenta (CA-05.1)."""
    campos = await campos_desde(datos)
    if campos is None:
        return datos_invalidos(COMUNA_INVALIDA)
    if datos.cupos_disponibles == 0:
        return datos_invalidos({"cupos_disponibles": "Al publicar debe haber al menos un cupo disponible"})

    doc = {
        "codigo": await siguiente_codigo("publicaciones"),
        "oferente_id": usuario["_id"],
        **campos,
        "fotos": [],
        "fecha_publicacion": datetime.now(timezone.utc),
        "fecha_ultima_modificacion": None,
        "fecha_eliminacion": None,
        "eliminada_por": None,
        "cantidad_reportes": 0,
        "cantidad_reportes_pendiente": 0,
    }
    resultado = await db.publicaciones.insert_one(doc)
    doc["_id"] = resultado.inserted_id
    return {
        "mensaje": "Publicación creada",
        "publicacion": PublicacionOut.desde_doc(doc, es_propia=True, oferente=usuario),
    }


@router.get("/mias", response_model=list[PublicacionOut])
async def mis_publicaciones(usuario: dict = Depends(usuario_actual)):
    """«Mis publicaciones» (CA-07.1), de la más reciente a la más antigua."""
    cursor = db.publicaciones.find(
        {"oferente_id": usuario["_id"], "estado": {"$ne": "eliminada"}}
    ).sort("fecha_publicacion", -1)
    return [PublicacionOut.desde_doc(doc, es_propia=True) async for doc in cursor]


@router.get("/{publicacion_id}", response_model=PublicacionOut)
async def detalle(publicacion_id: str, usuario: dict = Depends(usuario_actual)):
    """CA-05.5: detalle de una publicación. Los demás solo ven las activas."""
    doc = await buscar(publicacion_id)
    es_propia = doc["oferente_id"] == usuario["_id"]
    if not es_propia and doc["estado"] != "activa":
        raise NO_ENCONTRADA

    oferente = await db.usuarios.find_one({"_id": doc["oferente_id"]})
    return PublicacionOut.desde_doc(doc, es_propia=es_propia, oferente=oferente)


@router.put("/{publicacion_id}")
async def editar(publicacion_id: str, datos: PublicacionIn, usuario: dict = Depends(usuario_actual)):
    """HU-07: mismas validaciones que al publicar (CA-07.3)."""
    doc = await buscar_propia(publicacion_id, usuario)
    if doc["estado"] == "suspendida":
        raise HTTPException(
            status.HTTP_409_CONFLICT, "La publicación está suspendida por moderación y no se puede editar"
        )
    campos = await campos_desde(datos)
    if campos is None:
        return datos_invalidos(COMUNA_INVALIDA)

    campos["fecha_ultima_modificacion"] = datetime.now(timezone.utc)  # CA-07.5
    await db.publicaciones.update_one({"_id": doc["_id"]}, {"$set": campos})
    actualizado = await db.publicaciones.find_one({"_id": doc["_id"]})
    return {
        "mensaje": "Cambios guardados",
        "publicacion": PublicacionOut.desde_doc(actualizado, es_propia=True, oferente=usuario),
    }


@router.delete("/{publicacion_id}")
async def eliminar(publicacion_id: str, usuario: dict = Depends(usuario_actual)):
    """HU-08: eliminación lógica; el registro se conserva para el historial (CA-08.4)."""
    doc = await buscar_propia(publicacion_id, usuario)
    await db.publicaciones.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "estado": "eliminada",
                "fecha_eliminacion": datetime.now(timezone.utc),
                "eliminada_por": "oferente",
            }
        },
    )
    return {"mensaje": "Publicación eliminada"}


@router.post("/{publicacion_id}/fotos")
async def subir_foto(
    publicacion_id: str, foto: UploadFile = File(...), usuario: dict = Depends(usuario_actual)
):
    """CA-05.4: hasta 5 fotos JPG o PNG de máximo 5 MB cada una. La primera queda como principal."""
    doc = await buscar_propia(publicacion_id, usuario)
    fotos = doc.get("fotos", [])
    if len(fotos) >= MAX_FOTOS:
        return datos_invalidos({"fotos": f"Puedes subir como máximo {MAX_FOTOS} fotos"})

    limite = settings.max_foto_mb * 1024 * 1024
    contenido = await foto.read(limite + 1)
    if len(contenido) > limite:
        return datos_invalidos({"fotos": f"Cada foto debe pesar como máximo {settings.max_foto_mb} MB"})
    extension = tipo_imagen(contenido)
    if extension not in FORMATOS_FOTO:
        return datos_invalidos({"fotos": "Las fotos deben ser imágenes JPG o PNG"})

    url = await run_in_threadpool(guardar_foto_publicacion, publicacion_id, contenido, extension)
    nueva = {
        "url": url,
        "formato": extension,
        "tamano_bytes": len(contenido),
        "es_principal": not fotos,
        "orden": len(fotos),
        "fecha_subida": datetime.now(timezone.utc),
    }
    # La condición sobre el largo evita pasarse de 5 si llegan dos subidas a la vez
    resultado = await db.publicaciones.update_one(
        {"_id": doc["_id"], f"fotos.{MAX_FOTOS - 1}": {"$exists": False}},
        {"$push": {"fotos": nueva}},
    )
    if not resultado.modified_count:
        await run_in_threadpool(borrar_foto, url)
        return datos_invalidos({"fotos": f"Puedes subir como máximo {MAX_FOTOS} fotos"})
    return {"mensaje": "Foto agregada", "foto": {"url": url, "es_principal": nueva["es_principal"]}}


async def reordenar_fotos(publicacion_id: ObjectId, fotos: list[dict]) -> None:
    """Deja el orden correlativo y garantiza que haya una foto principal si quedan fotos."""
    if fotos and not any(f["es_principal"] for f in fotos):
        fotos[0]["es_principal"] = True
    for orden, foto in enumerate(fotos):
        foto["orden"] = orden
    await db.publicaciones.update_one({"_id": publicacion_id}, {"$set": {"fotos": fotos}})


@router.delete("/{publicacion_id}/fotos/{nombre}")
async def quitar_foto(publicacion_id: str, nombre: str, usuario: dict = Depends(usuario_actual)):
    doc = await buscar_propia(publicacion_id, usuario)
    fotos = doc.get("fotos", [])
    quitada = next((f for f in fotos if f["url"].rsplit("/", 1)[-1] == nombre), None)
    if not quitada:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Foto no encontrada")

    await reordenar_fotos(doc["_id"], [f for f in fotos if f is not quitada])
    await run_in_threadpool(borrar_foto, quitada["url"])
    return {"mensaje": "Foto eliminada"}


@router.put("/{publicacion_id}/fotos/{nombre}/principal")
async def elegir_principal(publicacion_id: str, nombre: str, usuario: dict = Depends(usuario_actual)):
    """La foto principal es la que se muestra en los listados."""
    doc = await buscar_propia(publicacion_id, usuario)
    fotos = doc.get("fotos", [])
    if not any(f["url"].rsplit("/", 1)[-1] == nombre for f in fotos):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Foto no encontrada")

    for foto in fotos:
        foto["es_principal"] = foto["url"].rsplit("/", 1)[-1] == nombre
    # La principal pasa al primer lugar
    fotos.sort(key=lambda f: not f["es_principal"])
    await reordenar_fotos(doc["_id"], fotos)
    return {"mensaje": "Foto principal actualizada"}
