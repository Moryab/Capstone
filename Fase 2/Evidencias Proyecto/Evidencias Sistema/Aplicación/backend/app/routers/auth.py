import hmac
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from pymongo.errors import DuplicateKeyError

from app.config import settings
from app.correo import CorreoNoEnviado
from app.db import db
from app.deps import CUENTA_ELIMINADA, usuario_actual
from app.modos import tiene_convivencia
from app.schemas.perfil import calcular_faltantes
from app.schemas.usuarios import (
    CambioCorreoIn, CodigoIn, LoginIn, RegistroIn, TokenOut, UsuarioOut, fecha_a_datetime,
)
from app.security import cifrar_password, crear_token, verificar_password
from app.verificacion_correo import enviar_codigo, hash_codigo, segundos_para_reenviar

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])

CREDENCIALES_INVALIDAS = "Correo o contraseña incorrectos"  # CA-02.2: mensaje genérico

EN_USO = {
    "correo": "El correo ya está en uso",
    "rut": "El RUT ya está registrado",
    "telefono": "El teléfono ya está registrado",
}

# Dónde está guardado cada dato único en el documento del usuario
RUTA_EN_DOC = {"rut": "rut", "correo": "correo", "telefono": "perfil.telefono"}


def datos_en_uso(campos: list[str]) -> JSONResponse:
    """CA-01.2: indica cuál de los datos únicos ya pertenece a otra cuenta."""
    errores = {campo: EN_USO[campo] for campo in campos}
    detalle = next(iter(errores.values())) if len(errores) == 1 else "Algunos datos ya están en uso"
    return JSONResponse(status_code=409, content={"detail": detalle, "errores": errores})


def campos_duplicados(error: DuplicateKeyError) -> list[str]:
    """Traduce el índice que reclamó (por ejemplo «perfil.telefono») al nombre del campo."""
    claves = error.details.get("keyPattern", {"correo": 1})
    return [campo for campo, ruta in RUTA_EN_DOC.items() if ruta in claves]


@router.post("/registro", status_code=status.HTTP_201_CREATED)
async def registrar(datos: RegistroIn):
    """HU-01: registro de estudiante."""
    # Si el correo es de una cuenta eliminada, se reactiva ese mismo registro con los datos nuevos:
    # así sus convivencias, evaluaciones y reportes siguen unidos a la persona
    eliminada = await db.usuarios.find_one({"correo": datos.correo, "estado_cuenta": "eliminada"})
    otra_cuenta = {"_id": {"$ne": eliminada["_id"]}} if eliminada else {}
    repetidos = [
        campo
        for campo, ruta in RUTA_EN_DOC.items()
        if await db.usuarios.find_one({ruta: getattr(datos, campo), **otra_cuenta}, {"_id": 1})
    ]
    if repetidos:
        return datos_en_uso(repetidos)
    if eliminada:
        return await registrar_de_nuevo(eliminada, datos)

    ahora = datetime.now(timezone.utc)
    doc = {
        "rut": datos.rut,
        "nombre": datos.nombre,
        "ap_paterno": datos.ap_paterno,
        "ap_materno": datos.ap_materno,
        "fecha_nac": fecha_a_datetime(datos.fecha_nac),
        "genero": datos.genero,
        "correo": datos.correo,
        "password": cifrar_password(datos.password),  # CA-01.5
        "fecha_registro": ahora,
        "fecha_actualizacion": ahora,
        "rol": "estudiante",
        "estado_cuenta": "activa",
        "advertencias_recibidas": 0,
        "match_activo_id": None,
        "buscando_alojamiento": False,  # HU-17: solo un buscador puede activarla
        # Rol buscador/oferente (modos.py): se elige después del cuestionario de hábitos
        "modo": None,
        "fecha_cambio_modo": None,
        "correo_verificado": False,
        "verificacion": {"estado": "no_verificado"},
        # El teléfono se pide al registrarse; el resto del perfil se completa después
        "perfil": {
            "telefono": datos.telefono,
            "perfil_completo": False,
            "campos_faltantes": calcular_faltantes({"telefono": datos.telefono}),
        },
        "seguridad": {"intentos_fallidos": 0, "bloqueado_hasta": None, "token_version": 0},
    }
    try:
        resultado = await db.usuarios.insert_one(doc)
    except DuplicateKeyError as e:
        # Dos registros simultáneos con el mismo dato pasan la revisión de arriba
        return datos_en_uso(campos_duplicados(e))

    doc["_id"] = resultado.inserted_id
    await enviar_codigo_sin_fallar(doc)
    return {"mensaje": "Registro exitoso", "usuario": UsuarioOut.desde_doc(doc)}


async def enviar_codigo_sin_fallar(usuario: dict) -> None:
    """Al registrarse: si el correo no sale, la cuenta igual se crea y puede pedir otro código."""
    try:
        await enviar_codigo(usuario["_id"], usuario["correo"], usuario.get("nombre"))
    except CorreoNoEnviado:
        logging.getLogger("uvicorn.error").warning("Código no enviado a %s; podrá reenviarlo", usuario["correo"])


