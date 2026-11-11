"""HU-14: cálculo de la compatibilidad entre dos estudiantes a partir del cuestionario (HU-13).

Cada categoría recibe un puntaje entre 0 y 1 y un peso según su importancia. El porcentaje es el
promedio ponderado de los puntajes. Los parámetros de este archivo son la primera versión
(PARAMETROS_VERSION). Además, cada hábito tiene un peso general que la propia plataforma ajusta con
la experiencia de las convivencias evaluadas (EP-08, app/aprendizaje.py): cada ajuste aprobado crea
una nueva versión en parametros_algoritmo, y el cálculo usa siempre la versión activa.
"""

from datetime import datetime, timezone

from app.db import db, siguiente_codigo
from app.schemas.cuestionario import CATEGORIAS, importancia_de, respuestas_de

PARAMETROS_VERSION = "v1"

# Categorías con opciones ordenadas: cada paso de distancia baja el puntaje a la mitad del rango
ESCALAS = {
    "horario_sueno": ("temprano", "intermedio", "tarde"),
    "horario_estudio": ("manana", "tarde", "noche"),  # «variable» se trata aparte
    "orden_limpieza": ("alto", "medio", "bajo"),
    "ruido": ("bajo", "moderado", "alto"),
    "visitas": ("nunca", "ocasional", "frecuente"),
}
# Quien estudia a horas variables coincide a medias con cualquiera
PUNTAJE_VARIABLE = 0.5

# Fumar y mascotas combinan el hábito propio con la tolerancia, por eso usan una tabla.
# Lo que no está en la tabla con respuestas distintas vale 0
TABLAS = {
    "fumar": {
        frozenset({"no_fuma_no_tolera", "no_fuma_tolera"}): 1.0,  # ninguno fuma
        frozenset({"no_fuma_tolera", "fuma"}): 0.75,
        frozenset({"no_fuma_no_tolera", "fuma"}): 0.0,
    },
    "mascotas": {
        frozenset({"no_tiene_no_tolera", "no_tiene_tolera"}): 1.0,  # ninguno tiene
        frozenset({"no_tiene_tolera", "tiene"}): 0.75,
        frozenset({"no_tiene_no_tolera", "tiene"}): 0.0,
    },
}

# CA-14.2: lo imprescindible pesa más. Se usa el mayor de los dos, así el resultado es simétrico
PESOS = {"flexible": 1.0, "importante": 2.0, "imprescindible": 4.0}

# Rangos del nivel que se muestra junto al porcentaje
NIVEL_ALTO = 75
NIVEL_MEDIO = 50

# EP-08 · HU-19 (CA-19.4): cada razón de una convivencia que no funcionó sube el peso personal de
# esa categoría para el estudiante, según su gravedad, hasta un máximo
INCREMENTO_POR_RAZON = 0.25
FACTOR_GRAVEDAD = {"leve": 0.5, "moderada": 1.0, "grave": 2.0}
AJUSTE_PERSONAL_MAX = 2.0

# EP-08: peso general de cada hábito, igual para todos. En la v1 todos valen 1; la plataforma los
# ajusta sola (app/aprendizaje.py) y cada cambio aprobado queda como una versión nueva
PESOS_CATEGORIA_INICIALES = {categoria: 1.0 for categoria in CATEGORIAS}


def puntaje_categoria(categoria: str, a: str, b: str) -> float:
    if a == b:
        return 1.0
    if categoria in TABLAS:
        return TABLAS[categoria].get(frozenset({a, b}), 0.0)
    if "variable" in (a, b):
        return PUNTAJE_VARIABLE
    escala = ESCALAS[categoria]
    distancia = abs(escala.index(a) - escala.index(b))
    return 1 - distancia / (len(escala) - 1)


def nivel_de(porcentaje: float) -> str:
    if porcentaje >= NIVEL_ALTO:
        return "alta"
    if porcentaje >= NIVEL_MEDIO:
        return "media"
    return "baja"


def ajustes_de(usuario: dict) -> dict[str, float]:
    """Peso personal por categoría que el estudiante acumuló con sus razones (HU-19). Sin datos, 1."""
    aprendizaje = (usuario.get("ajuste_recomendacion") or {}).get("aprendizaje", [])
    return {a["categoria"]: a["peso_personal"] for a in aprendizaje}


