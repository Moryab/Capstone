"""EP-07 · HU-28 y HU-29: listados de usuarios y publicaciones para el administrador.

Archivo de esta área: solo lo edita quien tiene estas historias. Las rutas de administración usan
Depends(solo_admin) (app/deps.py) y los avisos al usuario se envían con app.notificaciones.notificar.
"""

import re
from collections import Counter
from datetime import date, datetime, time, timedelta
from typing import Literal
from zoneinfo import ZoneInfo

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse

from app.db import db
from app.deps import solo_admin
from app.modos import CambioNoPermitido, Modo, cambiar_modo, resumen_cambio
from app.notificaciones import notificar
from app.routers.moderacion import registrar_accion
from app.schemas.moderacion import JustificacionIn
from app.routers.verificacion import POR_REVISAR, fechas_revocacion, nombre_completo
from app.schemas.admin import (
    EliminacionOut, EstadoCuenta, EstadoPublicacion, EstadoVerificacion, PublicacionFilaOut, PublicacionUsuarioOut,
    ReporteRecibidoOut, SolicitudUsuarioOut, SuspensionOut, UsuarioDetalleOut, UsuarioFilaOut, UsuarioPerfilOut,
)

router = APIRouter(prefix="/api/admin", tags=["Administración"])

TAMANO_PAGINA = 20
REPORTES_ABIERTOS = ["pendiente", "en_revision"]
ZONA = ZoneInfo("America/Santiago")
DIAS_ACTIVIDAD = 7


async def contar_por_dia(coleccion, campo: str, desde: datetime, filtro: dict | None = None) -> Counter:
    """Cuántos documentos hay por día (hora de Chile) desde `desde`, según la fecha `campo`."""
    dias = Counter()
    async for doc in coleccion.find({campo: {"$gte": desde}, **(filtro or {})}, {campo: 1}):
        fecha = doc[campo]
        if fecha.tzinfo is None:  # Mongo devuelve UTC sin zona
            fecha = fecha.replace(tzinfo=ZoneInfo("UTC"))
        dias[fecha.astimezone(ZONA).date().isoformat()] += 1
    return dias


@router.get("/resumen")
async def resumen(_admin: dict = Depends(solo_admin)):
    """Lo que espera revisión (contadores de la barra lateral y saludo del panel) y la actividad de
    los últimos 7 días: registros, publicaciones y reportes nuevos por día."""
    hoy = datetime.now(ZONA).date()
    dias = [hoy - timedelta(days=i) for i in range(DIAS_ACTIVIDAD - 1, -1, -1)]
    desde = datetime.combine(dias[0], time.min, ZONA)
    registros = await contar_por_dia(db.usuarios, "fecha_registro", desde, {"rol": "estudiante"})
    publicaciones = await contar_por_dia(db.publicaciones, "fecha_publicacion", desde)
    reportes = await contar_por_dia(db.reportes, "fecha_reporte", desde)
    return {
        "reportes_pendientes": await db.reportes.count_documents({"estado": {"$in": REPORTES_ABIERTOS}}),
        # El mismo total, separado: el saludo del panel los muestra por tipo
        "reportes_pendientes_perfiles": await db.reportes.count_documents(
            {"estado": {"$in": REPORTES_ABIERTOS}, "tipo_elemento": "usuario"}),
        "reportes_pendientes_publicaciones": await db.reportes.count_documents(
            {"estado": {"$in": REPORTES_ABIERTOS}, "tipo_elemento": "publicacion"}),
        "verificaciones_pendientes": await db.solicitudes_verificacion.count_documents({"estado": {"$in": POR_REVISAR}}),
        "actividad": [
            {
                "dia": d.isoformat(),
                "registros": registros.get(d.isoformat(), 0),
                "publicaciones": publicaciones.get(d.isoformat(), 0),
                "reportes": reportes.get(d.isoformat(), 0),
            }
            for d in dias
        ],
    }


