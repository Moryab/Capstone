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
from app.deps import solo_admin, usuario_actual
from app.routers.verificacion import nombre_completo
from app.schemas.reportes import (
    ESTADOS_REPORTE, AccionReporteOut, ElementoReportadoOut, EstadoReporte, OtroReporteOut, PersonaReporteOut, ReporteDetalleOut,
    ReporteFilaOut, ReporteIn, ReportePerfilIn, ReportePublicacionIn, TipoElemento,
)

router = APIRouter(prefix="/api/reportes", tags=["Reportes"])

PERFIL_NO_DISPONIBLE = HTTPException(status.HTTP_404_NOT_FOUND, "Perfil no disponible")
PUBLICACION_NO_ENCONTRADA = HTTPException(status.HTTP_404_NOT_FOUND, "Publicación no encontrada")
REPORTE_NO_ENCONTRADO = HTTPException(status.HTTP_404_NOT_FOUND, "Reporte no encontrado")


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


# ---------- HU-26: revisión de los reportes por un administrador ----------


async def nombres_reportados(reportes: list[dict]) -> dict:
    """El nombre de cada perfil y el título de cada publicación de la lista, por su id."""
    def ids(tipo: str) -> list[ObjectId]:
        return [r["elemento_reportado_id"] for r in reportes if r["tipo_elemento"] == tipo]

    nombres = {
        u["_id"]: nombre_completo(u)
        async for u in db.usuarios.find(
            {"_id": {"$in": ids("usuario")}}, {"nombre": 1, "ap_paterno": 1, "ap_materno": 1}
        )
    }
    async for p in db.publicaciones.find({"_id": {"$in": ids("publicacion")}}, {"titulo": 1}):
        nombres[p["_id"]] = p["titulo"]
    return nombres


@router.get("", response_model=list[ReporteFilaOut])
async def listar_reportes(
    estado: EstadoReporte | None = None, tipo: TipoElemento | None = None, _admin: dict = Depends(solo_admin)
):
    """CA-26.1: primero los pendientes, de los más antiguos a los más recientes; después el resto."""
    filtro = {
        **({"estado": estado} if estado else {}),
        **({"tipo_elemento": tipo} if tipo else {}),
    }
    reportes = [
        r
        async for r in await db.reportes.aggregate([
            {"$match": filtro},
            {"$addFields": {"prioridad": {"$indexOfArray": [list(ESTADOS_REPORTE), "$estado"]}}},
            {"$sort": {"prioridad": 1, "fecha_reporte": 1}},
            {"$limit": 500},
        ])
    ]
    nombres = await nombres_reportados(reportes)
    return [
        ReporteFilaOut(
            id=str(r["_id"]),
            codigo=r["codigo"],
            tipo_elemento=r["tipo_elemento"],
            reportado=nombres.get(r["elemento_reportado_id"]),
            motivo=r["motivo"],
            estado=r["estado"],
            fecha_reporte=r["fecha_reporte"],
        )
        for r in reportes
    ]


async def buscar_reporte(reporte_id: str) -> dict:
    try:
        oid = ObjectId(reporte_id)
    except InvalidId:
        raise REPORTE_NO_ENCONTRADO
    reporte = await db.reportes.find_one({"_id": oid})
    if not reporte:
        raise REPORTE_NO_ENCONTRADO
    return reporte


async def persona(usuario_id: ObjectId | None) -> PersonaReporteOut | None:
    doc = usuario_id and await db.usuarios.find_one(
        {"_id": usuario_id}, {"nombre": 1, "ap_paterno": 1, "ap_materno": 1, "correo": 1}
    )
    if not doc:
        return None
    return PersonaReporteOut(id=str(doc["_id"]), nombre=nombre_completo(doc), correo=doc["correo"])


async def elemento_reportado(reporte: dict) -> ElementoReportadoOut | None:
    """Resumen de lo reportado. Incluye lo que un estudiante ya no puede ver, como una publicación
    eliminada: el administrador debe poder revisarlo igual."""
    oid = reporte["elemento_reportado_id"]
    if reporte["tipo_elemento"] == "usuario":
        doc = await db.usuarios.find_one({"_id": oid})
        return doc and ElementoReportadoOut(
            id=str(oid),
            titulo=nombre_completo(doc),
            estado=doc["estado_cuenta"],
            correo=doc["correo"],
            verificacion_estado=doc.get("verificacion", {}).get("estado", "no_verificado"),
        )
    doc = await db.publicaciones.find_one({"_id": oid})
    return doc and ElementoReportadoOut(
        id=str(oid),
        titulo=doc["titulo"],
        estado=doc["estado"],
        comuna=doc["ubicacion"]["comuna_nombre"],
        costo_mensual=doc["costo_mensual"],
        oferente=await persona(doc["oferente_id"]),
    )


async def accion_del_reporte(reporte: dict) -> AccionReporteOut | None:
    """La acción con que se resolvió el reporte (HU-27)."""
    accion_id = reporte.get("accion_moderacion_id")
    accion = accion_id and await db.acciones_moderacion.find_one({"_id": accion_id})
    if not accion:
        return None
    return AccionReporteOut(
        accion=accion["accion"],
        justificacion=accion["justificacion"],
        fecha_accion=accion["fecha_accion"],
        admin=await persona(accion["admin_id"]),
    )


@router.get("/{reporte_id}", response_model=ReporteDetalleOut)
async def ver_reporte(reporte_id: str, _admin: dict = Depends(solo_admin)):
    """CA-26.2: quién reportó, lo reportado y los otros reportes del mismo elemento."""
    reporte = await buscar_reporte(reporte_id)
    otros = [
        OtroReporteOut(
            id=str(o["_id"]), codigo=o["codigo"], motivo=o["motivo"], estado=o["estado"],
            fecha_reporte=o["fecha_reporte"],
        )
        async for o in db.reportes.find({
            "tipo_elemento": reporte["tipo_elemento"],
            "elemento_reportado_id": reporte["elemento_reportado_id"],
            "_id": {"$ne": reporte["_id"]},
        }).sort("fecha_reporte", -1)
    ]
    return ReporteDetalleOut(
        id=str(reporte["_id"]),
        codigo=reporte["codigo"],
        tipo_elemento=reporte["tipo_elemento"],
        motivo=reporte["motivo"],
        descripcion=reporte.get("descripcion"),
        estado=reporte["estado"],
        fecha_reporte=reporte["fecha_reporte"],
        fecha_toma_revision=reporte.get("fecha_toma_revision"),
        reportante=await persona(reporte["reportante_id"]),
        admin_revisor=await persona(reporte.get("admin_revisor_id")),
        elemento=await elemento_reportado(reporte),
        otros_reportes=otros,
        resolucion=reporte.get("resolucion"),
        accion=await accion_del_reporte(reporte),
    )


@router.post("/{reporte_id}/tomar")
async def tomar_reporte(reporte_id: str, admin: dict = Depends(solo_admin)):
    """CA-26.3: solo si sigue pendiente, para que dos administradores no tomen el mismo reporte."""
    reporte = await buscar_reporte(reporte_id)
    resultado = await db.reportes.update_one(
        {"_id": reporte["_id"], "estado": "pendiente"},
        {"$set": {
            "estado": "en_revision",
            "admin_revisor_id": admin["_id"],
            "fecha_toma_revision": datetime.now(timezone.utc),
        }},
    )
    if not resultado.modified_count:
        raise HTTPException(status.HTTP_409_CONFLICT, "Este reporte ya no está pendiente")
    return {"mensaje": "Tomaste este reporte para revisión"}
