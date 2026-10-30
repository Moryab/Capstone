"""EP-06 · HU-24, HU-25 y HU-26: reportar perfiles y publicaciones, y la revisión del administrador.

Archivo de esta área: solo lo edita quien tiene estas historias. Las rutas de administración usan
Depends(solo_admin) (app/deps.py) y los avisos al usuario se envían con app.notificaciones.notificar.
"""

from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.db import db, siguiente_codigo
from app.deps import usuario_actual
from app.schemas.reportes import ReporteIn, ReportePerfilIn, ReportePublicacionIn

router = APIRouter(prefix="/api/reportes", tags=["Reportes"])

PERFIL_NO_DISPONIBLE = HTTPException(status.HTTP_404_NOT_FOUND, "Perfil no disponible")
PUBLICACION_NO_ENCONTRADA = HTTPException(status.HTTP_404_NOT_FOUND, "Publicación no encontrada")


async def crear_reporte(
    tipo_elemento: str, elemento_id: ObjectId, reportado_id: ObjectId, reportante: dict, datos: ReporteIn,
    ya_abierto: str,
) -> None:
    """Registra un reporte «pendiente». Nada se le avisa a la persona reportada, que nunca sabe
    quién lo hizo (CA-24.2 y CA-25.2)."""
    try:
        await db.reportes.insert_one({
            "codigo": await siguiente_codigo("reportes"),
            "tipo_elemento": tipo_elemento,
            "elemento_reportado_id": elemento_id,
            "usuario_reportado": reportado_id,
            "reportante_id": reportante["_id"],
            "motivo": datos.motivo,
            "descripcion": datos.descripcion,
            "estado": "pendiente",
            "fecha_reporte": datetime.now(timezone.utc),
            "admin_revisor_id": None,
            "fecha_toma_revision": None,
            "fecha_resolucion": None,
            "resolucion": None,
            "accion_moderacion_id": None,
            "reportante_notificado": False,
        })
    except DuplicateKeyError:
        # CA-24.4 y CA-25.4: el índice reporte_abierto_unico impide dos reportes abiertos del mismo
        # usuario, incluso si se envían al mismo tiempo
        raise HTTPException(status.HTTP_409_CONFLICT, ya_abierto)


@router.post("/perfiles/{usuario_id}", status_code=status.HTTP_201_CREATED)
async def reportar_perfil(
    usuario_id: str, datos: ReportePerfilIn, usuario: dict = Depends(usuario_actual)
):
    """HU-24: reportar el perfil de otra persona."""
    try:
        reportado_id = ObjectId(usuario_id)
    except InvalidId:
        raise PERFIL_NO_DISPONIBLE
    if reportado_id == usuario["_id"]:  # CA-24.5: la opción no se muestra, pero se valida igual
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No puedes reportar tu propio perfil")

    reportado = await db.usuarios.find_one({"_id": reportado_id}, {"estado_cuenta": 1})
    # Igual que al abrir el perfil (CA-16.4), una cuenta suspendida se trata como si no existiera
    if not reportado or reportado["estado_cuenta"] in ("suspendida", "inhabilitada"):
        raise PERFIL_NO_DISPONIBLE

    await crear_reporte(
        "usuario", reportado_id, reportado_id, usuario, datos, "Ya tienes un reporte abierto sobre este perfil"
    )
    return {"mensaje": "Recibimos tu reporte. Un administrador lo revisará"}


@router.post("/publicaciones/{publicacion_id}", status_code=status.HTTP_201_CREATED)
async def reportar_publicacion(
    publicacion_id: str, datos: ReportePublicacionIn, usuario: dict = Depends(usuario_actual)
):
    """HU-25: reportar una publicación ajena. Solo las activas: las demás no se pueden abrir."""
    try:
        oid = ObjectId(publicacion_id)
    except InvalidId:
        raise PUBLICACION_NO_ENCONTRADA
    publicacion = await db.publicaciones.find_one({"_id": oid}, {"oferente_id": 1, "estado": 1})
    if not publicacion:
        raise PUBLICACION_NO_ENCONTRADA
    if publicacion["oferente_id"] == usuario["_id"]:  # CA-25.5
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No puedes reportar tu propia publicación")
    if publicacion["estado"] != "activa":
        raise PUBLICACION_NO_ENCONTRADA

    await crear_reporte(
        "publicacion", oid, publicacion["oferente_id"], usuario, datos,
        "Ya tienes un reporte abierto sobre esta publicación",
    )
    # Contadores del modelo de datos: los usan los listados del administrador (HU-29)
    await db.publicaciones.update_one(
        {"_id": oid}, {"$inc": {"cantidad_reportes": 1, "cantidad_reportes_pendiente": 1}}
    )
    return {"mensaje": "Recibimos tu reporte. Un administrador lo revisará"}
