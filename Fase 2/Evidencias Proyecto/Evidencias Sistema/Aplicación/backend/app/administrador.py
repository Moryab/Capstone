"""Cuenta de administrador que se crea al iniciar la API.

Los índices y los catálogos (comunas e instituciones) no están aquí: los carga el servicio
inicializar-bd con los scripts de la carpeta «Base de datos», antes de que arranque la API.
"""

from datetime import datetime, timezone

from app.config import settings
from app.db import db
from app.security import cifrar_password


async def crear_administrador() -> None:
    """Cuenta de administrador con el correo y la clave del .env (ADMIN_CORREO y ADMIN_PASSWORD).

    Si ya existe no se toca: la clave se cambia directamente en la base o borrando la cuenta.
    No tiene RUT, teléfono ni cuestionario, por lo que nunca aparece como estudiante.
    """
    if not settings.admin_correo or not settings.admin_password:
        return
    correo = settings.admin_correo.lower()
    ahora = datetime.now(timezone.utc)
    await db.usuarios.update_one(
        {"correo": correo},
        {"$setOnInsert": {
            "rut": f"admin:{correo}",  # el índice de RUT es único; el administrador no es estudiante
            "nombre": "Administrador",
            "ap_paterno": "RoomMatch",
            "correo": correo,
            "password": cifrar_password(settings.admin_password),
            "fecha_registro": ahora,
            "fecha_actualizacion": ahora,
            "rol": "administrador",
            "estado_cuenta": "activa",
            "correo_verificado": True,
            "verificacion": {"estado": "no_verificado"},
            "perfil": {"perfil_completo": False, "campos_faltantes": []},
            "seguridad": {"intentos_fallidos": 0, "bloqueado_hasta": None, "token_version": 0},
        }},
        upsert=True,
    )
