"""Envío de correos por SMTP (por ejemplo, un Gmail del proyecto con contraseña de aplicación).

Sin SMTP_HOST en el .env no se envía nada: el correo se escribe en los registros de la API, así en
desarrollo se puede leer el código con «docker compose logs api».
"""

import logging
import smtplib
from email.message import EmailMessage
from email.utils import formataddr

from fastapi.concurrency import run_in_threadpool

from app.config import settings

registro = logging.getLogger("uvicorn.error")


class CorreoNoEnviado(Exception):
    """El servidor de correo rechazó el envío o no respondió."""


def _enviar(destino: str, asunto: str, texto: str, html: str | None) -> None:
    mensaje = EmailMessage()
    mensaje["From"] = formataddr(("RoomMatch", settings.smtp_remitente or settings.smtp_usuario))
    mensaje["To"] = destino
    mensaje["Subject"] = asunto
    mensaje.set_content(texto)
    if html:
        mensaje.add_alternative(html, subtype="html")

    clase = smtplib.SMTP_SSL if settings.smtp_port == 465 else smtplib.SMTP
    with clase(settings.smtp_host, settings.smtp_port, timeout=20) as servidor:
        if settings.smtp_port != 465:
            servidor.starttls()
        if settings.smtp_usuario:
            servidor.login(settings.smtp_usuario, settings.smtp_password)
        servidor.send_message(mensaje)


async def enviar_correo(destino: str, asunto: str, texto: str, html: str | None = None) -> None:
    if not settings.smtp_host:
        registro.warning("SMTP sin configurar. Correo para %s | %s\n%s", destino, asunto, texto)
        return
    try:
        await run_in_threadpool(_enviar, destino, asunto, texto, html)
    except (smtplib.SMTPException, OSError) as e:
        registro.exception("No se pudo enviar el correo a %s", destino)
        raise CorreoNoEnviado(str(e)) from e