def parametros_iniciales() -> dict:
    """La versión v1 de parametros_algoritmo: los valores del anexo «Algoritmo de compatibilidad»."""
    return {
        "version": PARAMETROS_VERSION,
        "estado": "activa",
        "version_anterior": None,
        "ajuste_id": None,
        "pesos_base": {"flexible": PESOS["flexible"], "importante": PESOS["importante"]},
        "multiplicador_imprescindible": PESOS["imprescindible"] / PESOS["importante"],
        "pesos_categoria": dict(PESOS_CATEGORIA_INICIALES),
        "incremento_por_razon": INCREMENTO_POR_RAZON,
        "ajuste_personal_max": AJUSTE_PERSONAL_MAX,
        "umbrales": {"alta": NIVEL_ALTO, "media": NIVEL_MEDIO},
        "creado_por": None,  # None: la creó la plataforma
        "notas": "Versión inicial del anexo «Algoritmo de compatibilidad»",
        "fecha_vigencia_desde": datetime.now(timezone.utc),
        "fecha_vigencia_hasta": None,
    }


async def asegurar_parametros() -> None:
    """Crea la versión v1 la primera vez que se levanta la API."""
    if await db.parametros_algoritmo.count_documents({}) == 0:
        await db.parametros_algoritmo.insert_one(
            {"codigo": await siguiente_codigo("parametros_algoritmo"), **parametros_iniciales()}
        )


async def parametros_vigentes() -> dict:
    """La versión activa de los parámetros (si aún no se guarda ninguna, la v1)."""
    activa = await db.parametros_algoritmo.find_one({"estado": "activa"})
    if not activa:
        return parametros_iniciales()
    # Una categoría nueva del cuestionario parte con peso 1
    return {**activa, "pesos_categoria": {**PESOS_CATEGORIA_INICIALES, **activa.get("pesos_categoria", {})}}


def calcular(
    cuestionario_a: dict,
    cuestionario_b: dict,
    ajustes_a: dict[str, float] | None = None,
    ajustes_b: dict[str, float] | None = None,
    pesos_categoria: dict[str, float] | None = None,
    version: str = PARAMETROS_VERSION,
) -> dict:
    """Compatibilidad entre dos cuestionarios completos (CA-14.1 a CA-14.3).

    Es simétrica: calcular(a, b) y calcular(b, a) dan el mismo porcentaje. Con los ajustes
    personales (HU-19) se usa el mayor de los dos, igual que con la importancia. `pesos_categoria`
    es el peso general de cada hábito de la versión activa (EP-08); sin él, todos valen 1.
    Hay conflicto cuando alguien marcó una categoría como imprescindible y no coinciden en nada
    (puntaje 0); en ese caso el par queda descartado como posibles roomies.
    """
    respuestas_a, respuestas_b = respuestas_de(cuestionario_a), respuestas_de(cuestionario_b)
    importancia_a, importancia_b = importancia_de(cuestionario_a), importancia_de(cuestionario_b)

    detalle = []
    for categoria in CATEGORIAS:
        a, b = respuestas_a[categoria], respuestas_b[categoria]
        imp_a, imp_b = importancia_a[categoria], importancia_b[categoria]
        puntaje = puntaje_categoria(categoria, a, b)
        peso_base = max(PESOS[imp_a], PESOS[imp_b])
        # EP-08: lo que la plataforma aprendió de todas las convivencias evaluadas
        peso_categoria = (pesos_categoria or {}).get(categoria, 1.0)
        # CA-19.4: más peso a lo que a alguno de los dos ya le causó problemas en una convivencia
        ajuste_personal = max((ajustes_a or {}).get(categoria, 1.0), (ajustes_b or {}).get(categoria, 1.0))
        detalle.append({
            "categoria": categoria,
            "respuesta_a": a,
            "respuesta_b": b,
            "importancia_a": imp_a,
            "importancia_b": imp_b,
            "coincide": puntaje == 1.0,
            "distancia": 0 if puntaje == 1 else 2 if puntaje == 0 else 1,  # iguales, parcial, opuestas
            "puntaje": puntaje,
            "peso_base": peso_base,
            "peso_categoria": peso_categoria,
            "peso_general": peso_base * peso_categoria,
            "ajuste_personal": ajuste_personal,
            "peso": peso_base * peso_categoria * ajuste_personal,
            "conflicto_imprescindible": puntaje == 0 and "imprescindible" in (imp_a, imp_b),
        })

    def porcentaje(clave_peso: str) -> float:
        total = sum(d[clave_peso] for d in detalle)
        return round(100 * sum(d["puntaje"] * d[clave_peso] for d in detalle) / total, 1)

    final = porcentaje("peso")
    conflictos = [d["categoria"] for d in detalle if d["conflicto_imprescindible"]]
    return {
        "porcentaje_base": porcentaje("peso_general"),  # sin los ajustes personales
        "porcentaje": final,
        "nivel": nivel_de(final),
        "descartado": bool(conflictos),
        "categoria_descarte": conflictos[0] if conflictos else None,
        "categorias_coincidentes": [d["categoria"] for d in detalle if d["coincide"]],
        "categorias_diferentes": [d["categoria"] for d in detalle if not d["coincide"]],
        "parametros_version": version,
        "detalle": detalle,
    }