async def registrar_de_nuevo(cuenta: dict, datos: RegistroIn):
    """Vuelve a registrarse alguien cuya cuenta fue eliminada: se reactiva el mismo documento con los
    datos y la contraseña nuevos. Se conservan su perfil, su cuestionario y todo su historial; la
    verificación de estudiante se vuelve a pedir."""
    ahora = datetime.now(timezone.utc)
    perfil = {**cuenta.get("perfil", {}), "telefono": datos.telefono}
    faltantes = calcular_faltantes(perfil)
    try:
        await db.usuarios.update_one(
            {"_id": cuenta["_id"], "estado_cuenta": "eliminada"},
            {
                "$set": {
                    "rut": datos.rut,
                    "nombre": datos.nombre,
                    "ap_paterno": datos.ap_paterno,
                    "ap_materno": datos.ap_materno,
                    "fecha_nac": fecha_a_datetime(datos.fecha_nac),
                    "genero": datos.genero,
                    "password": cifrar_password(datos.password),  # CA-01.5
                    "fecha_actualizacion": ahora,
                    "estado_cuenta": "activa",
                    "correo_verificado": False,
                    "verificacion": {"estado": "no_verificado"},
                    "match_activo_id": None,
                    "buscando_alojamiento": False,
                    "perfil.telefono": datos.telefono,
                    "perfil.perfil_completo": not faltantes,
                    "perfil.campos_faltantes": faltantes,
                    "eliminacion.fecha_nuevo_registro": ahora,
                    "seguridad.intentos_fallidos": 0,
                    "seguridad.bloqueado_hasta": None,
                },
                "$inc": {"seguridad.token_version": 1},
            },
        )
    except DuplicateKeyError as e:
        return datos_en_uso(campos_duplicados(e))

    doc = await db.usuarios.find_one({"_id": cuenta["_id"]})
    await enviar_codigo_sin_fallar(doc)
    return {"mensaje": "Registro exitoso", "usuario": UsuarioOut.desde_doc(doc)}


async def _iniciar_sesion(correo: str, password: str) -> TokenOut:
    ahora = datetime.now(timezone.utc)
    usuario = await db.usuarios.find_one({"correo": correo.lower()})
    if not usuario:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, CREDENCIALES_INVALIDAS)

    seguridad = usuario.get("seguridad", {})
    bloqueado_hasta = seguridad.get("bloqueado_hasta")
    if bloqueado_hasta and bloqueado_hasta > ahora:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Demasiados intentos fallidos. Intenta nuevamente en unos minutos",
        )

    if not verificar_password(password, usuario["password"]):
        intentos = seguridad.get("intentos_fallidos", 0) + 1
        cambios = {"seguridad.intentos_fallidos": intentos}
        if intentos >= settings.max_intentos_login:
            cambios["seguridad.bloqueado_hasta"] = ahora + timedelta(minutes=settings.bloqueo_minutos)
            cambios["seguridad.intentos_fallidos"] = 0
        await db.usuarios.update_one({"_id": usuario["_id"]}, {"$set": cambios})
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, CREDENCIALES_INVALIDAS)

    # CA-02.3: se valida después de la contraseña para no revelar qué correos existen
    if usuario["estado_cuenta"] == "eliminada":
        raise HTTPException(status.HTTP_403_FORBIDDEN, CUENTA_ELIMINADA)
    if usuario["estado_cuenta"] in ("suspendida", "inhabilitada"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Tu cuenta está suspendida")

    await db.usuarios.update_one(
        {"_id": usuario["_id"]},
        {
            "$set": {
                "seguridad.intentos_fallidos": 0,
                "seguridad.bloqueado_hasta": None,
                "seguridad.ultimo_inicio_sesion": ahora,
                "seguridad.ultima_actividad": ahora,
            }
        },
    )
    token = crear_token(str(usuario["_id"]), usuario["rol"], seguridad.get("token_version", 0))
    return TokenOut(access_token=token)


@router.post("/login", response_model=TokenOut)
async def login(datos: LoginIn):
    """HU-02: inicio de sesión (lo usa el frontend)."""
    return await _iniciar_sesion(datos.correo, datos.password)


@router.post("/login-form", response_model=TokenOut, include_in_schema=False)
async def login_form(form: OAuth2PasswordRequestForm = Depends()):
    """Mismo login, en el formato del botón «Authorize» de /docs (el usuario es el correo)."""
    return await _iniciar_sesion(form.username, form.password)


@router.post("/logout")
async def logout(usuario: dict = Depends(usuario_actual)):
    """CA-02.5: invalida todos los tokens emitidos al usuario."""
    await db.usuarios.update_one(
        {"_id": usuario["_id"]}, {"$inc": {"seguridad.token_version": 1}}
    )
    return {"mensaje": "Sesión cerrada"}


@router.get("/me", response_model=UsuarioOut)
async def yo(usuario: dict = Depends(usuario_actual)):
    # La convivencia como oferente no queda en el usuario: se revisa en sus matches
    return UsuarioOut.desde_doc(usuario).model_copy(update={"con_convivencia": await tiene_convivencia(usuario)})


# ---------- Verificación del correo con un código (verificacion_correo.py) ----------

NO_SE_ENVIO = "No pudimos enviar el correo. Intenta de nuevo en unos minutos"


def estado_correo(usuario: dict) -> dict:
    return {
        "correo": usuario["correo"],
        "verificado": bool(usuario.get("correo_verificado")),
        "reenviar_en": segundos_para_reenviar(usuario),
    }


@router.get("/correo")
async def ver_estado_correo(usuario: dict = Depends(usuario_actual)):
    """A qué correo se envió el código y cuántos segundos faltan para poder pedir otro."""
    return estado_correo(usuario)


@router.post("/correo/reenviar")
async def reenviar_codigo(usuario: dict = Depends(usuario_actual)):
    """Envía un código nuevo; el anterior deja de servir."""
    if usuario.get("correo_verificado"):
        raise HTTPException(status.HTTP_409_CONFLICT, "Tu correo ya está verificado")
    if espera := segundos_para_reenviar(usuario):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, f"Espera {espera} segundos para pedir otro código")
    try:
        await enviar_codigo(usuario["_id"], usuario["correo"], usuario.get("nombre"))
    except CorreoNoEnviado:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, NO_SE_ENVIO)
    actualizado = await db.usuarios.find_one({"_id": usuario["_id"]})
    return {"mensaje": f"Te enviamos un código nuevo a {usuario['correo']}", **estado_correo(actualizado)}


