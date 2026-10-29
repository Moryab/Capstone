"""HU-17: propuestas de match entre un estudiante que busca alojamiento y el oferente de uno.

RoomMatch es quien propone: junta a cada buscador (quien activó «Estoy buscando alojamiento») con
alojamientos activos con cupos cuyo oferente tiene compatibilidad alta con él, que no estén
descartados y que cumplan sus preferencias de búsqueda guardadas. Ambos responden; si los dos
aceptan, el match queda confirmado y empieza la convivencia.

En cada match, usuario_a es el buscador y usuario_b el oferente.
"""

from datetime import datetime, timedelta, timezone

from bson import ObjectId
from pymongo import ReturnDocument

from app.compatibilidad import CANDIDATOS, NIVEL_ALTO, PARAMETROS_VERSION
from app.db import db, siguiente_codigo
from app.schemas.busqueda import Preferencias, filtro_preferencias

ABIERTAS = ["sugerido", "pendiente"]  # sin respuesta de ninguno o de uno de los dos
VIGENCIA = timedelta(days=7)  # sin la respuesta de ambos en este plazo, la propuesta vence
MAX_ABIERTAS = 3  # propuestas abiertas a la vez por buscador
DIAS_EVALUACION = 30  # HU-18: la evaluación de la convivencia se habilita al mes


def es_buscador(usuario: dict | None = None) -> dict:
    """Condición de Mongo para quienes pueden recibir propuestas como buscadores (o solo ese usuario)."""
    return {
        **CANDIDATOS,
        "buscando_alojamiento": True,
        "match_activo_id": None,  # CA-17.4: una convivencia activa a la vez
        **({"_id": usuario["_id"]} if usuario else {}),
    }


async def notificar(
    usuario_id: ObjectId, tipo: str, titulo: str, mensaje: str, entidad_id: ObjectId,
    tipo_entidad: str = "publicacion",
) -> None:
    """Deja el aviso en notificaciones (CA-17.2 y CA-17.3), según el modelo de datos.

    La verificación de estudiante (HU-22) también la usa, con tipo_entidad «usuario».
    """
    ahora = datetime.now(timezone.utc)
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
        "fecha_notificacion": ahora,
        "referencia": {"tipo_entidad": tipo_entidad, "entidad_id": entidad_id},
    })


async def expirar_vencidas() -> None:
    """Las propuestas sin la respuesta de ambos después de VIGENCIA pasan a «expirado»."""
    ahora = datetime.now(timezone.utc)
    await db.matches.update_many(
        {"estado": {"$in": ABIERTAS}, "fecha_sugerencia": {"$lte": ahora - VIGENCIA}},
        {"$set": {"estado": "expirado", "fecha_respuesta": ahora}},
    )


async def cerrar_propuestas_de_publicacion(publicacion_id: ObjectId) -> None:
    """El alojamiento se eliminó o se quedó sin cupos: sus propuestas abiertas ya no sirven."""
    await db.matches.update_many(
        {"publicacion_id": publicacion_id, "estado": {"$in": ABIERTAS}},
        {"$set": {"estado": "expirado", "fecha_respuesta": datetime.now(timezone.utc)}},
    )


