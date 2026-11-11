from pymongo import AsyncMongoClient, ReturnDocument

from app.config import settings

client = AsyncMongoClient(settings.mongo_uri, tz_aware=True)
db = client[settings.mongo_db]


async def siguiente_codigo(coleccion: str, cantidad: int = 1) -> int:
    """Devuelve el siguiente código autoincremental usando la colección contadores.

    Con `cantidad` reserva varios seguidos y devuelve el primero.
    """
    doc = await db.contadores.find_one_and_update(
        {"_id": coleccion},
        {"$inc": {"secuencia": cantidad}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return doc["secuencia"] - cantidad + 1

