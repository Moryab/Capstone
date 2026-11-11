"""EP-08: la plataforma ajusta sola el peso general de cada hábito con las convivencias evaluadas.

Es la parte general de la mejora continua; la personal (HU-19) está en seguimiento.py. Cada cierto
número de convivencias evaluadas, RoomMatch:

1. Analiza: compara, hábito por hábito, cuántas convivencias fracasan cuando el par difiere en él y
   cuántas cuando coincide (el mismo análisis que ve el administrador en estadísticas).
2. Propone: si al diferir en un hábito se fracasa claramente más, sube su peso; si se fracasa
   claramente menos, lo baja. «Claramente» es una diferencia de al menos UMBRAL_DIFERENCIA puntos
   que además no se explica por azar (prueba de diferencia de proporciones, 95 % de confianza).
   Los cambios son graduales y con tope.
3. Valida: vuelve a calcular las convivencias ya evaluadas con los pesos propuestos y revisa si los
   match que se habrían propuesto (compatibilidad alta) tienen igual o mejor tasa de éxito.
4. Aplica: si la validación resulta, crea una nueva versión en parametros_algoritmo, recalcula
   todas las compatibilidades y genera propuestas. Si no, el ajuste queda como rechazado.

Cada revisión queda en ajustes_algoritmo (con o sin cambios), como evidencia de lo que aprendió.
Nadie tiene que aprobarla: creado_por y revisado_por quedan vacíos porque los decide la plataforma.
"""

import asyncio
import logging
import math
from datetime import datetime, timezone

from app.compatibilidad import (
    NIVEL_ALTO, PESOS_CATEGORIA_INICIALES, parametros_vigentes, recalcular_todos,
)
from app.db import db, siguiente_codigo
from app.matching import generar_propuestas
from app.schemas.cuestionario import CATEGORIAS

# Protecciones para que no aprenda de la casualidad
MINIMO_CASOS_AJUSTE = 20      # convivencias evaluadas antes del primer ajuste
NUEVOS_CASOS_REVISION = 10    # convivencias evaluadas nuevas para volver a revisar
MINIMO_CASOS_GRUPO = 5        # casos que difieren y casos que coinciden, para comparar un hábito
UMBRAL_DIFERENCIA = 15.0      # puntos de diferencia en la tasa de fracaso para mover un peso
Z_CONFIANZA = 1.96            # 95 % de confianza en que la diferencia no es casualidad
PASO_MAXIMO = 0.25            # cuánto puede cambiar un peso en una revisión
PESO_CATEGORIA_MIN = 0.5
PESO_CATEGORIA_MAX = 2.0
MINIMO_VALIDACION = 10        # match que se habrían propuesto con los pesos nuevos, para validar

_revisando = asyncio.Lock()   # una revisión a la vez
_tareas: set[asyncio.Task] = set()


def porcentaje(parte: int, total: int) -> float | None:
    return round(100 * parte / total, 1) if total else None


def coma(valor: float | None) -> str:
    """12.5 → «12,5» para los textos que ve el administrador."""
    return "—" if valor is None else f"{valor:.1f}".replace(".", ",")


def es_significativa(fracasos_1: int, casos_1: int, fracasos_2: int, casos_2: int) -> bool:
    """Prueba z de diferencia de proporciones: ¿la diferencia de tasas de fracaso es más que azar?"""
    if not casos_1 or not casos_2:
        return False
    conjunta = (fracasos_1 + fracasos_2) / (casos_1 + casos_2)
    error = math.sqrt(conjunta * (1 - conjunta) * (1 / casos_1 + 1 / casos_2))
    if error == 0:
        return False  # todos fracasaron o ninguno: no hay diferencia que medir
    return abs(fracasos_1 / casos_1 - fracasos_2 / casos_2) / error >= Z_CONFIANZA


def fecha_resultado(match: dict) -> datetime | None:
    """Cuándo quedó el resultado: la última evaluación, o el término si no la hubo."""
    fechas = [e["fecha_eval"] for e in match.get("evaluacion", [])]
    return max(fechas) if fechas else match.get("fecha_fin_convivencia")


async def compatibilidades_de(matches: list[dict]) -> dict:
    """La compatibilidad con que se propuso cada match (los cálculos viejos quedan como historial)."""
    ids = [m["compatibilidad_id"] for m in matches if m.get("compatibilidad_id")]
    return {
        c["_id"]: c
        async for c in db.compatibilidades.find({"_id": {"$in": ids}}, {"categorias_diferentes": 1, "detalle": 1})
    }


