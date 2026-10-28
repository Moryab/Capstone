from fastapi import APIRouter

from app.db import db
from app.schemas.perfil import REGIONES

router = APIRouter(prefix="/api/catalogos", tags=["Catálogos"])


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
