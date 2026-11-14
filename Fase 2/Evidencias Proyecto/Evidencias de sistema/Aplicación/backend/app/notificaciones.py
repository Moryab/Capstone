"""Avisos dentro de la plataforma (colección notificaciones del modelo de datos).

Cualquier parte del backend avisa a un usuario con `notificar(...)`. El estudiante los ve en la
campana de la barra lateral (GET /api/notificaciones).
"""

from datetime import datetime, timezone

from bson import ObjectId

from app.db import db, siguiente_codigo

# Tipos del modelo de datos; el frontend decide a qué página lleva cada uno (notificaciones.js)
TIPOS = (
    "verificacion_correo", "verificacion_estudiante", "nuevo_match", "respuesta_match", "match_confirmado",
    "evaluacion_disponible", "recordatorio_evaluacion", "reporte_resuelto", "accion_moderacion",
    "recuperacion_password", "confirmar_preferencia",
)


async def notificar(
    usuario_id: ObjectId,
    tipo: str,
    titulo: str,
    mensaje: str,
    referencia: tuple[str, ObjectId] | None = None,
) -> None:
    """Deja un aviso para el usuario. `referencia` es (tipo_entidad, id), por ejemplo ("match", id)."""
    assert tipo in TIPOS, f"Tipo de notificación desconocido: {tipo}"
    tipo_entidad, entidad_id = referencia or (None, None)
    await db.notificaciones.insert_one({
        "codigo": await siguiente_codigo("notificaciones"),
        "usuario_id": usuario_id,
        "tipo": tipo,
        "titulo": titulo,
        "mensaje": mensaje,
        "leido": False,
        "fecha_lectura": None,
        "estado_envio": "enviado",
        "fecha_programada": None,
        "fecha_notificacion": datetime.now(timezone.utc),
        "referencia": {"tipo_entidad": tipo_entidad, "entidad_id": entidad_id},
    })