def analizar_categorias(casos: list[tuple[bool, set]]) -> list[dict]:
    """Para cada hábito, la tasa de fracaso cuando el par difiere en él frente a cuando coincide.

    `casos`: (fracasó, categorías en que el par difería). Primero los hábitos que más suben el
    fracaso; los que no se pueden comparar, al final.
    """
    filas = []
    for categoria in CATEGORIAS:
        con = [fracaso for fracaso, difieren in casos if categoria in difieren]
        sin = [fracaso for fracaso, difieren in casos if categoria not in difieren]
        tasa_con, tasa_sin = porcentaje(sum(con), len(con)), porcentaje(sum(sin), len(sin))
        filas.append({
            "categoria": categoria,
            "casos_con_diferencia": len(con),
            "fracasos_con_diferencia": sum(con),
            "casos_sin_diferencia": len(sin),
            "fracasos_sin_diferencia": sum(sin),
            "tasa_fracaso_con_diferencia": tasa_con,
            "tasa_fracaso_sin_diferencia": tasa_sin,
            # Puntos porcentuales que sube el fracaso cuando difieren (sin uno de los dos grupos, no hay)
            "diferencia": round(tasa_con - tasa_sin, 1) if tasa_con is not None and tasa_sin is not None else None,
        })
    filas.sort(key=lambda f: (
        f["diferencia"] is None, -(f["diferencia"] or 0), -(f["tasa_fracaso_con_diferencia"] or 0), f["categoria"]
    ))
    return filas


async def casos_para_aprender() -> list[dict]:
    """Todas las convivencias evaluadas (exitosas o no) con el cálculo con que se propusieron."""
    evaluadas = [
        m async for m in db.matches.find(
            {"estado": {"$in": ["confirmado", "finalizado"]}, "resultado": {"$in": ["exitoso", "no_exitoso"]}},
            {"resultado": 1, "compatibilidad_id": 1, "evaluacion.fecha_eval": 1, "fecha_fin_convivencia": 1},
        )
    ]
    compatibilidades = await compatibilidades_de(evaluadas)
    return [
        {
            "fracaso": m["resultado"] == "no_exitoso",
            "diferentes": set(compatibilidades[m["compatibilidad_id"]].get("categorias_diferentes", [])),
            "detalle": compatibilidades[m["compatibilidad_id"]].get("detalle", []),
            "fecha": fecha_resultado(m),
        }
        for m in evaluadas if m.get("compatibilidad_id") in compatibilidades
    ]


def proponer_cambios(analisis: list[dict], pesos: dict[str, float]) -> list[dict]:
    """Sube el peso de los hábitos en que diferir hace fracasar claramente más; baja el de los que no."""
    cambios = []
    for f in analisis:
        if (f["diferencia"] is None or abs(f["diferencia"]) < UMBRAL_DIFERENCIA
                or f["casos_con_diferencia"] < MINIMO_CASOS_GRUPO or f["casos_sin_diferencia"] < MINIMO_CASOS_GRUPO
                or not es_significativa(f["fracasos_con_diferencia"], f["casos_con_diferencia"],
                                        f["fracasos_sin_diferencia"], f["casos_sin_diferencia"])):
            continue
        actual = pesos.get(f["categoria"], 1.0)
        paso = min(PASO_MAXIMO, abs(f["diferencia"]) / 100)  # 30 puntos de diferencia → +0,25 (tope)
        propuesto = round(min(PESO_CATEGORIA_MAX, max(PESO_CATEGORIA_MIN, actual + paso * (1 if f["diferencia"] > 0 else -1))), 2)
        if propuesto == actual:
            continue  # ya está en el tope
        sube = propuesto > actual
        cambios.append({
            "categoria": f["categoria"],
            "peso_actual": actual,
            "peso_propuesto": propuesto,
            "tasa_fracaso_con_diferencia": f["tasa_fracaso_con_diferencia"],
            "tasa_fracaso_sin_diferencia": f["tasa_fracaso_sin_diferencia"],
            "justificacion": (
                f"Cuando el par difiere en este hábito no funciona el {coma(f['tasa_fracaso_con_diferencia'])} % de las "
                f"convivencias ({f['fracasos_con_diferencia']} de {f['casos_con_diferencia']}); cuando coincide, el "
                f"{coma(f['tasa_fracaso_sin_diferencia'])} % ({f['fracasos_sin_diferencia']} de {f['casos_sin_diferencia']}). "
                + ("Pesa más en la compatibilidad." if sube else "Pesa menos: diferir en él no hace fracasar más.")
            ),
        })
    return cambios