# CA-14.4: con quién se puede calcular. También debe estar verificado: las cuentas con acceso limitado
# no se les muestran a los demás ni reciben propuestas (deps.VERIFICADO)
CANDIDATOS = {
    "cuestionario.completo": True,
    "estado_cuenta": {"$nin": ["suspendida", "inhabilitada", "eliminada"]},
    "verificacion.estado": "verificado",
}


def _documento_par(codigo: int, u1: dict, u2: dict, parametros: dict, ahora: datetime) -> dict:
    """Cálculo de un par; usuario_a es el de menor id, así cada par se guarda una sola vez."""
    a, b = sorted([u1, u2], key=lambda u: u["_id"])
    return {
        "codigo": codigo,
        "usuario_a_id": a["_id"],
        "usuario_b_id": b["_id"],
        **calcular(a["cuestionario"], b["cuestionario"], ajustes_de(a), ajustes_de(b),
                   parametros["pesos_categoria"], parametros["version"]),
        "vigente": True,
        "fecha_calculo": ahora,
    }


async def recalcular(usuario: dict) -> int:
    """CA-14.5: recalcula la compatibilidad del usuario con todos los demás candidatos.

    Los cálculos anteriores quedan con vigente=False como historial. Devuelve cuántos pares se calcularon.
    """
    ahora = datetime.now(timezone.utc)
    yo = usuario["_id"]
    await db.compatibilidades.update_many(
        {"$or": [{"usuario_a_id": yo}, {"usuario_b_id": yo}], "vigente": True},
        {"$set": {"vigente": False}},
    )

    otros = [
        otro async for otro in db.usuarios.find(
            {**CANDIDATOS, "_id": {"$ne": yo}}, {"cuestionario": 1, "ajuste_recomendacion": 1}
        )
    ]
    if not otros:
        return 0

    parametros = await parametros_vigentes()
    primero = await siguiente_codigo("compatibilidades", len(otros))
    await db.compatibilidades.insert_many(
        [_documento_par(primero + i, usuario, otro, parametros, ahora) for i, otro in enumerate(otros)]
    )
    return len(otros)


async def recalcular_todos() -> int:
    """Recalcula todos los pares con la versión activa (EP-08: después de un ajuste aprobado).

    Como recalcular(), deja los cálculos anteriores como historial. Devuelve cuántos pares se calcularon.
    """
    ahora = datetime.now(timezone.utc)
    parametros = await parametros_vigentes()
    candidatos = [u async for u in db.usuarios.find(CANDIDATOS, {"cuestionario": 1, "ajuste_recomendacion": 1})]
    await db.compatibilidades.update_many({"vigente": True}, {"$set": {"vigente": False}})

    pares = [(u1, u2) for i, u1 in enumerate(candidatos) for u2 in candidatos[i + 1:]]
    if not pares:
        return 0
    primero = await siguiente_codigo("compatibilidades", len(pares))
    documentos = [_documento_par(primero + i, u1, u2, parametros, ahora) for i, (u1, u2) in enumerate(pares)]
    for inicio in range(0, len(documentos), 1000):  # en tandas, para no armar un envío gigante
        await db.compatibilidades.insert_many(documentos[inicio:inicio + 1000])
    return len(documentos)
