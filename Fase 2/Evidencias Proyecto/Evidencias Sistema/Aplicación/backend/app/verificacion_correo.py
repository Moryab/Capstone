"""Verificación del correo con un código de 6 dígitos.

Al registrarse (o al cambiar el correo) se envía un código; hasta ingresarlo, la cuenta no puede usar
nada más de la plataforma (deps.usuario_actual). En la base solo se guarda el hash del código, con su
vencimiento y los intentos fallidos, en usuarios.verificacion_correo.
"""

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from html import escape

from bson import ObjectId

from app.config import settings
from app.correo import enviar_correo
from app.db import db


def hash_codigo(usuario_id: ObjectId, codigo: str) -> str:
    """Con la clave del servidor: el código no se puede deducir aunque alguien lea la base."""
    return hmac.new(settings.jwt_secret.encode(), f"{usuario_id}:{codigo}".encode(), hashlib.sha256).hexdigest()


def segundos_para_reenviar(usuario: dict) -> int:
    enviado = (usuario.get("verificacion_correo") or {}).get("fecha_envio")
    if not enviado:
        return 0
    restante = settings.codigo_reenvio_segundos - (datetime.now(timezone.utc) - enviado).total_seconds()
    return max(0, int(restante + 0.999))


async def enviar_codigo(usuario_id: ObjectId, correo: str, nombre: str) -> None:
    """Genera un código nuevo (el anterior deja de servir) y lo envía. Puede lanzar CorreoNoEnviado."""
    codigo = f"{secrets.randbelow(10**6):06d}"
    ahora = datetime.now(timezone.utc)
    await db.usuarios.update_one({"_id": usuario_id}, {"$set": {"verificacion_correo": {
        "codigo_hash": hash_codigo(usuario_id, codigo),
        "expira": ahora + timedelta(minutes=settings.codigo_minutos),
        "intentos": 0,
        "fecha_envio": ahora,
    }}})

    nombre = (nombre or "").strip().capitalize()
    saludo = f"Hola {nombre}," if nombre else "Hola,"
    minutos = settings.codigo_minutos
    texto = (
        f"{saludo}\n\nTu código para verificar tu correo en RoomMatch es: {codigo}\n\n"
        f"Vence en {minutos} minutos. Si no creaste una cuenta en RoomMatch, ignora este mensaje."
    )
    html = f"""\
<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0b1f3a">
  <h2 style="color: #0f766e; margin-bottom: 4px">RoomMatch</h2>
  <p>{escape(saludo)}</p>
  <p>Tu código para verificar tu correo es:</p>
  <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; background: #ecfdf5;
            padding: 16px; text-align: center; border-radius: 8px">{codigo}</p>
  <p>Vence en {minutos} minutos.</p>
  <p style="color: #6b7280; font-size: 13px">Si no creaste una cuenta en RoomMatch, ignora este mensaje.</p>
</div>"""
    await enviar_correo(correo, f"Tu código de RoomMatch: {codigo}", texto, html)
