from pymongo import AsyncMongoClient, ReturnDocument

from app.config import settings

client = AsyncMongoClient(settings.mongo_uri)
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
