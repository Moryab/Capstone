"""EP-08 · HU-18 y HU-19: seguimiento de la convivencia después de un match confirmado.

Al mes de confirmado el match (fecha_habilitacion_evaluacion), cada uno de los dos estudiantes
recibe un aviso para evaluar la convivencia y, si a los 7 días no lo ha hecho, un recordatorio
(CA-18.1). Lo que se avisa queda en matches.seguimiento y las evaluaciones en matches.evaluacion.

Si la convivencia no funcionó, las razones que indica el estudiante ajustan su peso personal por
categoría (usuarios.ajuste_recomendacion) y sus próximas compatibilidades lo consideran (HU-19).
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from pymongo import ReturnDocument

from app.compatibilidad import AJUSTE_PERSONAL_MAX, FACTOR_GRAVEDAD, INCREMENTO_POR_RAZON, recalcular
from app.db import db
from app.matching import generar_propuestas
from app.notificaciones import notificar
from app.schemas.cuestionario import CATEGORIAS

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


async def aprender_de_razones(usuario: dict, razones: list[dict]) -> dict:
    """CA-19.4: sube el peso personal de las categorías que causaron problemas en la convivencia.

    Solo cuentan las categorías del cuestionario; gastos, comunicación u otra quedan registradas
    para las estadísticas (HU-20) pero no cambian el cálculo. Devuelve el usuario actualizado.
    """
    ahora = datetime.now(timezone.utc)
    ajuste = usuario.get("ajuste_recomendacion") or {}
    aprendizaje = {a["categoria"]: a for a in ajuste.get("aprendizaje", [])}

    for r in razones:
        if r["razon"] not in CATEGORIAS:
            continue
        a = aprendizaje.setdefault(r["razon"], {
            "categoria": r["razon"],
            "peso_personal": 1.0,
            "veces_cedio": 0,
            "veces_rechazo": 0,
            "veces_problema_convivencia": 0,
            "tendencia": None,
            "confianza": 0.0,
            "sugerir_actualizacion": False,
            "fecha_actualizacion": ahora,
        })
        a["veces_problema_convivencia"] += 1
        a["peso_personal"] = min(
            AJUSTE_PERSONAL_MAX, round(a["peso_personal"] + INCREMENTO_POR_RAZON * FACTOR_GRAVEDAD[r["gravedad"]], 2)
        )
        a["tendencia"] = "menos_tolerante"  # en esto le cuesta más ceder de lo que respondió
        a["confianza"] = round(min(1.0, a["veces_problema_convivencia"] / 3), 2)
        # Si se repite, quizás convenga que revise su respuesta en el cuestionario
        a["sugerir_actualizacion"] = a["veces_problema_convivencia"] >= 2
        a["fecha_actualizacion"] = ahora

    categorias = set(ajuste.get("categorias_problema", [])) | {r["razon"] for r in razones if r["razon"] != "otra"}
    cambios = {
        "ajuste_recomendacion.categorias_problema": sorted(categorias),
        "ajuste_recomendacion.aprendizaje": list(aprendizaje.values()),
        "ajuste_recomendacion.fecha_actualizacion": ahora,
    }
    await db.usuarios.update_one({"_id": usuario["_id"]}, {"$set": cambios})
    actualizado = await db.usuarios.find_one({"_id": usuario["_id"]})
    if (actualizado.get("cuestionario") or {}).get("completo"):
        await recalcular(actualizado)
        await generar_propuestas()
    return actualizado


class NoSePuedeTerminar(Exception):
    """La convivencia ya no está activa."""


async def terminar_convivencia(match: dict, usuario: dict, motivo: str, razones: list[dict],
                               razon_otra_detalle: str | None, comentario: str | None,
                               seguir_buscando: bool) -> dict:
    """Cualquiera de los dos termina la convivencia; el buscador queda libre para un nuevo match.

    Si fue por incompatibilidad, las razones quedan como evaluación de cierre y ajustan las
    próximas recomendaciones (HU-19). El cupo vuelve al alojamiento.
    """
    ahora = datetime.now(timezone.utc)
    yo = usuario["_id"]
    otro = match["usuario_b_id"] if match["usuario_a_id"] == yo else match["usuario_a_id"]
    inicio = match["fecha_inicio_convivencia"]
    cambios = {
        "estado": "finalizado",
        "fecha_fin_convivencia": ahora,
        "motivo_fin": motivo,
        "duracion_convivencia_dias": (ahora - inicio).days if inicio else 0,
    }
    if motivo == "incompatibilidad":
        cambios["resultado"] = "no_exitoso"
    # Solo una vez, aunque los dos la terminen al mismo tiempo
    match = await db.matches.find_one_and_update(
        {"_id": match["_id"], "estado": "confirmado"}, {"$set": cambios}, return_document=ReturnDocument.AFTER
    )
    if not match:
        raise NoSePuedeTerminar("Esta convivencia ya terminó")

    if razones or comentario:
        await db.matches.update_one({"_id": match["_id"]}, {"$push": {"evaluacion": {
            "evaluador_id": yo,
            "evaluado_id": otro,
            "momento": "cierre",
            "funciona": motivo != "incompatibilidad",
            "calificacion": None,
            "comentario": comentario,
            "razones": razones,
            "razon_otra_detalle": razon_otra_detalle,
            "fecha_eval": ahora,
        }}})

    # El buscador puede volver a buscar; si lo pidió, RoomMatch le propone de inmediato
    buscador_id = match["usuario_a_id"]
    await db.usuarios.update_one(
        {"_id": buscador_id, "match_activo_id": match["_id"]},
        {"$set": {"match_activo_id": None, "buscando_alojamiento": seguir_buscando and buscador_id == yo}},
    )

    # El cupo vuelve al alojamiento (si sigue publicado) y puede proponerse a otros
    pub = await db.publicaciones.find_one({"_id": match["publicacion_id"]})
    if pub and pub["estado"] in ("activa", "completa") and pub["cupos_disponibles"] < pub["cupos_totales"]:
        await db.publicaciones.update_one(
            {"_id": pub["_id"]}, {"$inc": {"cupos_disponibles": 1}, "$set": {"estado": "activa"}}
        )

    nombre = usuario["nombre"][:1].upper() + usuario["nombre"][1:]
    texto = f"{nombre} terminó la convivencia en «{pub['titulo'] if pub else 'el alojamiento'}»."
    if otro == buscador_id:
        texto += " Si necesitas otro lugar, activa «Estoy buscando alojamiento» en tus propuestas."
    await notificar(otro, "respuesta_match", "Una convivencia terminó", texto, ("match", match["_id"]))

    if razones:
        await aprender_de_razones(usuario, razones)  # también recalcula y genera propuestas
    else:
        await generar_propuestas()
    return await db.matches.find_one({"_id": match["_id"]})


async def revisar_periodicamente() -> None:
    """Tarea de fondo que la API inicia al arrancar (main.py)."""
    while True:
        try:
            await avisar_evaluaciones()
        except Exception:  # un error puntual no debe detener la revisión siguiente
            logging.exception("Error al enviar los avisos de evaluación")
        await asyncio.sleep(REVISAR_CADA.total_seconds())
