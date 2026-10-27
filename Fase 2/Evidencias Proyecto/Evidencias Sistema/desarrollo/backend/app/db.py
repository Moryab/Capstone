from pymongo import ASCENDING, AsyncMongoClient, ReturnDocument

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
    # El RUT se pide después del registro, por eso el índice único solo aplica cuando existe
    await db.usuarios.create_index(
        [("rut", ASCENDING)],
        unique=True,
        name="rut_1",
        partialFilterExpression={"rut": {"$type": "string"}},
    )
