from datetime import datetime, timedelta, timezone

import jwt
from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.config import settings
from app.db import db
from app.security import leer_token

oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login-form")

NO_AUTORIZADO = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Sesión no válida o expirada. Inicia sesión nuevamente",
    headers={"WWW-Authenticate": "Bearer"},
)


async def usuario_actual(token: str = Depends(oauth2)) -> dict:
    """Valida el token y la inactividad (CA-02.4 y CA-02.5). Devuelve el documento del usuario."""
    try:
        datos = leer_token(token)
        usuario_id = ObjectId(datos["sub"])
    except (jwt.PyJWTError, KeyError, Exception):
        raise NO_AUTORIZADO

    usuario = await db.usuarios.find_one({"_id": usuario_id})
    if not usuario:
        raise NO_AUTORIZADO

    seguridad = usuario.get("seguridad", {})
    if datos.get("ver") != seguridad.get("token_version", 0):
        raise NO_AUTORIZADO  # cerró sesión

    ahora = datetime.now(timezone.utc)
    ultima = seguridad.get("ultima_actividad")
    if ultima and ahora - ultima > timedelta(minutes=settings.inactividad_minutos):
        raise NO_AUTORIZADO

    if usuario["estado_cuenta"] in ("suspendida", "inhabilitada"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Tu cuenta está suspendida")

    await db.usuarios.update_one(
        {"_id": usuario_id}, {"$set": {"seguridad.ultima_actividad": ahora}}
    )
    return usuario


async def solo_admin(usuario: dict = Depends(usuario_actual)) -> dict:
    if usuario["rol"] != "administrador":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acción reservada para administradores")
    return usuario
