"""EP-02 · HU-21, HU-22 y HU-23: solicitud de verificación del estudiante, su revisión y la revocación.

Archivo de esta área: solo lo edita quien tiene estas historias. Las rutas de administración usan
Depends(solo_admin) (app/deps.py) y los avisos al usuario se envían con app.notificaciones.notificar.
"""

import hashlib
from datetime import datetime, timezone
from typing import Literal

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse, JSONResponse

from app.compatibilidad import recalcular
from app.config import settings
from app.db import db, siguiente_codigo
from app.deps import solo_admin, usuario_actual
from app.matching import generar_propuestas
from app.media import formato_comprobante, guardar_comprobante, ruta_comprobante
from app.notificaciones import notificar
from app.schemas.verificacion import (
    TIPOS_POR_SITUACION, RechazoIn, RevocacionIn, Situacion, SolicitanteOut, SolicitudAdminOut, SolicitudOut,
    SolicitudResumenOut, TipoComprobante, VerificacionOut, situacion_de,
)

router = APIRouter(prefix="/api/verificacion", tags=["Verificación"])

# Con estos estados el estudiante puede enviar una solicitud nueva (CA-21.4)
PUEDE_SOLICITAR = ("no_verificado", "rechazado", "revocado")
MENSAJES_NO_PUEDE = {
    "pendiente": "Ya tienes una solicitud pendiente de validación",
    "verificado": "Tu condición de estudiante ya está verificada",
}

TIPOS_MIME = {"pdf": "application/pdf", "jpg": "image/jpeg", "png": "image/png"}

# Con estos estados basta el correo institucional. Una verificación revocada por un administrador
# no se recupera con el correo: hay que enviar un comprobante
PUEDE_CORREO = ("no_verificado", "rechazado")


def datos_invalidos(errores: dict) -> JSONResponse:
    return JSONResponse(status_code=422, content={"detail": "Datos inválidos", "errores": errores})


async def institucion_del_correo(correo: str) -> dict | None:
    """La institución activa cuyo dominio coincide con el del correo (también sus subdominios,
    p. ej. «alumnos.ubiobio.cl»). Los dominios están en dominios_correo de cada institución."""
    dominio = correo.rsplit("@", 1)[-1].lower()
    async for institucion in db.instituciones.find(
        {"activa": True}, {"nombre": 1, "sigla": 1, "dominios_correo": 1}
    ):
        if any(dominio == d or dominio.endswith(f".{d}") for d in institucion.get("dominios_correo") or []):
            return institucion
    return None


async def verificacion_out(usuario: dict) -> VerificacionOut:
    verificacion = usuario.get("verificacion", {})
    estado = verificacion.get("estado", "no_verificado")
    solicitud = await db.solicitudes_verificacion.find_one(
        {"usuario_id": usuario["_id"]}, sort=[("fecha_solicitud", -1)]
    )
    if solicitud:
        institucion = await db.instituciones.find_one({"_id": solicitud["institucion_id"]}, {"nombre": 1})
        solicitud = SolicitudOut.desde_doc(solicitud, institucion and institucion["nombre"])
    institucion_correo = await institucion_del_correo(usuario["correo"])
    return VerificacionOut(
        estado=estado,
        puede_solicitar=estado in PUEDE_SOLICITAR,
        motivo_revocacion=verificacion.get("motivo_revocacion") if estado == "revocado" else None,
        solicitud=solicitud,
        institucion_correo=institucion_correo and (
            institucion_correo["nombre"] if institucion_correo["sigla"] == institucion_correo["nombre"]
            else f"{institucion_correo['nombre']} ({institucion_correo['sigla']})"
        ),
        puede_verificar_correo=bool(institucion_correo) and estado in PUEDE_CORREO,
        verificado_con_correo=estado == "verificado" and verificacion.get("metodo") == "correo_institucional",
        fecha_verificacion=verificacion.get("fecha_verificacion") if estado == "verificado" else None,
    )