async def motivos_principales(tipo: str, cuantos: int = 3) -> list[dict]:
    return [
        {"motivo": m["_id"], "cantidad": m["cantidad"]}
        async for m in await db.reportes.aggregate([
            {"$match": {"tipo_elemento": tipo}},
            {"$group": {"_id": "$motivo", "cantidad": {"$sum": 1}}},
            {"$sort": {"cantidad": -1, "_id": 1}},
            {"$limit": cuantos},
        ])
    ]


@router.get("/moderacion/resumen")
async def resumen_moderacion(
    dias: int = Query(default=30, ge=1, le=365),
    tipo: Literal["usuario", "publicacion"] | None = None,
    _admin: dict = Depends(solo_admin),
):
    """Cifras de arriba de «Reportes» y «Verificaciones»: lo que espera revisión y lo resuelto en
    los últimos `dias` días. Con `tipo`, las de reportes cuentan solo perfiles o publicaciones."""
    desde = datetime.now(ZONA) - timedelta(days=dias)
    de_tipo = {"tipo_elemento": tipo} if tipo else {}
    return {
        "dias": dias,
        "reportes": {
            "pendientes": await db.reportes.count_documents({**de_tipo, "estado": "pendiente"}),
            "en_revision": await db.reportes.count_documents({**de_tipo, "estado": "en_revision"}),
            "resueltos": await db.reportes.count_documents({**de_tipo, "estado": "resuelto", "fecha_resolucion": {"$gte": desde}}),
            "total": await db.reportes.count_documents(de_tipo),
            "resueltos_total": await db.reportes.count_documents({**de_tipo, "estado": "resuelto"}),
            # Para la barra perfiles / publicaciones: siempre de los dos tipos
            "por_tipo": {t: await db.reportes.count_documents({"tipo_elemento": t}) for t in ("usuario", "publicacion")},
            # Los 3 motivos más reportados de cada tipo
            "motivos": {t: await motivos_principales(t) for t in ("usuario", "publicacion")},
            # Desde cuándo espera el pendiente más antiguo (de los dos tipos), para avisar si se demora
            "pendiente_mas_antiguo": (await db.reportes.find_one(
                {"estado": "pendiente"}, {"fecha_reporte": 1}, sort=[("fecha_reporte", 1)]
            ) or {}).get("fecha_reporte"),
        },
        "verificaciones": {
            "pendientes": await db.solicitudes_verificacion.count_documents({"estado": {"$in": POR_REVISAR}}),
            # Las aprobadas que después se revocaron se cuentan como revocadas, igual que en el historial
            "aprobadas": await db.solicitudes_verificacion.count_documents(
                {"estado": "aprobada", "fecha_revision": {"$gte": desde}, "revocacion": {"$exists": False}}
            ),
            "rechazadas": await db.solicitudes_verificacion.count_documents({"estado": "rechazada", "fecha_revision": {"$gte": desde}}),
            # Verificaciones quitadas después de aprobarse (CA-23.4), con o sin solicitud
            "revocadas": sum(f >= desde for f in await fechas_revocacion()),
        },
    }


def patron_rut(palabra: str) -> str | None:
    """Si la palabra parece un RUT (o un trozo), el patrón que lo encuentra tal como se guarda
    (12345678-K) aunque se escriba con puntos, sin guion o en minúscula: «12.345.678-k», «12345678k»
    o «345678»."""
    limpio = re.sub(r"[.\-]", "", palabra).upper()
    if not re.fullmatch(r"\d{4,}[\dK]?", limpio):
        return None
    return "-?".join(re.escape(c) for c in limpio)


def filtro_busqueda(texto: str, campos: tuple[str, ...], campo_rut: str | None = None) -> list[dict]:
    """Cada palabra debe aparecer en alguno de los campos: así «ana pérez» encuentra a quien tiene
    el nombre y el apellido en campos distintos. Se escapa para que el texto no se lea como regex.
    Con `campo_rut`, las palabras que parecen un RUT también se buscan ahí."""
    condiciones = []
    for palabra in texto.split():
        opciones = [{campo: {"$regex": re.escape(palabra), "$options": "i"}} for campo in campos]
        if campo_rut and (patron := patron_rut(palabra)):
            opciones.append({campo_rut: {"$regex": patron}})
        condiciones.append({"$or": opciones})
    return condiciones