def porcentaje_con(detalle: list[dict], pesos: dict[str, float]) -> float:
    """Compatibilidad de un cálculo guardado, con otros pesos generales (mismas respuestas y ajustes)."""
    pesos_fila = [d["peso_base"] * pesos.get(d["categoria"], 1.0) * d.get("ajuste_personal", 1.0) for d in detalle]
    total = sum(pesos_fila)
    return round(100 * sum(d["puntaje"] * p for d, p in zip(detalle, pesos_fila)) / total, 1) if total else 0.0


def validar(casos: list[dict], pesos_actuales: dict, pesos_propuestos: dict) -> dict:
    """Tasa de éxito de los match que se habrían propuesto (compatibilidad alta) con cada versión."""
    def propuestos(pesos):
        return [
            c["fracaso"] for c in casos
            if c["detalle"] and not any(d.get("conflicto_imprescindible") for d in c["detalle"])
            and porcentaje_con(c["detalle"], pesos) >= NIVEL_ALTO
        ]

    base, nueva = propuestos(pesos_actuales), propuestos(pesos_propuestos)
    tasa_base = porcentaje(len(base) - sum(base), len(base))
    tasa_nueva = porcentaje(len(nueva) - sum(nueva), len(nueva))
    return {
        "matches_base": len(base),
        "exitosos_base": len(base) - sum(base),
        "tasa_exito_base": tasa_base,
        "matches_propuesta": len(nueva),
        "exitosos_propuesta": len(nueva) - sum(nueva),
        "tasa_exito_propuesta": tasa_nueva,
        "mejora": round(tasa_nueva - tasa_base, 1) if tasa_base is not None and tasa_nueva is not None else None,
        "fecha_validacion": datetime.now(timezone.utc),
    }


async def _activar_version(parametros: dict, pesos: dict, ajuste_id, ahora: datetime) -> str:
    """Retira la versión activa y deja una nueva con los pesos aprobados. Devuelve su nombre."""
    version = f"v{await db.parametros_algoritmo.count_documents({}) + 1}"
    nueva = {k: v for k, v in parametros.items() if k not in ("_id", "codigo")}
    nueva |= {
        "codigo": await siguiente_codigo("parametros_algoritmo"),
        "version": version,
        "estado": "activa",
        "version_anterior": parametros["version"],
        "ajuste_id": ajuste_id,
        "pesos_categoria": pesos,
        "creado_por": None,
        "notas": "Ajuste automático de los pesos por hábito según las convivencias evaluadas",
        "fecha_vigencia_desde": ahora,
        "fecha_vigencia_hasta": None,
    }
    await db.parametros_algoritmo.update_many(
        {"estado": "activa"}, {"$set": {"estado": "retirada", "fecha_vigencia_hasta": ahora}}
    )
    await db.parametros_algoritmo.insert_one(nueva)
    return version