async def al_quedar_verificado(usuario_id: ObjectId) -> None:
    """Hasta ahora no contaba en la compatibilidad ni en el matching: se calcula de inmediato para
    que aparezca como posible roomie y pueda recibir propuestas sin esperar otro cambio."""
    verificado = await db.usuarios.find_one({"_id": usuario_id})
    if verificado and (verificado.get("cuestionario") or {}).get("completo"):
        await recalcular(verificado)
        await generar_propuestas()


@router.get("", response_model=VerificacionOut)
async def ver_verificacion(usuario: dict = Depends(usuario_actual)):
    """CA-21.4: estado de la verificación y de la última solicitud (con el motivo, si se rechazó)."""
    return await verificacion_out(usuario)


@router.post("", status_code=status.HTTP_201_CREATED)
async def solicitar_verificacion(
    institucion_id: str = Form(...),
    tipo_comprobante: TipoComprobante = Form(...),
    comprobante: UploadFile = File(...),
    situacion: Situacion | None = Form(default=None),
    usuario: dict = Depends(usuario_actual),
):
    """HU-21: el estudiante indica su situación y su institución, y adjunta un comprobante
    (CA-21.1 y CA-21.2). Sin «situacion» se deduce del tipo de documento."""
    estado = usuario.get("verificacion", {}).get("estado", "no_verificado")
    if estado not in PUEDE_SOLICITAR:
        raise HTTPException(status.HTTP_409_CONFLICT, MENSAJES_NO_PUEDE[estado])
    situacion = situacion or situacion_de(tipo_comprobante)
    if tipo_comprobante not in TIPOS_POR_SITUACION[situacion]:
        return datos_invalidos({"tipo_comprobante": "Este documento no corresponde a tu situación"})

    try:
        institucion_oid = ObjectId(institucion_id)
    except InvalidId:
        return datos_invalidos({"institucion_id": "Selecciona una institución válida"})
    if not await db.instituciones.find_one({"_id": institucion_oid, "activa": True}, {"_id": 1}):
        return datos_invalidos({"institucion_id": "Selecciona una institución válida"})

    # CA-21.3: PDF, JPG o PNG de hasta 5 MB, según el contenido real y no la extensión
    limite = settings.max_comprobante_mb * 1024 * 1024
    contenido = await comprobante.read(limite + 1)
    if not contenido:
        return datos_invalidos({"comprobante": "Adjunta tu comprobante"})
    if len(contenido) > limite:
        return datos_invalidos(
            {"comprobante": f"El archivo debe pesar como máximo {settings.max_comprobante_mb} MB"}
        )
    formato = formato_comprobante(contenido)
    if not formato:
        return datos_invalidos({"comprobante": "El archivo debe ser PDF, JPG o PNG"})

    # Se marca «pendiente» de forma atómica: dos envíos simultáneos no crean dos solicitudes
    ahora = datetime.now(timezone.utc)
    marcado = await db.usuarios.update_one(
        {"_id": usuario["_id"], "verificacion.estado": {"$nin": ["pendiente", "verificado"]}},
        {"$set": {"verificacion.estado": "pendiente", "fecha_actualizacion": ahora}},
    )
    if not marcado.modified_count:
        raise HTTPException(status.HTTP_409_CONFLICT, MENSAJES_NO_PUEDE["pendiente"])

    nombre = await run_in_threadpool(guardar_comprobante, str(usuario["_id"]), contenido, formato)
    solicitud = {
        "codigo": await siguiente_codigo("solicitudes_verificacion"),
        "usuario_id": usuario["_id"],
        "institucion_id": institucion_oid,
        "admin_revisor_id": None,
        "situacion": situacion,
        "tipo_comprobante": tipo_comprobante,
        "vigencia_hasta": None,
        "fecha_solicitud": ahora,
        "fecha_revision": None,
        "estado": "pendiente",
        "motivo_rechazo": None,
        "observaciones": None,
        "archivo": {
            "ruta": nombre,
            # Solo para mostrarlo; en disco se guarda con un nombre generado
            "nombre_original": (comprobante.filename or f"comprobante.{formato}")[-120:],
            "formato": formato,
            "tamano_bytes": len(contenido),
            "hash_sha256": hashlib.sha256(contenido).hexdigest(),
        },
    }
    resultado = await db.solicitudes_verificacion.insert_one(solicitud)
    await db.usuarios.update_one(
        {"_id": usuario["_id"]}, {"$set": {"verificacion.solicitud_id": resultado.inserted_id}}
    )

    usuario["verificacion"] = {**usuario.get("verificacion", {}), "estado": "pendiente"}
    return {
        "mensaje": "Recibimos tu comprobante. Tu solicitud quedó pendiente de validación",
        "verificacion": await verificacion_out(usuario),
    }