@router.get("/usuarios")
async def listar_usuarios(
    buscar: str = Query(default="", max_length=100),
    verificacion: EstadoVerificacion | None = None,
    cuenta: EstadoCuenta | None = None,
    genero: Literal["femenino", "masculino", "no_binario"] | None = None,
    modo: Literal["buscador", "oferente", "sin_rol"] | None = None,
    desde: date | None = None,
    hasta: date | None = None,
    pagina: int = Query(default=1, ge=1),
    _admin: dict = Depends(solo_admin),
):
    """HU-28: estudiantes registrados, del más reciente al más antiguo. El buscador y los filtros se
    combinan (CA-28.2 y CA-28.3)."""
    consulta: dict = {"rol": "estudiante"}
    if verificacion == "no_verificado":  # las cuentas antiguas pueden no tener el campo
        consulta["verificacion.estado"] = {"$in": ["no_verificado", None]}
    elif verificacion:
        consulta["verificacion.estado"] = verificacion
    if cuenta:
        consulta["estado_cuenta"] = cuenta
    if genero:
        consulta["genero"] = genero
    # Fecha de registro entre `desde` y `hasta`, ambos días completos en hora de Chile
    if desde or hasta:
        rango = {}
        if desde:
            rango["$gte"] = datetime.combine(desde, time.min, ZONA)
        if hasta:
            rango["$lt"] = datetime.combine(hasta + timedelta(days=1), time.min, ZONA)
        consulta["fecha_registro"] = rango
    if modo == "sin_rol":  # aún no elige si busca u ofrece alojamiento
        consulta["modo"] = None
    elif modo:
        consulta["modo"] = modo
    if condiciones := filtro_busqueda(buscar, ("nombre", "ap_paterno", "ap_materno", "correo"), campo_rut="rut"):
        consulta["$and"] = condiciones

    total = await db.usuarios.count_documents(consulta)
    cursor = (
        db.usuarios.find(consulta, {
            "nombre": 1, "ap_paterno": 1, "ap_materno": 1, "correo": 1, "rut": 1, "modo": 1, "genero": 1, "verificacion.estado": 1,
            "estado_cuenta": 1, "fecha_registro": 1, "perfil.foto_url": 1,
        })
        .sort([("fecha_registro", -1), ("_id", -1)])
        .skip((pagina - 1) * TAMANO_PAGINA)
        .limit(TAMANO_PAGINA)
    )
    # Resumen de todos los estudiantes (sin filtros): sirve también como filtro rápido
    estudiantes = {"rol": "estudiante"}
    resumen = {
        "total": await db.usuarios.count_documents(estudiantes),
        "verificados": await db.usuarios.count_documents({**estudiantes, "verificacion.estado": "verificado"}),
        "pendientes": await db.usuarios.count_documents({**estudiantes, "verificacion.estado": "pendiente"}),
        "suspendidos": await db.usuarios.count_documents({**estudiantes, "estado_cuenta": "suspendida"}),
    }
    return {
        "total": total,
        "pagina": pagina,
        "paginas": max(1, -(-total // TAMANO_PAGINA)),
        "resumen": resumen,
        "resultados": [
            UsuarioFilaOut(
                id=str(u["_id"]),
                nombre=nombre_completo(u),
                correo=u["correo"],
                rut=rut_parcial(u.get("rut")),
                modo=u.get("modo"),
                genero=u.get("genero"),
                verificacion_estado=u.get("verificacion", {}).get("estado", "no_verificado"),
                estado_cuenta=u["estado_cuenta"],
                fecha_registro=u["fecha_registro"],
                foto_url=u.get("perfil", {}).get("foto_url"),
            )
            async for u in cursor
        ],
    }


def rut_parcial(rut: str | None) -> str | None:
    """12345678-K → ••.•••.678-K. Para gestionar la cuenta basta con reconocerlo; el RUT completo
    solo se muestra al revisar una solicitud de verificación, donde se compara con el comprobante."""
    if not rut or "-" not in rut:
        return rut
    cuerpo, dv = rut.rsplit("-", 1)
    return f"••.•••.{cuerpo[-3:]}-{dv}"


def perfil_de(usuario: dict, institucion: str | None) -> UsuarioPerfilOut:
    perfil = usuario.get("perfil", {})
    suspension = usuario.get("suspension")
    fecha_nac = usuario.get("fecha_nac")
    return UsuarioPerfilOut(
        id=str(usuario["_id"]),
        rut=rut_parcial(usuario.get("rut")),
        modo=usuario.get("modo"),
        nombre=usuario["nombre"],
        ap_paterno=usuario.get("ap_paterno"),
        nombre_completo=nombre_completo(usuario),
        correo=usuario["correo"],
        telefono=perfil.get("telefono"),
        fecha_nac=fecha_nac.date() if fecha_nac else None,
        genero=usuario.get("genero"),
        foto_url=perfil.get("foto_url"),
        institucion=institucion,
        sede=perfil.get("sede"),
        carrera=perfil.get("carrera"),
        anio_ingreso=perfil.get("anio_ingreso"),
        ciudad_origen=perfil.get("ciudad_origen"),
        region_origen=perfil.get("region_origen"),
        descripcion=perfil.get("descripcion"),
        verificacion_estado=usuario.get("verificacion", {}).get("estado", "no_verificado"),
        estado_cuenta=usuario["estado_cuenta"],
        advertencias_recibidas=usuario.get("advertencias_recibidas", 0),
        fecha_registro=usuario["fecha_registro"],
        suspension=SuspensionOut(motivo=suspension.get("motivo"), fecha=suspension.get("fecha")) if suspension else None,
        eliminacion=EliminacionOut(**usuario["eliminacion"]) if usuario.get("eliminacion") else None,
    )


class CambioRolIn(JustificacionIn):
    """Cambio de rol hecho por un administrador: queda registrado con su justificación."""

    modo: Modo


TEXTO_MODO = {"buscador": "buscador", "oferente": "oferente"}


async def estudiante_para_rol(usuario_id: str) -> dict:
    try:
        oid = ObjectId(usuario_id)
    except InvalidId:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    usuario = await db.usuarios.find_one({"_id": oid})
    if not usuario:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    if usuario["rol"] != "estudiante":
        raise HTTPException(status.HTTP_409_CONFLICT, "Solo los estudiantes tienen rol de buscador u oferente")
    if usuario["estado_cuenta"] == "eliminada":
        raise HTTPException(status.HTTP_409_CONFLICT, "La cuenta está eliminada")
    return usuario


@router.get("/usuarios/{usuario_id}/rol")
async def ver_cambio_rol(usuario_id: str, _admin: dict = Depends(solo_admin)):
    """Rol actual y lo que pasaría al cambiarlo (publicaciones que se pausan, propuestas que se
    cierran), para explicárselo al administrador antes de confirmar. Misma lógica que usa el
    estudiante al cambiarlo él mismo (modos.py)."""
    return await resumen_cambio(await estudiante_para_rol(usuario_id))


@router.put("/usuarios/{usuario_id}/rol")
async def cambiar_rol(usuario_id: str, datos: CambioRolIn, admin: dict = Depends(solo_admin)):
    """Cambia el rol buscador/oferente de un estudiante, por ejemplo si quedó en el equivocado. Con
    una convivencia activa no se puede (igual que para el estudiante). Se registra como acción de
    moderación y se le avisa al estudiante."""
    usuario = await estudiante_para_rol(usuario_id)
    anterior = usuario.get("modo")
    if anterior == datos.modo:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Ya tiene el rol de {TEXTO_MODO[datos.modo]}")
    try:
        resultado = await cambiar_modo(usuario, datos.modo)
    except CambioNoPermitido:
        raise HTTPException(status.HTTP_409_CONFLICT, "No se puede cambiar el rol mientras tenga una convivencia activa")

    ahora = datetime.now(ZONA)
    avisar = usuario["estado_cuenta"] == "activa"
    await registrar_accion(
        ObjectId(), "cambiar_rol", admin, ("usuario", usuario["_id"]), datos.justificacion,
        (anterior, datos.modo), [], ahora, afectado_notificado=avisar,
    )
    detalle = ""
    if resultado.get("publicaciones_pausadas"):
        n = resultado["publicaciones_pausadas"]
        detalle = f" {'Tu publicación quedó pausada' if n == 1 else f'Tus {n} publicaciones quedaron pausadas'}."
    if avisar:
        await notificar(
            usuario["_id"], "accion_moderacion", "Tu rol en RoomMatch cambió",
            f"Un administrador cambió tu rol a {TEXTO_MODO[datos.modo]}.{detalle} "
            f"Motivo: {datos.justificacion.rstrip('.')}.",
            ("usuario", usuario["_id"]),
        )
    nombre = " ".join(p.capitalize() for p in nombre_completo(usuario).split())
    return {**resultado, "mensaje": f"{nombre} ahora es {TEXTO_MODO[datos.modo]}"}


@router.get("/usuarios/{usuario_id}", response_model=UsuarioDetalleOut)
async def ver_usuario(usuario_id: str, _admin: dict = Depends(solo_admin)):
    """CA-28.4: ficha del usuario, con todas sus publicaciones (también ocultas o eliminadas)."""
    try:
        oid = ObjectId(usuario_id)
    except InvalidId:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    usuario = await db.usuarios.find_one({"_id": oid})
    if not usuario:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")

    institucion_id = usuario.get("perfil", {}).get("institucion_id")
    institucion = institucion_id and await db.instituciones.find_one({"_id": institucion_id}, {"nombre": 1})
    return UsuarioDetalleOut(
        perfil=perfil_de(usuario, institucion and institucion["nombre"]),
        publicaciones=[
            PublicacionUsuarioOut(
                id=str(p["_id"]), titulo=p["titulo"], estado=p["estado"], costo_mensual=p["costo_mensual"],
                comuna=p["ubicacion"].get("comuna_nombre"), fecha_publicacion=p["fecha_publicacion"],
                cantidad_reportes=p.get("cantidad_reportes", 0),
            )
            async for p in db.publicaciones.find({"oferente_id": oid}).sort("fecha_publicacion", -1)
        ],
        # Incluye los reportes de sus publicaciones. Quién reportó se ve en el detalle de cada reporte
        reportes=[
            ReporteRecibidoOut(
                id=str(r["_id"]), codigo=r["codigo"], tipo_elemento=r["tipo_elemento"], motivo=r["motivo"],
                estado=r["estado"], fecha_reporte=r["fecha_reporte"],
            )
            async for r in db.reportes.find({"usuario_reportado": oid}).sort("fecha_reporte", -1)
        ],
        solicitudes=[
            SolicitudUsuarioOut(
                id=str(s["_id"]), codigo=s["codigo"], tipo_comprobante=s["tipo_comprobante"], estado=s["estado"],
                fecha_solicitud=s["fecha_solicitud"],
            )
            async for s in db.solicitudes_verificacion.find({"usuario_id": oid}).sort("fecha_solicitud", -1)
        ],
    )


@router.get("/publicaciones")
async def listar_publicaciones(
    buscar: str = Query(default="", max_length=100),
    estado: EstadoPublicacion | None = None,
    comuna: str | None = None,
    orden: Literal["recientes", "reportes"] = "recientes",
    reportadas: bool = False,
    pagina: int = Query(default=1, ge=1),
    _admin: dict = Depends(solo_admin),
):
    """HU-29: todas las publicaciones, también las eliminadas (CA-29.4). Los filtros, la búsqueda
    por título u oferente y el orden se combinan (CA-29.2)."""
    consulta: dict = {}
    if estado:
        consulta["estado"] = estado
    if reportadas:  # solo las que recibieron algún reporte (filtro rápido «Con reportes»)
        consulta["cantidad_reportes"] = {"$gt": 0}
    if comuna:
        try:
            consulta["ubicacion.comuna_id"] = ObjectId(comuna)
        except InvalidId:
            return JSONResponse(status_code=422, content={
                "detail": "Datos inválidos", "errores": {"comuna": "Selecciona una comuna de la lista"},
            })
    if palabras := filtro_busqueda(buscar, ("nombre", "ap_paterno", "ap_materno", "correo")):
        oferentes = [u["_id"] async for u in db.usuarios.find({"$and": palabras}, {"_id": 1})]
        consulta["$or"] = [
            {"$and": filtro_busqueda(buscar, ("titulo",))},
            {"oferente_id": {"$in": oferentes}},
        ]

    primero = "cantidad_reportes" if orden == "reportes" else "fecha_publicacion"
    total = await db.publicaciones.count_documents(consulta)
    filas = await (
        db.publicaciones.find(consulta, {
            "titulo": 1, "oferente_id": 1, "costo_mensual": 1, "ubicacion.comuna_nombre": 1, "estado": 1,
            "fecha_publicacion": 1, "cantidad_reportes": 1, "fotos": 1, "tipo": 1, "fecha_ultima_modificacion": 1,
        })
        .sort([(primero, -1), ("fecha_publicacion", -1), ("_id", -1)])
        .skip((pagina - 1) * TAMANO_PAGINA)
        .limit(TAMANO_PAGINA)
    ).to_list()

    oferentes = {
        u["_id"]: u
        async for u in db.usuarios.find(
            {"_id": {"$in": [p["oferente_id"] for p in filas]}},
            {"nombre": 1, "ap_paterno": 1, "ap_materno": 1, "perfil.foto_url": 1},
        )
    }

    def foto_principal(p: dict) -> str | None:
        fotos = p.get("fotos", [])
        return next((f["url"] for f in fotos if f.get("es_principal")), fotos[0]["url"] if fotos else None)

    # Resumen de todas las publicaciones (sin filtros): también sirve como filtro rápido
    resumen = {
        "total": await db.publicaciones.count_documents({}),
        "activas": await db.publicaciones.count_documents({"estado": "activa"}),
        "con_reportes": await db.publicaciones.count_documents({"cantidad_reportes": {"$gt": 0}, "estado": {"$ne": "eliminada"}}),
        "ocultas": await db.publicaciones.count_documents({"estado": "suspendida"}),
    }
    return {
        "total": total,
        "pagina": pagina,
        "paginas": max(1, -(-total // TAMANO_PAGINA)),
        "resumen": resumen,
        "resultados": [
            PublicacionFilaOut(
                id=str(p["_id"]),
                titulo=p["titulo"],
                oferente=nombre_completo(oferentes[p["oferente_id"]]) if p["oferente_id"] in oferentes else None,
                costo_mensual=p["costo_mensual"],
                comuna=p["ubicacion"].get("comuna_nombre"),
                estado=p["estado"],
                fecha_publicacion=p["fecha_publicacion"],
                cantidad_reportes=p.get("cantidad_reportes", 0),
                foto_url=foto_principal(p),
                tipo=p.get("tipo"),
                oferente_id=str(p["oferente_id"]) if p["oferente_id"] in oferentes else None,
                oferente_foto=oferentes.get(p["oferente_id"], {}).get("perfil", {}).get("foto_url"),
                fecha_ultima_modificacion=p.get("fecha_ultima_modificacion"),
            )
            for p in filas
        ],
    }
