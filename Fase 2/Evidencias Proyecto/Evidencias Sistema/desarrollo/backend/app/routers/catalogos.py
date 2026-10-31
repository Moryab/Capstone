from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter

from app.db import db
from app.schemas.perfil import REGIONES

router = APIRouter(prefix="/api/catalogos", tags=["Catálogos"])


async def ids_comunas(ids: list[str]) -> list[ObjectId] | None:
    """Los ids como ObjectId, o None si alguno no corresponde a una comuna."""
    try:
        oids = list({ObjectId(i) for i in ids})
    except InvalidId:
        return None
    if await db.comunas.count_documents({"_id": {"$in": oids}}) != len(oids):
        return None
    return oids


async def comunas_cerca_de(usuario: dict) -> list[ObjectId] | None:
    """CA-11.3: comunas cercanas a la sede del perfil, según las zonas cargadas en instituciones.

    Si la sede no calza con ninguna, se usan las de todas las sedes de la institución.
    La usan la búsqueda de alojamientos y las propuestas de match (preferencia «Cerca de tu sede»).
    """
    perfil = usuario.get("perfil", {})
    if not perfil.get("institucion_id"):
        return None
    institucion = await db.instituciones.find_one({"_id": perfil["institucion_id"]})
    if not institucion:
        return None
    sedes = institucion.get("sedes", [])
    sedes = [s for s in sedes if s["nombre"] == perfil.get("sede")] or sedes
    return list({c for s in sedes for c in s.get("comunas_cercanas_ids", [])})


@router.get("/perfil")
async def catalogo_perfil():
    """Opciones de las listas desplegables del formulario de perfil (HU-03)."""
    instituciones = [
        {
            "id": str(inst["_id"]),
            "nombre": inst["nombre"],
            "sigla": inst["sigla"],
            "sedes": [sede["nombre"] for sede in inst.get("sedes", [])],
        }
        async for inst in db.instituciones.find({"activa": True}).sort("nombre")
    ]
    return {"regiones": REGIONES, "instituciones": instituciones}


@router.get("/publicacion")
async def catalogo_publicacion():
    """Comunas para la ubicación del alojamiento (CA-06.2)."""
    comunas = [
        {"id": str(c["_id"]), "nombre": c["nombre"], "sector": c["sector"]}
        async for c in db.comunas.find().sort("nombre")
    ]
    return {"comunas": comunas}