@router.post("/correo")
async def verificar_con_correo(usuario: dict = Depends(usuario_actual)):
    """El estudiante matriculado que se registró con el correo de su institución (p. ej.
    «@duocuc.cl») queda verificado al instante, sin comprobante ni revisión de un administrador."""
    estado = usuario.get("verificacion", {}).get("estado", "no_verificado")
    if estado not in PUEDE_CORREO:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            MENSAJES_NO_PUEDE.get(estado, "Para volver a verificarte envía un comprobante actualizado"),
        )
    institucion = await institucion_del_correo(usuario["correo"])
    if not institucion:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Tu correo no es de una institución reconocida. Sube un documento que acredite que eres estudiante",
        )

    # Igual que al enviar un comprobante: solo cambia si el estado no cambió entretanto
    ahora = datetime.now(timezone.utc)
    verificacion = {
        "estado": "verificado",
        "metodo": "correo_institucional",  # campo nuevo (no está en el modelo de datos)
        "institucion_id": institucion["_id"],
        "fecha_verificacion": ahora,
        "fecha_revocacion": None,
        "admin_id": None,
        "solicitud_id": None,
    }
    marcado = await db.usuarios.update_one(
        {"_id": usuario["_id"], "verificacion.estado": {"$in": list(PUEDE_CORREO)}},
        {"$set": {"verificacion": verificacion, "fecha_actualizacion": ahora}},
    )
    if not marcado.modified_count:
        raise HTTPException(status.HTTP_409_CONFLICT, "Tu verificación cambió. Recarga la página")

    await al_quedar_verificado(usuario["_id"])
    usuario["verificacion"] = verificacion
    return {
        "mensaje": f"Listo: verificamos tu cuenta con tu correo de {institucion['nombre']}",
        "verificacion": await verificacion_out(usuario),
    }



# ---------- HU-22: revisión de las solicitudes por un administrador ----------

# Estados en que la solicitud todavía se puede aprobar o rechazar (CA-22.4)
POR_REVISAR = ["pendiente", "en_revision"]


async def buscar_solicitud(solicitud_id: str) -> dict:
    try:
        oid = ObjectId(solicitud_id)
    except InvalidId:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Solicitud no encontrada")
    solicitud = await db.solicitudes_verificacion.find_one({"_id": oid})
    if not solicitud:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Solicitud no encontrada")
    return solicitud


async def nombres_instituciones(ids: set) -> dict:
    return {i["_id"]: i["nombre"] async for i in db.instituciones.find({"_id": {"$in": list(ids)}}, {"nombre": 1})}


def nombre_completo(doc: dict) -> str:
    return " ".join(p for p in (doc["nombre"], doc.get("ap_paterno"), doc.get("ap_materno")) if p)


async def migrar_revocaciones() -> None:
    """Las revocaciones hechas antes de guardarse en la solicitud quedaron solo en la cuenta: se
    copian a su solicitud aprobada. Se puede repetir sin efecto."""
    async for u in db.usuarios.find(
        {"verificacion.estado": "revocado", "verificacion.solicitud_id": {"$ne": None}}, {"verificacion": 1}
    ):
        v = u["verificacion"]
        await db.solicitudes_verificacion.update_one(
            {"_id": v["solicitud_id"], "estado": "aprobada", "revocacion": {"$exists": False}},
            {"$set": {"revocacion": {
                "fecha": v.get("fecha_revocacion"), "motivo": v.get("motivo_revocacion"), "admin_id": v.get("admin_id"),
            }}},
        )


