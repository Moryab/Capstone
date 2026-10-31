"""Rol del estudiante en RoomMatch: «buscador» (busca alojamiento) u «oferente» (ofrece uno).

Cada estudiante tiene un rol a la vez, guardado en usuarios.modo (None mientras no elige) junto
con usuarios.fecha_cambio_modo. Un match siempre une a un buscador con un oferente y una de sus
publicaciones (matching.py). usuarios.buscando_alojamiento sigue indicando si un buscador tiene
la búsqueda activa o pausada; un oferente siempre la tiene apagada.
"""

from datetime import datetime, timezone
from typing import Literal

from app.db import db
from app.matching import ABIERTAS, generar_propuestas

Modo = Literal["buscador", "oferente"]
MODOS = ("buscador", "oferente")

CON_CONVIVENCIA = "Puedes cambiar de rol cuando termines tu convivencia actual"


class CambioNoPermitido(Exception):
    """El rol no se puede cambiar; el mensaje explica por qué."""


async def tiene_convivencia(usuario: dict) -> bool:
    """Convivencia activa como buscador (match_activo_id) o como oferente (un match confirmado
    sobre una de sus publicaciones)."""
    if usuario.get("match_activo_id"):
        return True
    return bool(await db.matches.count_documents({"usuario_b_id": usuario["_id"], "estado": "confirmado"}, limit=1))


async def resumen_cambio(usuario: dict) -> dict:
    """Lo que cambiaría al pasar al otro rol, para explicarlo antes de confirmar."""
    yo = usuario["_id"]
    return {
        "modo": usuario.get("modo"),
        "con_convivencia": await tiene_convivencia(usuario),
        "buscando": bool(usuario.get("buscando_alojamiento")),
        "propuestas_como_buscador": await db.matches.count_documents({"usuario_a_id": yo, "estado": {"$in": ABIERTAS}}),
        "propuestas_como_oferente": await db.matches.count_documents({"usuario_b_id": yo, "estado": {"$in": ABIERTAS}}),
        "publicaciones_activas": await db.publicaciones.count_documents({"oferente_id": yo, "estado": "activa"}),
        "publicaciones_pausadas": await db.publicaciones.count_documents({"oferente_id": yo, "estado": "pausada"}),
    }


async def _expirar(filtro: dict, ahora: datetime) -> int:
    resultado = await db.matches.update_many(
        {**filtro, "estado": {"$in": ABIERTAS}}, {"$set": {"estado": "expirado", "fecha_respuesta": ahora}}
    )
    return resultado.modified_count


async def cambiar_modo(usuario: dict, nuevo: Modo) -> dict:
    """Asigna o cambia el rol. Devuelve qué se hizo, para contárselo al usuario.

    - A oferente: se pausa la búsqueda y vencen sus propuestas abiertas como buscador. Las
      publicaciones que había pausado al pasar a buscador vuelven a estar visibles.
    - A buscador: sus publicaciones activas pasan a «pausada» y vencen sus propuestas abiertas
      como oferente. La búsqueda queda apagada hasta que la active (con sus preferencias).
    """
    actual = usuario.get("modo")
    if actual == nuevo:
        return {"modo": nuevo, "cambio": False}
    if actual is not None and await tiene_convivencia(usuario):
        raise CambioNoPermitido(CON_CONVIVENCIA)

    yo = usuario["_id"]
    ahora = datetime.now(timezone.utc)
    resultado = {"modo": nuevo, "cambio": True, "propuestas_cerradas": 0, "publicaciones_pausadas": 0,
                 "publicaciones_reactivadas": 0}
    cambios = {"modo": nuevo, "fecha_cambio_modo": ahora, "fecha_actualizacion": ahora}

    if nuevo == "oferente":
        cambios["buscando_alojamiento"] = False
        resultado["propuestas_cerradas"] = await _expirar({"usuario_a_id": yo}, ahora)
        # Las pausadas por el rol vuelven según sus cupos (sin cupos quedan «completa»)
        for estado, cupos in (("activa", {"$gt": 0}), ("completa", 0)):
            r = await db.publicaciones.update_many(
                {"oferente_id": yo, "estado": "pausada", "cupos_disponibles": cupos},
                {"$set": {"estado": estado, "fecha_ultima_modificacion": ahora}},
            )
            resultado["publicaciones_reactivadas"] += r.modified_count
    else:
        resultado["propuestas_cerradas"] = await _expirar({"usuario_b_id": yo}, ahora)
        r = await db.publicaciones.update_many(
            {"oferente_id": yo, "estado": "activa"},
            {"$set": {"estado": "pausada", "fecha_ultima_modificacion": ahora}},
        )
        resultado["publicaciones_pausadas"] = r.modified_count

    await db.usuarios.update_one({"_id": yo}, {"$set": cambios})
    if resultado["propuestas_cerradas"] or resultado["publicaciones_reactivadas"]:
        await generar_propuestas()  # se liberaron espacios para otros buscadores
    return resultado


async def migrar_modos() -> int:
    """Asigna el rol a los estudiantes que aún no lo tienen (cuentas anteriores a este cambio).

    - Con una publicación activa o completa → oferente (si buscaba, se pausa la búsqueda y
      vencen sus propuestas como buscador).
    - Si no, con la búsqueda activada o en una convivencia como buscador → buscador.
    - Si no cumple ninguna → None: elige en su próximo inicio de sesión.
    Solo toca a quienes no tienen el campo, así que se puede ejecutar en cada arranque.
    """
    ahora = datetime.now(timezone.utc)
    migrados = 0
    async for u in db.usuarios.find({"rol": "estudiante", "modo": {"$exists": False}}):
        publica = await db.publicaciones.count_documents(
            {"oferente_id": u["_id"], "estado": {"$in": ["activa", "completa"]}}, limit=1
        )
        cambios: dict = {"fecha_cambio_modo": ahora}
        if publica:
            cambios |= {"modo": "oferente", "buscando_alojamiento": False}
            await _expirar({"usuario_a_id": u["_id"]}, ahora)
        elif u.get("buscando_alojamiento") or u.get("match_activo_id"):
            cambios["modo"] = "buscador"
        else:
            cambios = {"modo": None, "fecha_cambio_modo": None}
        await db.usuarios.update_one({"_id": u["_id"]}, {"$set": cambios})
        migrados += 1
    return migrados
