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
    es_propio = doc["_id"] == actual["_id"]
    # El teléfono solo se comparte cuando ambos aceptaron el match (CA-17.2)
    con_match = await db.matches.find_one({
        "estado": "confirmado",
        "$or": [
            {"usuario_a_id": actual["_id"], "usuario_b_id": doc["_id"]},
            {"usuario_a_id": doc["_id"], "usuario_b_id": actual["_id"]},
        ],
    }, {"_id": 1})
    return PerfilPublicoOut.desde_doc(
        doc, institucion, es_propio=es_propio, con_contacto=es_propio or con_match is not None
    )
