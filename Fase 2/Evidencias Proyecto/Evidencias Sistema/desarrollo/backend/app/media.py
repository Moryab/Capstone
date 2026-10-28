"""Guardado de las fotos de perfil en disco. Se sirven como archivos estáticos bajo URL_MEDIA."""

import secrets
from pathlib import Path

from app.config import settings

URL_MEDIA = "/api/media"
URL_FOTOS = f"{URL_MEDIA}/fotos"
CARPETA_FOTOS = Path(settings.media_dir) / "fotos"

# Se mira el contenido real del archivo, no su nombre ni lo que declara el navegador
FIRMAS = {
    b"\xff\xd8\xff": "jpg",
    b"\x89PNG\r\n\x1a\n": "png",
}


def tipo_imagen(contenido: bytes) -> str | None:
    """Devuelve la extensión si el archivo es JPG, PNG o WebP; si no, None."""
    for firma, extension in FIRMAS.items():
        if contenido.startswith(firma):
            return extension
    if contenido[:4] == b"RIFF" and contenido[8:12] == b"WEBP":
        return "webp"
    return None


def guardar_foto(usuario_id: str, contenido: bytes, extension: str) -> str:
    """Guarda la foto con un nombre nuevo (así el navegador no muestra la anterior) y devuelve su URL."""
    CARPETA_FOTOS.mkdir(parents=True, exist_ok=True)
    nombre = f"{usuario_id}-{secrets.token_hex(8)}.{extension}"
    (CARPETA_FOTOS / nombre).write_bytes(contenido)
    return f"{URL_FOTOS}/{nombre}"


def borrar_foto(url: str | None) -> None:
    """Borra del disco una foto guardada por guardar_foto. Ignora URLs ajenas o archivos que ya no están."""
    if not url or not url.startswith(f"{URL_FOTOS}/"):
        return
    # Path(...).name evita que una URL manipulada apunte fuera de la carpeta
    (CARPETA_FOTOS / Path(url).name).unlink(missing_ok=True)
