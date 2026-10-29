from pymongo import ASCENDING, DESCENDING, GEOSPHERE, AsyncMongoClient, ReturnDocument

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

    await db.publicaciones.create_index([("codigo", ASCENDING)], unique=True, name="codigo_1")
    await db.publicaciones.create_index(
        [("ubicacion.coordenadas", GEOSPHERE)], name="ubicacion.coordenadas_2dsphere"
    )
    await db.publicaciones.create_index(
        [("estado", ASCENDING), ("costo_mensual", ASCENDING), ("ubicacion.comuna_id", ASCENDING)],
        name="estado_1_costo_mensual_1_ubicacion.comuna_id_1",
    )
    # Listado de alojamientos: activos, del más reciente al más antiguo (CA-09.1)
    await db.publicaciones.create_index(
        [("estado", ASCENDING), ("fecha_publicacion", DESCENDING)],
        name="estado_1_fecha_publicacion_-1",
    )

    # Cambios del cuestionario de hábitos (HU-13), según el modelo de datos
    await db.historial_cuestionario.create_index([("codigo", ASCENDING)], unique=True, name="codigo_1")
    await db.historial_cuestionario.create_index(
        [("usuario_id", ASCENDING), ("fecha", DESCENDING)], name="usuario_id_1_fecha_-1"
    )

    # Compatibilidad entre pares de estudiantes (HU-14)
    await db.compatibilidades.create_index([("codigo", ASCENDING)], unique=True, name="codigo_1")
    await db.compatibilidades.create_index(
        [("usuario_a_id", ASCENDING), ("usuario_b_id", ASCENDING), ("vigente", ASCENDING)],
        name="usuario_a_id_1_usuario_b_id_1_vigente_1",
    )
    # Para buscar los cálculos donde el usuario quedó como usuario_b (no está en el modelo de datos)
    await db.compatibilidades.create_index(
        [("usuario_b_id", ASCENDING), ("vigente", ASCENDING)], name="usuario_b_id_1_vigente_1"
    )