async def _proponer_a(buscador: dict) -> int:
    """Crea las propuestas que le falten al buscador para llegar a MAX_ABIERTAS."""
    yo = buscador["_id"]
    faltan = MAX_ABIERTAS - await db.matches.count_documents({"usuario_a_id": yo, "estado": {"$in": ABIERTAS}})
    if faltan <= 0:
        return 0

    # Cada alojamiento se le propone una sola vez; con un mismo oferente, una propuesta abierta a la vez
    anteriores = [m async for m in db.matches.find({"usuario_a_id": yo}, {"publicacion_id": 1, "usuario_b_id": 1, "estado": 1})]
    ya_propuestas = [m["publicacion_id"] for m in anteriores]
    oferentes_abiertos = {m["usuario_b_id"] for m in anteriores if m["estado"] in ABIERTAS}

    # Compatibilidad alta (75 % o más) y sin conflicto en algo imprescindible
    compatibles = {}
    async for c in db.compatibilidades.find({
        "$or": [{"usuario_a_id": yo}, {"usuario_b_id": yo}],
        "vigente": True,
        "descartado": False,
        "porcentaje": {"$gte": NIVEL_ALTO},
    }):
        otro = c["usuario_b_id"] if c["usuario_a_id"] == yo else c["usuario_a_id"]
        if otro not in oferentes_abiertos:
            compatibles[otro] = c
    if not compatibles:
        return 0
    activos = {u["_id"] async for u in db.usuarios.find({**CANDIDATOS, "_id": {"$in": list(compatibles)}}, {"_id": 1})}

    consulta = {
        "estado": "activa",
        "cupos_disponibles": {"$gt": 0},
        "oferente_id": {"$in": list(activos)},
        "_id": {"$nin": ya_propuestas},
        # El género que pide la publicación debe calzar con el del buscador
        "genero_preferido": {"$in": ["indiferente", buscador.get("genero")]},
    }
    # Con preferencias guardadas (CA-12.2), solo alojamientos que las cumplan
    if guardadas := buscador.get("preferencias_busqueda"):
        consulta.update(filtro_preferencias(Preferencias.model_validate(guardadas)))
        if guardadas.get("comunas_ids"):
            consulta["ubicacion.comuna_id"] = {"$in": guardadas["comunas_ids"]}

    publicaciones = [p async for p in db.publicaciones.find(consulta, {"oferente_id": 1, "titulo": 1, "fecha_publicacion": 1})]
    # Primero los oferentes más compatibles; entre iguales, el alojamiento más reciente
    publicaciones.sort(key=lambda p: p["fecha_publicacion"], reverse=True)
    publicaciones.sort(key=lambda p: compatibles[p["oferente_id"]]["porcentaje"], reverse=True)

    elegidas, oferentes = [], set()
    for p in publicaciones:
        if p["oferente_id"] not in oferentes:
            elegidas.append(p)
            oferentes.add(p["oferente_id"])
        if len(elegidas) == faltan:
            break
    if not elegidas:
        return 0

    ahora = datetime.now(timezone.utc)
    sin_respuesta = {"estado": "pendiente", "fecha_respuesta": None, "motivo_rechazo": None}
    primero = await siguiente_codigo("matches", len(elegidas))
    documentos = []
    for i, p in enumerate(elegidas):
        c = compatibles[p["oferente_id"]]
        documentos.append({
            "codigo": primero + i,
            "usuario_a_id": yo,
            "usuario_b_id": p["oferente_id"],
            "compatibilidad_id": c["_id"],
            "pctj_compatibilidad": c["porcentaje"],
            "publicacion_id": p["_id"],
            "estado": "sugerido",
            "resultado": "pendiente",
            "fecha_sugerencia": ahora,
            "fecha_respuesta": None,
            "fecha_confirmacion": None,
            "fecha_inicio_convivencia": None,
            "fecha_habilitacion_evaluacion": None,
            "fecha_fin_convivencia": None,
            "motivo_fin": None,
            "duracion_convivencia_dias": None,
            "parametros_version": PARAMETROS_VERSION,
            "respuesta_a": dict(sin_respuesta),
            "respuesta_b": dict(sin_respuesta),
            "evaluacion": [],
            "seguimiento": [],
        })
    await db.matches.insert_many(documentos)

    for p in elegidas:
        await notificar(yo, "nuevo_match", "Tienes una nueva propuesta de match",
                        f"RoomMatch te propone «{p['titulo']}». Revísala y dinos si te interesa.", p["_id"])
        await notificar(p["oferente_id"], "nuevo_match", "Tienes una nueva propuesta de match",
                        f"RoomMatch encontró a alguien compatible para «{p['titulo']}».", p["_id"])
    return len(documentos)


async def generar_propuestas(buscador: dict | None = None) -> int:
    """Completa las propuestas de un buscador o, sin argumento, las de todos.

    Se llama cuando cambia algo que puede crear nuevas parejas: alguien activa la búsqueda, guarda
    el cuestionario, se publica o edita un alojamiento, o una propuesta se cierra y libera un cupo.
    """
    await expirar_vencidas()
    creadas = 0
    async for b in db.usuarios.find(es_buscador(buscador)):
        creadas += await _proponer_a(b)
    return creadas


class MatchNoDisponible(Exception):
    """La propuesta no se puede responder; el mensaje explica por qué."""


