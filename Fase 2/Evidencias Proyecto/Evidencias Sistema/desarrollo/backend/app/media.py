"""Guardado de fotos en disco (perfil y alojamientos). Se sirven como archivos estáticos bajo URL_MEDIA."""

import secrets
from pathlib import Path

from app.config import settings

URL_MEDIA = "/api/media"

# Cada tipo de foto tiene su carpeta: nombre de la subcarpeta -> ruta en disco
CARPETAS = {
    "fotos": Path(settings.media_dir) / "fotos",  # fotos de perfil
    "publicaciones": Path(settings.media_dir) / "publicaciones",
}
CARPETA_FOTOS = CARPETAS["fotos"]

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


def _guardar(carpeta: str, prefijo: str, contenido: bytes, extension: str) -> str:
    """Guarda con un nombre nuevo (así el navegador no muestra una foto anterior) y devuelve su URL."""
    CARPETAS[carpeta].mkdir(parents=True, exist_ok=True)
    nombre = f"{prefijo}-{secrets.token_hex(8)}.{extension}"
    (CARPETAS[carpeta] / nombre).write_bytes(contenido)
    return f"{URL_MEDIA}/{carpeta}/{nombre}"


def guardar_foto(usuario_id: str, contenido: bytes, extension: str) -> str:
    return _guardar("fotos", usuario_id, contenido, extension)


def guardar_foto_publicacion(publicacion_id: str, contenido: bytes, extension: str) -> str:
    return _guardar("publicaciones", publicacion_id, contenido, extension)


def borrar_foto(url: str | None) -> None:
    """Borra del disco una foto guardada aquí. Ignora URLs ajenas o archivos que ya no están."""
    for carpeta, ruta in CARPETAS.items():
        if url and url.startswith(f"{URL_MEDIA}/{carpeta}/"):
            # Path(...).name evita que una URL manipulada apunte fuera de la carpeta
            (ruta / Path(url).name).unlink(missing_ok=True)
            return
