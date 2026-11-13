from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, status

from app.db import db
from app.deps import esta_verificado, usuario_actual
from app.schemas.perfil import PerfilPublicoOut
from app.schemas.publicaciones import PublicacionOut

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
    # CA-16.4: las cuentas suspendidas se tratan igual que las que no existen; las que no están
    # verificadas tampoco se les muestran a los demás (su dueño sí ve su perfil)
    if not doc or doc["estado_cuenta"] in ("suspendida", "inhabilitada", "eliminada"):
        raise PERFIL_NO_DISPONIBLE
    if doc["_id"] != actual["_id"] and not esta_verificado(doc):
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
        doc, institucion, es_propio=es_propio, con_contacto=es_propio or con_match is not None,
        situacion=await situacion_de(doc),
    )


async def situacion_de(doc: dict) -> dict:
    """Si la persona ya está en una convivencia confirmada y, si ofrece alojamiento, cuántos cupos le
    quedan. Así quien visita su perfil sabe si aún busca roomie (un buscador en convivencia ya no)."""
    convivencias = await db.matches.count_documents(
        {"estado": "confirmado", "$or": [{"usuario_a_id": doc["_id"]}, {"usuario_b_id": doc["_id"]}]}
    )
    cupos_libres = None
    if doc.get("modo") == "oferente":
        cupos_libres = 0
        async for p in db.publicaciones.find({"oferente_id": doc["_id"], "estado": "activa"}, {"cupos_disponibles": 1}):
            cupos_libres += p.get("cupos_disponibles", 0)
    return {"convivencias": convivencias, "cupos_libres": cupos_libres}


@router.get("/{usuario_id}/publicaciones", response_model=list[PublicacionOut])
async def publicaciones_de(usuario_id: str, actual: dict = Depends(usuario_actual)):
    """Alojamientos que ofrece un estudiante, para mostrarlos en su perfil. Igual que en la búsqueda
    y en el detalle (CA-05.5), los demás solo ven las publicaciones activas; de la más reciente a la
    más antigua."""
    try:
        oid = ObjectId(usuario_id)
    except InvalidId:
        raise PERFIL_NO_DISPONIBLE
    doc = await db.usuarios.find_one({"_id": oid})
    # CA-16.4: las cuentas suspendidas se tratan igual que las que no existen
    if not doc or doc["estado_cuenta"] in ("suspendida", "inhabilitada", "eliminada"):
        raise PERFIL_NO_DISPONIBLE
    es_propio = oid == actual["_id"]
    if not es_propio and not esta_verificado(doc):
        raise PERFIL_NO_DISPONIBLE

    return [
        PublicacionOut.desde_doc(p, es_propia=es_propio, oferente=doc)
        async for p in db.publicaciones.find({"oferente_id": oid, "estado": "activa"}).sort("fecha_publicacion", -1)
    ]
