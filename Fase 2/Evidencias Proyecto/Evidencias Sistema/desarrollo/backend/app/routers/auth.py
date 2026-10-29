from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from pymongo.errors import DuplicateKeyError

from app.config import settings
from app.db import db
from app.deps import usuario_actual
from app.schemas.perfil import calcular_faltantes
from app.schemas.usuarios import LoginIn, RegistroIn, TokenOut, UsuarioOut, fecha_a_datetime
from app.security import cifrar_password, crear_token, verificar_password

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
    repetidos = [
        campo
        for campo, ruta in RUTA_EN_DOC.items()
        if await db.usuarios.find_one({ruta: getattr(datos, campo)}, {"_id": 1})
    ]
    if repetidos:
        return datos_en_uso(repetidos)

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
        "buscando_alojamiento": False,  # HU-17: se activa en «Propuestas de match»
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
    return UsuarioOut.desde_doc(usuario)