async def revisar_algoritmo() -> dict | None:
    """Una revisión completa (analizar, proponer, validar y aplicar). Devuelve el ajuste o None si
    aún no corresponde revisar."""
    async with _revisando:
        casos = await casos_para_aprender()
        if len(casos) < MINIMO_CASOS_AJUSTE:
            return None
        ultimo = await db.ajustes_algoritmo.find_one(sort=[("fecha_creacion", -1)])
        if ultimo and len(casos) - ultimo["casos_analizados"] < NUEVOS_CASOS_REVISION:
            return None

        ahora = datetime.now(timezone.utc)
        parametros = await parametros_vigentes()
        pesos = parametros["pesos_categoria"]
        cambios = proponer_cambios(analizar_categorias([(c["fracaso"], c["diferentes"]) for c in casos]), pesos)
        propuestos = pesos | {c["categoria"]: c["peso_propuesto"] for c in cambios}
        fechas = [c["fecha"] for c in casos if c["fecha"]]

        ajuste = {
            "codigo": await siguiente_codigo("ajustes_algoritmo"),
            "version_base": parametros["version"],
            "version_propuesta": None,
            "estado": "rechazado",
            "periodo_desde": min(fechas) if fechas else None,
            "periodo_hasta": ahora,
            "casos_analizados": len(casos),
            "estadistica_id": None,
            "cambios": cambios,
            "validacion": None,
            "creado_por": None,  # lo propuso la plataforma
            "revisado_por": None,  # y lo validó ella misma
            "fecha_creacion": ahora,
            "fecha_decision": ahora,
            "observaciones": None,
        }
        if not cambios:
            ajuste["observaciones"] = (
                "Ningún hábito mostró una diferencia clara (que no se explique por azar): los pesos se mantienen."
            )
        else:
            v = ajuste["validacion"] = validar(casos, pesos, propuestos)
            if v["matches_propuesta"] < MINIMO_VALIDACION:
                ajuste["observaciones"] = (
                    f"Con los pesos propuestos solo {v['matches_propuesta']} de las convivencias evaluadas se habrían "
                    f"propuesto (mínimo {MINIMO_VALIDACION}): no hay suficientes datos para validar el cambio."
                )
            elif v["mejora"] is None or v["mejora"] < 0:
                ajuste["observaciones"] = (
                    f"Los match que se habrían propuesto con los pesos nuevos tendrían menos éxito "
                    f"({coma(v['tasa_exito_propuesta'])} % frente a {coma(v['tasa_exito_base'])} %): se mantiene la versión actual."
                )
            else:
                ajuste["estado"] = "aprobado"
                ajuste["observaciones"] = (
                    f"Los match que se habrían propuesto con los pesos nuevos tienen un {coma(v['tasa_exito_propuesta'])} % "
                    f"de éxito, frente a {coma(v['tasa_exito_base'])} % con la versión actual: no empeora, se aplica."
                )

        resultado = await db.ajustes_algoritmo.insert_one(ajuste)
        if ajuste["estado"] == "aprobado":
            version = await _activar_version(parametros, propuestos, resultado.inserted_id, ahora)
            await db.ajustes_algoritmo.update_one({"_id": resultado.inserted_id}, {"$set": {"version_propuesta": version}})
            ajuste["version_propuesta"] = version
            # Todos los pares pasan a la versión nueva, y con ellos las próximas propuestas
            await recalcular_todos()
            await generar_propuestas()
        return ajuste


async def _revisar_con_registro() -> None:
    try:
        await revisar_algoritmo()
    except Exception:  # un error al revisar no debe afectar la evaluación que lo disparó
        logging.exception("Error al revisar los pesos del algoritmo")


def programar_revision() -> None:
    """Revisa en segundo plano: se llama cuando una convivencia queda evaluada."""
    tarea = asyncio.create_task(_revisar_con_registro())
    _tareas.add(tarea)  # se guarda la referencia para que no se pierda antes de terminar
    tarea.add_done_callback(_tareas.discard)


def _ajuste_out(a: dict) -> dict:
    return {
        "codigo": a["codigo"],
        "fecha": a["fecha_creacion"],
        "estado": a["estado"],
        "version_base": a["version_base"],
        "version_propuesta": a.get("version_propuesta"),
        "casos_analizados": a["casos_analizados"],
        "cambios": a["cambios"],
        "validacion": a.get("validacion"),
        "observaciones": a.get("observaciones"),
    }


async def resumen_aprendizaje() -> dict:
    """Para el panel del administrador: versión activa, pesos actuales y últimas revisiones."""
    parametros = await parametros_vigentes()
    casos = len(await casos_para_aprender())
    ultimo = await db.ajustes_algoritmo.find_one(sort=[("fecha_creacion", -1)])
    # Cuántas convivencias evaluadas más faltan para la próxima revisión
    meta = max(MINIMO_CASOS_AJUSTE, ultimo["casos_analizados"] + NUEVOS_CASOS_REVISION) if ultimo else MINIMO_CASOS_AJUSTE
    return {
        "version": parametros["version"],
        "vigente_desde": parametros.get("fecha_vigencia_desde"),
        "pesos": [
            {"categoria": c, "peso": parametros["pesos_categoria"].get(c, 1.0), "peso_inicial": PESOS_CATEGORIA_INICIALES[c]}
            for c in CATEGORIAS
        ],
        "casos_evaluados": casos,
        "proxima_revision_en": max(0, meta - casos),
        "reglas": {
            "minimo_casos_ajuste": MINIMO_CASOS_AJUSTE,
            "nuevos_casos_revision": NUEVOS_CASOS_REVISION,
            "umbral_diferencia": UMBRAL_DIFERENCIA,
            "confianza": 95,
            "paso_maximo": PASO_MAXIMO,
            "peso_min": PESO_CATEGORIA_MIN,
            "peso_max": PESO_CATEGORIA_MAX,
        },
        "ajustes": [_ajuste_out(a) async for a in db.ajustes_algoritmo.find(sort=[("fecha_creacion", -1)], limit=10)],
    }
