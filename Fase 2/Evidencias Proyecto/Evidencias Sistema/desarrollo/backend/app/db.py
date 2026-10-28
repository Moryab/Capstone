from pymongo import ASCENDING, GEOSPHERE, AsyncMongoClient, ReturnDocument

from app.config import settings

client = AsyncMongoClient(settings.mongo_uri, tz_aware=True)
db = client[settings.mongo_db]


async def siguiente_codigo(coleccion: str) -> int:
    """Devuelve el siguiente código autoincremental usando la colección contadores."""
    doc = await db.contadores.find_one_and_update(
        {"_id": coleccion},
        {"$inc": {"secuencia": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return doc["secuencia"]


async def crear_indices() -> None:
    """Índices definidos en el modelo de datos. Si ya existen, Mongo no hace nada."""
    await db.usuarios.create_index([("correo", ASCENDING)], unique=True, name="correo_1")
    # Antes el RUT era opcional y su índice era parcial; ahora se pide en el registro (CA-01.1)
    indices = await db.usuarios.index_information()
    if "partialFilterExpression" in indices.get("rut_1", {}):
        await db.usuarios.drop_index("rut_1")
    await db.usuarios.create_index([("rut", ASCENDING)], unique=True, name="rut_1")

    await db.comunas.create_index([("codigo", ASCENDING)], unique=True, name="codigo_1")
    await db.comunas.create_index([("centro", GEOSPHERE)], name="centro_2dsphere")
    await db.instituciones.create_index([("codigo", ASCENDING)], unique=True, name="codigo_1")
    await db.instituciones.create_index(
        [("sedes.coordenadas", GEOSPHERE)], name="sedes.coordenadas_2dsphere"
    )
