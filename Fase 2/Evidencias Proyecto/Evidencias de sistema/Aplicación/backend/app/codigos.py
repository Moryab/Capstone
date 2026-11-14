"""Códigos de 6 dígitos enviados al correo, para dos usos:

- «verificacion»: verificar el correo al registrarse o al cambiarlo. Hasta ingresarlo, la cuenta no
  puede usar nada más de la plataforma (deps.usuario_actual). Se guarda en usuarios.verificacion_correo.
- «recuperacion»: «¿Olvidaste tu contraseña?». Se guarda en usuarios.recuperacion.

En la base solo queda el hash del código, con su vencimiento y los intentos fallidos.
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

# propósito -> (campo en usuarios, para qué sirve el código, qué hacer si no lo pidió)
PROPOSITOS = {
    "verificacion": (
        "verificacion_correo", "verificar tu correo",
        "Si no creaste una cuenta en RoomMatch, ignora este mensaje.",
    ),
    "recuperacion": (
        "recuperacion", "cambiar tu contraseña",
        "Si no pediste cambiar tu contraseña, ignora este mensaje: tu contraseña sigue igual.",
    ),
}


def hash_codigo(usuario_id: ObjectId, codigo: str, proposito: str = "verificacion") -> str:
    """Con la clave del servidor: el código no se puede deducir aunque alguien lea la base. El
    propósito va en el hash, así un código de un uso no sirve para el otro."""
    mensaje = f"{proposito}:{usuario_id}:{codigo}".encode()
    return hmac.new(settings.jwt_secret.encode(), mensaje, hashlib.sha256).hexdigest()


def segundos_para_reenviar(usuario: dict, proposito: str = "verificacion") -> int:
    enviado = (usuario.get(PROPOSITOS[proposito][0]) or {}).get("fecha_envio")
    if not enviado:
        return 0
    restante = settings.codigo_reenvio_segundos - (datetime.now(timezone.utc) - enviado).total_seconds()
    return max(0, int(restante + 0.999))


async def enviar_codigo(usuario_id: ObjectId, correo: str, nombre: str, proposito: str = "verificacion") -> None:
    """Genera un código nuevo (el anterior deja de servir) y lo envía. Puede lanzar CorreoNoEnviado."""
    campo, para_que, si_no_fue = PROPOSITOS[proposito]
    codigo = f"{secrets.randbelow(10**6):06d}"
    ahora = datetime.now(timezone.utc)
    await db.usuarios.update_one({"_id": usuario_id}, {"$set": {campo: {
        "codigo_hash": hash_codigo(usuario_id, codigo, proposito),
        "expira": ahora + timedelta(minutes=settings.codigo_minutos),
        "intentos": 0,
        "fecha_envio": ahora,
    }}})

    saludo = saludo_de(nombre)
    minutos = settings.codigo_minutos
    texto = (
        f"{saludo}\n\nTu código para {para_que} en RoomMatch es: {codigo}\n\n"
        f"Vence en {minutos} minutos. {si_no_fue}"
    )
    html = plantilla(saludo, f"""\
  <p>Tu código para {escape(para_que)} es:</p>
  <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; background: #ecfdf5;
            padding: 16px; text-align: center; border-radius: 8px">{codigo}</p>
  <p>Vence en {minutos} minutos.</p>
  <p style="color: #6b7280; font-size: 13px">{escape(si_no_fue)}</p>""")
    await enviar_correo(correo, f"Tu código de RoomMatch: {codigo}", texto, html)


async def revisar_codigo(usuario: dict, codigo: str, proposito: str) -> str | None:
    """None si el código es correcto; si no, el mensaje de error (y suma un intento fallido)."""
    campo = PROPOSITOS[proposito][0]
    pendiente = usuario.get(campo) or {}
    if not pendiente.get("codigo_hash"):
        return "Pide un código primero"
    if pendiente["expira"] <= datetime.now(timezone.utc):
        return "El código venció. Pide uno nuevo"
    if pendiente.get("intentos", 0) >= settings.codigo_max_intentos:
        return "Demasiados intentos con este código. Pide uno nuevo"
    if hmac.compare_digest(pendiente["codigo_hash"], hash_codigo(usuario["_id"], codigo, proposito)):
        return None
    await db.usuarios.update_one({"_id": usuario["_id"]}, {"$inc": {f"{campo}.intentos": 1}})
    quedan = settings.codigo_max_intentos - pendiente.get("intentos", 0) - 1
    return f"Código incorrecto. Te quedan {quedan} intento{'s' if quedan != 1 else ''}" if quedan else \
        "Código incorrecto. Pide uno nuevo"


def saludo_de(nombre: str | None) -> str:
    nombre = (nombre or "").strip().capitalize()
    return f"Hola {nombre}," if nombre else "Hola,"


def plantilla(saludo: str, cuerpo: str) -> str:
    """El HTML común de los correos de RoomMatch."""
    return f"""\
<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0b1f3a">
  <h2 style="color: #0f766e; margin-bottom: 4px">RoomMatch</h2>
  <p>{escape(saludo)}</p>
{cuerpo}
</div>"""
