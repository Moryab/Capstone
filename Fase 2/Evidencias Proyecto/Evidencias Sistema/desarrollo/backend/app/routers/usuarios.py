from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, status

from app.db import db
from app.deps import usuario_actual
from app.schemas.perfil import PerfilPublicoOut

router = APIRouter(prefix="/api/usuarios", tags=["Usuarios"])

PERFIL_NO_DISPONIBLE = HTTPException(status.HTTP_404_NOT_FOUND, "Perfil no disponible")


@router.get("/{usuario_id}/perfil", response_model=PerfilPublicoOut)
async def ver_perfil_publico(usuario_id: str, actual: dict = Depends(usuario_actual)):
    """HU-16: perfil de otro estudiante, sin sus datos privados (CA-16.3)."""
    try:
        oid = ObjectId(usuario_id)
    except InvalidId:
        raise PERFIL_NO_DISPONIBLE

    doc = await db.usuarios.find_one({"_id": oid})
    # CA-16.4: las cuentas suspendidas se tratan igual que las que no existen
    if not doc or doc["estado_cuenta"] in ("suspendida", "inhabilitada"):
        raise PERFIL_NO_DISPONIBLE

    institucion_id = doc.get("perfil", {}).get("institucion_id")
    institucion = (
        await db.instituciones.find_one({"_id": institucion_id}, {"nombre": 1, "sigla": 1})
        if institucion_id
        else None
    )
    return PerfilPublicoOut.desde_doc(doc, institucion, es_propio=doc["_id"] == actual["_id"])