async def responder(match: dict, usuario: dict, acepta: bool, motivo: str | None) -> dict:
    """CA-17.2 y CA-17.3: registra la respuesta de uno de los dos y, si ambos aceptan, confirma."""
    yo = usuario["_id"]
    soy_a = match["usuario_a_id"] == yo
    mia, suya = ("respuesta_a", "respuesta_b") if soy_a else ("respuesta_b", "respuesta_a")
    otro = match["usuario_b_id"] if soy_a else match["usuario_a_id"]
    ahora = datetime.now(timezone.utc)

    if acepta and soy_a and usuario.get("match_activo_id"):
        raise MatchNoDisponible("Ya tienes una convivencia activa")  # CA-17.4

    respuesta = {"estado": "aceptado" if acepta else "rechazado", "fecha_respuesta": ahora, "motivo_rechazo": motivo}
    cambios = {mia: respuesta}
    if not acepta:
        cambios |= {"estado": "rechazado", "fecha_respuesta": ahora}
    # Solo si sigue abierta y aún no respondí: evita dobles respuestas
    match = await db.matches.find_one_and_update(
        {"_id": match["_id"], "estado": {"$in": ABIERTAS}, f"{mia}.estado": "pendiente"},
        {"$set": cambios},
        return_document=ReturnDocument.AFTER,
    )
    if not match:
        raise MatchNoDisponible("Esta propuesta ya no está disponible")

    nombre = usuario["nombre"][:1].upper() + usuario["nombre"][1:]
    if not acepta:
        await notificar(otro, "respuesta_match", "Una propuesta de match no siguió adelante",
                        f"{nombre} rechazó la propuesta. RoomMatch seguirá buscando opciones para ti.",
                        match["publicacion_id"])
        await generar_propuestas()  # el buscador quedó con un espacio libre
        return match

    if match[suya]["estado"] != "aceptado":
        match = await db.matches.find_one_and_update(
            {"_id": match["_id"], "estado": "sugerido"}, {"$set": {"estado": "pendiente"}},
            return_document=ReturnDocument.AFTER,
        ) or await db.matches.find_one({"_id": match["_id"]})
        if match[suya]["estado"] != "aceptado":
            await notificar(otro, "respuesta_match", "Aceptaron tu propuesta de match",
                            f"{nombre} aceptó la propuesta. Falta tu respuesta.", match["publicacion_id"])
            return match

    return await _confirmar(match)


async def _confirmar(match: dict) -> dict:
    """Ambos aceptaron: se toma un cupo del alojamiento y empieza la convivencia (CA-17.2)."""
    ahora = datetime.now(timezone.utc)
    buscador_id, oferente_id = match["usuario_a_id"], match["usuario_b_id"]

    # Solo una de dos respuestas simultáneas llega a confirmar
    match = await db.matches.find_one_and_update(
        {"_id": match["_id"], "estado": {"$in": ABIERTAS}},
        {"$set": {"estado": "confirmado"}},
        return_document=ReturnDocument.AFTER,
    )
    if not match:
        raise MatchNoDisponible("Esta propuesta ya no está disponible")

    buscador = await db.usuarios.find_one_and_update(
        {"_id": buscador_id, "match_activo_id": None},
        {"$set": {"match_activo_id": match["_id"], "buscando_alojamiento": False}},
    )
    pub = None
    if buscador:
        pub = await db.publicaciones.find_one_and_update(
            {"_id": match["publicacion_id"], "estado": "activa", "cupos_disponibles": {"$gt": 0}},
            {"$inc": {"cupos_disponibles": -1}},
            return_document=ReturnDocument.AFTER,
        )
    if not buscador or not pub:
        # El buscador ya confirmó otra convivencia o el alojamiento se llenó mientras respondían
        if buscador:
            await db.usuarios.update_one(
                {"_id": buscador_id}, {"$set": {"match_activo_id": None, "buscando_alojamiento": True}}
            )
        await db.matches.update_one({"_id": match["_id"]}, {"$set": {"estado": "expirado", "fecha_respuesta": ahora}})
        raise MatchNoDisponible("El alojamiento ya no tiene cupos disponibles" if buscador else "Ya tienes una convivencia activa")

    cambios = {
        "fecha_respuesta": ahora,
        "fecha_confirmacion": ahora,
        "fecha_inicio_convivencia": ahora,
        "fecha_habilitacion_evaluacion": ahora + timedelta(days=DIAS_EVALUACION),
    }
    await db.matches.update_one({"_id": match["_id"]}, {"$set": cambios})
    match |= cambios

    # Las demás propuestas del buscador se cierran; si el alojamiento se llenó, también las suyas
    await db.matches.update_many(
        {"usuario_a_id": buscador_id, "estado": {"$in": ABIERTAS}},
        {"$set": {"estado": "expirado", "fecha_respuesta": ahora}},
    )
    if pub["cupos_disponibles"] == 0:
        await db.publicaciones.update_one({"_id": pub["_id"]}, {"$set": {"estado": "completa"}})
        await cerrar_propuestas_de_publicacion(pub["_id"])

    for usuario_id in (buscador_id, oferente_id):
        await notificar(usuario_id, "match_confirmado", "¡Match confirmado!",
                        f"Ambos aceptaron la propuesta para «{pub['titulo']}». Su convivencia comienza hoy.",
                        pub["_id"])
    return match