async def fechas_revocacion() -> list[datetime]:
    """Una fecha por cada revocación: las guardadas en solicitudes y las de cuentas que siguen
    revocadas (incluye las verificadas con correo institucional, que no tienen solicitud)."""
    fechas = {}
    async for s in db.solicitudes_verificacion.find({"revocacion": {"$exists": True}}, {"revocacion.fecha": 1}):
        fechas[s["_id"]] = s["revocacion"]["fecha"]
    async for u in db.usuarios.find({"verificacion.estado": "revocado"}, {"verificacion": 1}):
        v = u["verificacion"]
        fechas.setdefault(v.get("solicitud_id") or u["_id"], v.get("fecha_revocacion"))
    return [f for f in fechas.values() if f]


@router.get("/solicitudes", response_model=list[SolicitudResumenOut])
async def listar_solicitudes(
    estado: Literal["pendientes", "procesadas"] = "pendientes", _admin: dict = Depends(solo_admin)
):
    """CA-22.1: pendientes de la más antigua a la más reciente. Las procesadas quedan como
    historial (CA-22.4), de la última novedad hacia atrás. En el historial, una aprobada cuya
    verificación se quitó después sale como «revocada», y también aparecen las cuentas verificadas
    con correo institucional que se revocaron (no tienen solicitud)."""
    if estado == "pendientes":
        filtro, orden = {"estado": {"$in": POR_REVISAR}}, [("fecha_solicitud", 1)]
    else:
        filtro, orden = {"estado": {"$nin": POR_REVISAR}}, [("fecha_revision", -1)]
    solicitudes = await db.solicitudes_verificacion.find(filtro).sort(orden).to_list(500)

    # Verificadas con correo institucional y revocadas: sin solicitud, se muestran desde la cuenta
    por_correo = [] if estado == "pendientes" else await db.usuarios.find(
        {"verificacion.estado": "revocado", "verificacion.solicitud_id": None},
        {"nombre": 1, "ap_paterno": 1, "ap_materno": 1, "correo": 1, "perfil.foto_url": 1, "verificacion": 1},
    ).to_list(500)

    usuarios = {
        u["_id"]: u
        async for u in db.usuarios.find(
            {"_id": {"$in": [s["usuario_id"] for s in solicitudes]}},
            {"nombre": 1, "ap_paterno": 1, "ap_materno": 1, "correo": 1, "perfil.foto_url": 1, "verificacion": 1},
        )
    }
    instituciones = await nombres_instituciones(
        {s["institucion_id"] for s in solicitudes} | {u["verificacion"].get("institucion_id") for u in por_correo}
    )
    filas = []
    for u in por_correo:
        v = u["verificacion"]
        filas.append(SolicitudResumenOut(
            id=str(u["_id"]),
            origen="correo",
            usuario_id=str(u["_id"]),
            nombre=nombre_completo(u),
            correo=u["correo"],
            institucion_nombre=instituciones.get(v.get("institucion_id")),
            tipo_comprobante="correo_institucional",
            estado="revocada",
            fecha_solicitud=v.get("fecha_verificacion") or v["fecha_revocacion"],
            fecha_revision=v.get("fecha_verificacion"),
            fecha_revocacion=v.get("fecha_revocacion"),
            motivo_revocacion=v.get("motivo_revocacion"),
            foto_url=u.get("perfil", {}).get("foto_url"),
        ))
    for s in solicitudes:
        u = usuarios.get(s["usuario_id"])
        if not u:
            continue  # la cuenta se eliminó
        revocacion = s.get("revocacion")
        filas.append(SolicitudResumenOut(
            id=str(s["_id"]),
            codigo=s["codigo"],
            usuario_id=str(u["_id"]),
            nombre=nombre_completo(u),
            correo=u["correo"],
            institucion_nombre=instituciones.get(s["institucion_id"]),
            situacion=s.get("situacion") or situacion_de(s["tipo_comprobante"]),
            tipo_comprobante=s["tipo_comprobante"],
            estado="revocada" if revocacion else s["estado"],
            fecha_solicitud=s["fecha_solicitud"],
            fecha_revision=s.get("fecha_revision"),
            fecha_revocacion=revocacion and revocacion.get("fecha"),
            motivo_revocacion=revocacion and revocacion.get("motivo"),
            foto_url=u.get("perfil", {}).get("foto_url"),
        ))
    if estado == "procesadas":
        # De la última novedad hacia atrás: una revocación cuenta desde que se hizo
        filas.sort(key=lambda f: f.fecha_revocacion or f.fecha_revision or f.fecha_solicitud, reverse=True)
    return filas


