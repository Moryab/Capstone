from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.config import settings

ALGORITMO = "HS256"


def cifrar_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verificar_password(password: str, password_cifrada: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_cifrada.encode())


def crear_token(usuario_id: str, rol: str, token_version: int) -> str:
    ahora = datetime.now(timezone.utc)
    datos = {
        "sub": usuario_id,
        "rol": rol,
        "ver": token_version,  # al cerrar sesión se incrementa y el token deja de servir
        "iat": ahora,
        "exp": ahora + timedelta(minutes=settings.jwt_minutos),
    }
    return jwt.encode(datos, settings.jwt_secret, algorithm=ALGORITMO)


def leer_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITMO])
