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