@router.get("/solicitudes/{solicitud_id}", response_model=SolicitudAdminOut)
async def ver_solicitud(solicitud_id: str, _admin: dict = Depends(solo_admin)):
    """CA-22.1: la solicitud junto con los datos del perfil del estudiante."""
    solicitud = await buscar_solicitud(solicitud_id)
    usuario = await db.usuarios.find_one({"_id": solicitud["usuario_id"]})
    if not usuario:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "La cuenta del estudiante ya no existe")

    perfil = usuario.get("perfil", {})
    instituciones = await nombres_instituciones({solicitud["institucion_id"], perfil.get("institucion_id")})
    revisor = solicitud.get("admin_revisor_id") and await db.usuarios.find_one(
        {"_id": solicitud["admin_revisor_id"]}, {"nombre": 1, "ap_paterno": 1, "ap_materno": 1}
    )
    fecha_nac = usuario.get("fecha_nac")
    base = SolicitudOut.desde_doc(solicitud, instituciones.get(solicitud["institucion_id"]))
    revocacion = solicitud.get("revocacion")
    revocador = revocacion and revocacion.get("admin_id") and await db.usuarios.find_one(
        {"_id": revocacion["admin_id"]}, {"nombre": 1, "ap_paterno": 1, "ap_materno": 1}
    )
    return SolicitudAdminOut(
        **(base.model_dump() | ({"estado": "revocada"} if revocacion else {})),
        fecha_revocacion=revocacion and revocacion.get("fecha"),
        motivo_revocacion=revocacion and revocacion.get("motivo"),
        revocada_por=revocador and nombre_completo(revocador),
        observaciones=solicitud.get("observaciones"),
        admin_revisor=revisor and nombre_completo(revisor),
        solicitante=SolicitanteOut(
            id=str(usuario["_id"]),
            rut=usuario.get("rut"),
            nombre=usuario["nombre"],
            ap_paterno=usuario.get("ap_paterno"),
            nombre_completo=nombre_completo(usuario),
            correo=usuario["correo"],
            telefono=perfil.get("telefono"),
            fecha_nac=fecha_nac.date() if fecha_nac else None,
            foto_url=perfil.get("foto_url"),
            institucion_nombre=instituciones.get(perfil.get("institucion_id")),
            sede=perfil.get("sede"),
            carrera=perfil.get("carrera"),
            anio_ingreso=perfil.get("anio_ingreso"),
            fecha_registro=usuario["fecha_registro"],
            verificacion_estado=usuario.get("verificacion", {}).get("estado", "no_verificado"),
        ),
    )


async def resolver(solicitud_id: str, admin: dict, cambios: dict) -> dict:
    """Marca la solicitud como revisada solo si seguía pendiente: así una solicitud no se procesa
    dos veces, ni aunque dos administradores la resuelvan al mismo tiempo (CA-22.4)."""
    solicitud = await buscar_solicitud(solicitud_id)
    ahora = datetime.now(timezone.utc)
    resultado = await db.solicitudes_verificacion.update_one(
        {"_id": solicitud["_id"], "estado": {"$in": POR_REVISAR}},
        {"$set": {**cambios, "admin_revisor_id": admin["_id"], "fecha_revision": ahora}},
    )
    if not resultado.modified_count:
        raise HTTPException(status.HTTP_409_CONFLICT, "Esta solicitud ya fue procesada")
    return {**solicitud, "fecha_revision": ahora}