@router.post("/correo/verificar")
async def verificar_codigo(datos: CodigoIn, usuario: dict = Depends(usuario_actual)):
    if usuario.get("correo_verificado"):
        return {"mensaje": "Tu correo ya está verificado"}
    pendiente = usuario.get("verificacion_correo") or {}
    if not pendiente.get("codigo_hash"):
        raise HTTPException(status.HTTP_409_CONFLICT, "Pide un código para verificar tu correo")
    if pendiente["expira"] <= datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_410_GONE, "El código venció. Pide uno nuevo")
    if pendiente.get("intentos", 0) >= settings.codigo_max_intentos:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Demasiados intentos con este código. Pide uno nuevo")

    if not hmac.compare_digest(pendiente["codigo_hash"], hash_codigo(usuario["_id"], datos.codigo)):
        await db.usuarios.update_one({"_id": usuario["_id"]}, {"$inc": {"verificacion_correo.intentos": 1}})
        quedan = settings.codigo_max_intentos - pendiente.get("intentos", 0) - 1
        texto = (f"Código incorrecto. Te quedan {quedan} intento{'s' if quedan != 1 else ''}"
                 if quedan else "Código incorrecto. Pide uno nuevo")
        return JSONResponse(status_code=422, content={"detail": texto, "errores": {"codigo": texto}})

    await db.usuarios.update_one(
        {"_id": usuario["_id"]},
        {"$set": {"correo_verificado": True, "fecha_actualizacion": datetime.now(timezone.utc)},
         "$unset": {"verificacion_correo": ""}},
    )
    return {"mensaje": "¡Listo! Tu correo quedó verificado"}


@router.put("/correo")
async def corregir_correo(datos: CambioCorreoIn, usuario: dict = Depends(usuario_actual)):
    """Si se equivocó al escribir el correo al registrarse: lo corrige y le llega un código nuevo.
    Con el correo ya verificado, el cambio se hace desde el perfil."""
    if usuario.get("correo_verificado"):
        raise HTTPException(status.HTTP_409_CONFLICT, "Tu correo ya está verificado. Cámbialo desde tu perfil")
    # La misma espera que al reenviar: así no se puede usar para mandar códigos a cualquiera sin parar
    if espera := segundos_para_reenviar(usuario):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, f"Espera {espera} segundos para pedir otro código")
    if datos.correo != usuario["correo"]:
        if await db.usuarios.find_one({"correo": datos.correo, "_id": {"$ne": usuario["_id"]}}, {"_id": 1}):
            return datos_en_uso(["correo"])
        try:
            await db.usuarios.update_one(
                {"_id": usuario["_id"]},
                {"$set": {"correo": datos.correo, "fecha_actualizacion": datetime.now(timezone.utc)}},
            )
        except DuplicateKeyError:
            return datos_en_uso(["correo"])
    try:
        await enviar_codigo(usuario["_id"], datos.correo, usuario.get("nombre"))
    except CorreoNoEnviado:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, NO_SE_ENVIO)
    actualizado = await db.usuarios.find_one({"_id": usuario["_id"]})
    return {"mensaje": f"Te enviamos un código a {datos.correo}", **estado_correo(actualizado)}
