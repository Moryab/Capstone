"""EP-07 · HU-28 y HU-29: listados de usuarios y publicaciones para el administrador.

Archivo de esta área: solo lo edita quien tiene estas historias. Las rutas de administración usan
Depends(solo_admin) (app/deps.py) y los avisos al usuario se envían con app.notificaciones.notificar.
"""

import re

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.db import db
from app.deps import solo_admin
from app.routers.verificacion import nombre_completo
from app.schemas.admin import (
    EstadoCuenta, EstadoVerificacion, PublicacionUsuarioOut, ReporteRecibidoOut, SolicitudUsuarioOut,
    SuspensionOut, UsuarioDetalleOut, UsuarioFilaOut, UsuarioPerfilOut,
)

router = APIRouter(prefix="/api/admin", tags=["Administración"])

TAMANO_PAGINA = 20


def filtro_busqueda(texto: str, campos: tuple[str, ...]) -> list[dict]:
    """Cada palabra debe aparecer en alguno de los campos: así «ana pérez» encuentra a quien tiene
    el nombre y el apellido en campos distintos. Se escapa para que el texto no se lea como regex."""
    return [
        {"$or": [{campo: {"$regex": re.escape(palabra), "$options": "i"}} for campo in campos]}
        for palabra in texto.split()
    ]


@router.get("/usuarios")
async def listar_usuarios(
    buscar: str = Query(default="", max_length=100),
    verificacion: EstadoVerificacion | None = None,
    cuenta: EstadoCuenta | None = None,
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
    if condiciones := filtro_busqueda(buscar, ("nombre", "ap_paterno", "ap_materno", "correo")):
        consulta["$and"] = condiciones

    total = await db.usuarios.count_documents(consulta)
    cursor = (
        db.usuarios.find(consulta, {
            "nombre": 1, "ap_paterno": 1, "ap_materno": 1, "correo": 1, "verificacion.estado": 1,
            "estado_cuenta": 1, "fecha_registro": 1,
        })
        .sort([("fecha_registro", -1), ("_id", -1)])
        .skip((pagina - 1) * TAMANO_PAGINA)
        .limit(TAMANO_PAGINA)
    )
    return {
        "total": total,
        "pagina": pagina,
        "paginas": max(1, -(-total // TAMANO_PAGINA)),
        "resultados": [
            UsuarioFilaOut(
                id=str(u["_id"]),
                nombre=nombre_completo(u),
                correo=u["correo"],
                verificacion_estado=u.get("verificacion", {}).get("estado", "no_verificado"),
                estado_cuenta=u["estado_cuenta"],
                fecha_registro=u["fecha_registro"],
            )
            async for u in cursor
        ],
    }


def perfil_de(usuario: dict, institucion: str | None) -> UsuarioPerfilOut:
    perfil = usuario.get("perfil", {})
    suspension = usuario.get("suspension")
    fecha_nac = usuario.get("fecha_nac")
    return UsuarioPerfilOut(
        id=str(usuario["_id"]),
        rut=usuario.get("rut"),
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
        direccion=perfil.get("direccion"),
        descripcion=perfil.get("descripcion"),
        verificacion_estado=usuario.get("verificacion", {}).get("estado", "no_verificado"),
        estado_cuenta=usuario["estado_cuenta"],
        advertencias_recibidas=usuario.get("advertencias_recibidas", 0),
        fecha_registro=usuario["fecha_registro"],
        suspension=SuspensionOut(motivo=suspension.get("motivo"), fecha=suspension.get("fecha")) if suspension else None,
    )


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