@router.post("/solicitudes/{solicitud_id}/aprobar")
async def aprobar_solicitud(solicitud_id: str, admin: dict = Depends(solo_admin)):
    """CA-22.2: el perfil pasa a «verificado», con la fecha y el administrador que lo validó."""
    solicitud = await resolver(solicitud_id, admin, {"estado": "aprobada", "motivo_rechazo": None})
    await db.usuarios.update_one(
        {"_id": solicitud["usuario_id"]},
        {"$set": {
            "verificacion": {
                "estado": "verificado",
                "fecha_verificacion": solicitud["fecha_revision"],
                "fecha_revocacion": None,
                "admin_id": admin["_id"],
                "solicitud_id": solicitud["_id"],
            },
            "fecha_actualizacion": solicitud["fecha_revision"],
        }},
    )
    await al_quedar_verificado(solicitud["usuario_id"])
    await notificar(
        solicitud["usuario_id"], "verificacion_estudiante", "Tu condición de estudiante fue verificada",
        "Revisamos tu comprobante y tu perfil ya aparece como estudiante verificado.",
        ("usuario", solicitud["usuario_id"]),
    )
    return {"mensaje": "Solicitud aprobada. El estudiante quedó verificado"}


@router.post("/solicitudes/{solicitud_id}/rechazar")
async def rechazar_solicitud(solicitud_id: str, datos: RechazoIn, admin: dict = Depends(solo_admin)):
    """CA-22.3: sin motivo no se puede rechazar; con él, el estudiante recibe ese motivo."""
    solicitud = await resolver(solicitud_id, admin, {"estado": "rechazada", "motivo_rechazo": datos.motivo})
    await db.usuarios.update_one(
        {"_id": solicitud["usuario_id"]},
        {"$set": {
            "verificacion.estado": "rechazado",
            "verificacion.admin_id": admin["_id"],
            "verificacion.solicitud_id": solicitud["_id"],
            "fecha_actualizacion": solicitud["fecha_revision"],
        }},
    )
    await notificar(
        solicitud["usuario_id"], "verificacion_estudiante", "Tu solicitud de verificación fue rechazada",
        f"Motivo: {datos.motivo.rstrip('.')}. Puedes enviar una nueva solicitud con otro comprobante.",
        ("usuario", solicitud["usuario_id"]),
    )
    return {"mensaje": "Solicitud rechazada. Se le avisó al estudiante con el motivo"}


async def quitar_verificacion(oid: ObjectId, admin: dict, motivo: str) -> None:
    """CA-23.4: la insignia sale de todas las vistas porque todas la calculan desde
    verificacion.estado. La usan esta historia y las acciones sobre un reporte (HU-27)."""
    ahora = datetime.now(timezone.utc)
    resultado = await db.usuarios.update_one(
        {"_id": oid, "verificacion.estado": "verificado"},
        {"$set": {
            "verificacion.estado": "revocado",
            "verificacion.fecha_revocacion": ahora,
            "verificacion.admin_id": admin["_id"],
            # Campo nuevo (no está en el modelo de datos): se le muestra al estudiante
            "verificacion.motivo_revocacion": motivo,
            "fecha_actualizacion": ahora,
        }},
    )
    if not resultado.matched_count:
        raise HTTPException(status.HTTP_409_CONFLICT, "Este perfil no tiene una verificación vigente")
    # La solicitud aprobada guarda la revocación (campo nuevo), así queda en el historial aunque el
    # estudiante después vuelva a verificarse. Con correo institucional no hay solicitud
    usuario = await db.usuarios.find_one({"_id": oid}, {"verificacion.solicitud_id": 1})
    solicitud_id = usuario.get("verificacion", {}).get("solicitud_id")
    if solicitud_id:
        await db.solicitudes_verificacion.update_one(
            {"_id": solicitud_id},
            {"$set": {"revocacion": {"fecha": ahora, "motivo": motivo, "admin_id": admin["_id"]}}},
        )
    await notificar(
        oid, "verificacion_estudiante", "Tu verificación de estudiante fue revocada",
        f"Motivo: {motivo.rstrip('.')}. Puedes volver a solicitarla con un comprobante actualizado.",
        ("usuario", oid),
    )


