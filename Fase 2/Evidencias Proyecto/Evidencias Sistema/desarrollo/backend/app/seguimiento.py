"""EP-08 · HU-18: seguimiento de la convivencia después de un match confirmado.

Al mes de confirmado el match (fecha_habilitacion_evaluacion), cada uno de los dos estudiantes
recibe un aviso para evaluar la convivencia y, si a los 7 días no lo ha hecho, un recordatorio
(CA-18.1). Lo que se avisa queda en matches.seguimiento y las evaluaciones en matches.evaluacion.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from app.db import db
from app.notificaciones import notificar

MOMENTO = "mes_1"  # el modelo deja espacio para una evaluación al cierre («cierre»)
RECORDATORIO = timedelta(days=7)
REVISAR_CADA = timedelta(minutes=30)  # cada cuánto la API revisa si hay avisos por enviar


def entrada_de(match: dict, usuario_id) -> dict | None:
    return next(
        (s for s in match.get("seguimiento", []) if s["usuario_id"] == usuario_id and s["momento"] == MOMENTO),
        None,
    )


def evaluacion_de(match: dict, usuario_id) -> dict | None:
    return next(
        (e for e in match.get("evaluacion", []) if e["evaluador_id"] == usuario_id and e["momento"] == MOMENTO),
        None,
    )


async def avisar_evaluaciones() -> None:
    """Envía los avisos y recordatorios que correspondan a esta hora (CA-18.1)."""
    ahora = datetime.now(timezone.utc)
    pendientes = db.matches.find({
        "estado": "confirmado",
        "fecha_habilitacion_evaluacion": {"$lte": ahora},
        "evaluacion.1": {"$exists": False},  # menos de dos evaluaciones: alguien aún no evalúa
    })
    async for match in pendientes:
        titulo = "Cuéntanos cómo va tu convivencia"
        for usuario_id in (match["usuario_a_id"], match["usuario_b_id"]):
            if evaluacion_de(match, usuario_id):
                continue
            entrada = entrada_de(match, usuario_id)
            if entrada is None:
                await db.matches.update_one({"_id": match["_id"]}, {"$push": {"seguimiento": {
                    "usuario_id": usuario_id,
                    "momento": MOMENTO,
                    "fecha_aviso": ahora,
                    "fecha_recordatorio": None,
                    "evaluado": False,
                }}})
                await notificar(usuario_id, "evaluacion_disponible", titulo,
                                "Ya pasó un mes desde que confirmaron su match. Evalúa tu convivencia: nos ayuda a "
                                "mejorar tus próximas recomendaciones.", ("match", match["_id"]))
            elif entrada["fecha_recordatorio"] is None and entrada["fecha_aviso"] <= ahora - RECORDATORIO:
                await db.matches.update_one(
                    {"_id": match["_id"]},
                    {"$set": {"seguimiento.$[s].fecha_recordatorio": ahora}},
                    array_filters=[{"s.usuario_id": usuario_id, "s.momento": MOMENTO}],
                )
                await notificar(usuario_id, "recordatorio_evaluacion", "Aún no evalúas tu convivencia",
                                "Te toma un minuto y nos ayuda a mejorar tus próximas recomendaciones.",
                                ("match", match["_id"]))


async def revisar_periodicamente() -> None:
    """Tarea de fondo que la API inicia al arrancar (main.py)."""
    while True:
        try:
            await avisar_evaluaciones()
        except Exception:  # un error puntual no debe detener la revisión siguiente
            logging.exception("Error al enviar los avisos de evaluación")
        await asyncio.sleep(REVISAR_CADA.total_seconds())