@router.post("/usuarios/{usuario_id}/revocar")
async def revocar_verificacion(usuario_id: str, datos: RevocacionIn, admin: dict = Depends(solo_admin)):
    """CA-23.4: un administrador deja sin efecto la verificación. El estudiante puede volver a
    solicitarla con un comprobante actualizado."""
    try:
        oid = ObjectId(usuario_id)
    except InvalidId:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    await quitar_verificacion(oid, admin, datos.motivo)
    return {"mensaje": "Verificación revocada. La insignia ya no aparece en el perfil"}


@router.post("/usuarios/{usuario_id}/restaurar")
async def restaurar_verificacion(usuario_id: str, admin: dict = Depends(solo_admin)):
    """Deshace una revocación (CA-23.4): la cuenta vuelve a quedar verificada con la misma solicitud
    o el mismo correo institucional con que se verificó. La revocación queda en el historial de la
    solicitud (campo nuevo `revocaciones_anteriores`)."""
    try:
        oid = ObjectId(usuario_id)
    except InvalidId:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    ahora = datetime.now(timezone.utc)
    anterior = await db.usuarios.find_one_and_update(
        {"_id": oid, "verificacion.estado": "revocado"},
        {"$set": {
            "verificacion.estado": "verificado",
            "verificacion.fecha_revocacion": None,
            "verificacion.motivo_revocacion": None,
            "verificacion.admin_id": admin["_id"],
            "verificacion.fecha_restauracion": ahora,  # campo nuevo (no está en el modelo de datos)
            "fecha_actualizacion": ahora,
        }},
        projection={"verificacion": 1},
    )
    if not anterior:
        usuario = await db.usuarios.find_one({"_id": oid}, {"verificacion.estado": 1})
        if not usuario:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
        if usuario.get("verificacion", {}).get("estado") == "pendiente":
            raise HTTPException(status.HTTP_409_CONFLICT,
                                "Ya envió una nueva solicitud de verificación: revísala en Verificaciones")
        raise HTTPException(status.HTTP_409_CONFLICT, "Este perfil no tiene una verificación revocada")

    solicitud_id = anterior["verificacion"].get("solicitud_id")
    if solicitud_id:
        solicitud = await db.solicitudes_verificacion.find_one({"_id": solicitud_id}, {"revocacion": 1})
        if solicitud and solicitud.get("revocacion"):
            await db.solicitudes_verificacion.update_one(
                {"_id": solicitud_id},
                {
                    "$unset": {"revocacion": ""},
                    "$push": {"revocaciones_anteriores": {
                        **solicitud["revocacion"], "fecha_restauracion": ahora, "restaurada_por": admin["_id"],
                    }},
                },
            )
    await al_quedar_verificado(oid)  # vuelve a contar en la compatibilidad y el matching
    await notificar(
        oid, "verificacion_estudiante", "Tu verificación de estudiante fue restablecida",
        "Revisamos tu caso y tu perfil vuelve a mostrar la insignia de estudiante verificado.",
        ("usuario", oid),
    )
    return {"mensaje": "Verificación restablecida. La insignia vuelve a aparecer en el perfil"}


@router.get("/solicitudes/{solicitud_id}/comprobante")
async def ver_comprobante(solicitud_id: str, usuario: dict = Depends(usuario_actual)):
    """CA-21.5: solo el propio estudiante y los administradores pueden ver el comprobante."""
    solicitud = await buscar_solicitud(solicitud_id)
    if solicitud["usuario_id"] != usuario["_id"] and usuario["rol"] != "administrador":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes acceso a este comprobante")

    archivo = solicitud["archivo"]
    ruta = ruta_comprobante(archivo["ruta"])
    if not ruta.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "El archivo ya no está disponible")
    return FileResponse(
        ruta,
        media_type=TIPOS_MIME[archivo["formato"]],
        filename=archivo["nombre_original"],
        content_disposition_type="inline",
        headers={"Cache-Control": "private, no-store"},
    )
