"""EP-08 · HU-20: estadísticas de éxito o fracaso de los match para el administrador.

Se calculan al consultar, a partir de matches (no se guardan en estadisticas_match todavía).
Una convivencia cuenta como evaluada cuando ya tiene resultado: «exitoso» o «no_exitoso» (HU-18),
o «no_exitoso» si se terminó por incompatibilidad. Su fecha es la de la última evaluación.
"""

from collections import Counter
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query

from app.db import db
from app.deps import solo_admin
from app.routers.perfil import datos_invalidos

router = APIRouter(prefix="/api/admin/estadisticas", tags=["Administración: estadísticas"])

ZONA = ZoneInfo("America/Santiago")  # los meses y el filtro de fechas se cuentan en hora de Chile
META_EXITO = 60  # Product Vision: 60 % de los match concretan una convivencia que funciona
META_RESPUESTA = 70  # Product Vision: 70 % de respuesta a las evaluaciones del primer mes
CONVIVENCIAS = ["confirmado", "finalizado"]


def porcentaje(parte: int, total: int) -> float | None:
    return round(100 * parte / total, 1) if total else None


def fecha_resultado(match: dict) -> datetime | None:
    """Cuándo quedó el resultado: la última evaluación, o el término si no la hubo."""
    fechas = [e["fecha_eval"] for e in match.get("evaluacion", [])]
    return max(fechas) if fechas else match.get("fecha_fin_convivencia")


def en_rango(fecha: datetime | None, desde: datetime | None, hasta: datetime | None) -> bool:
    return fecha is not None and (desde is None or fecha >= desde) and (hasta is None or fecha < hasta)


@router.get("")
async def estadisticas(
    desde: date | None = Query(default=None),
    hasta: date | None = Query(default=None),
    _admin: dict = Depends(solo_admin),  # CA-20.6
):
    """CA-20.1 a CA-20.5. Con `desde` y `hasta` (AAAA-MM-DD, ambos incluidos) todo se recalcula solo
    con ese período (CA-20.4)."""
    if desde and hasta and desde > hasta:
        return datos_invalidos({"hasta": "La fecha final debe ser igual o posterior a la inicial"})
    inicio = datetime.combine(desde, time.min, ZONA) if desde else None
    fin = datetime.combine(hasta + timedelta(days=1), time.min, ZONA) if hasta else None  # incluye todo «hasta»

    matches = [m async for m in db.matches.find({"estado": {"$in": CONVIVENCIAS}})]

    # CA-20.1: convivencias evaluadas y su resultado
    evaluadas = [
        m for m in matches
        if m.get("resultado") in ("exitoso", "no_exitoso") and en_rango(fecha_resultado(m), inicio, fin)
    ]
    exitosas = sum(m["resultado"] == "exitoso" for m in evaluadas)

    # Tasa de respuesta: de los avisos de evaluación enviados, cuántos se respondieron
    avisos = [
        s for m in matches for s in m.get("seguimiento", [])
        if s["momento"] == "mes_1" and en_rango(s["fecha_aviso"], inicio, fin)
    ]
    respondidas = sum(s["evaluado"] for s in avisos)

    # CA-20.2: por mes (hora de Chile), del más antiguo al más reciente
    por_mes = {}
    for m in evaluadas:
        mes = fecha_resultado(m).astimezone(ZONA).strftime("%Y-%m")
        fila = por_mes.setdefault(mes, {"mes": mes, "exitosos": 0, "no_exitosos": 0})
        fila["exitosos" if m["resultado"] == "exitoso" else "no_exitosos"] += 1

    # CA-20.3: razones de incompatibilidad, de la más a la menos frecuente
    razones = Counter(
        r["razon"]
        for m in matches for e in m.get("evaluacion", [])
        if en_rango(e["fecha_eval"], inicio, fin)
        for r in e.get("razones", [])
    )

    # Además: por qué terminan las convivencias
    motivos = Counter(
        m["motivo_fin"] for m in matches
        if m["estado"] == "finalizado" and en_rango(m.get("fecha_fin_convivencia"), inicio, fin)
    )

    # Embudo de propuestas del período (HU-17)
    rango_sugerencia = {k: v for k, v in (("$gte", inicio), ("$lt", fin)) if v}
    propuestas = await db.matches.count_documents(
        {"fecha_sugerencia": rango_sugerencia} if rango_sugerencia else {}
    )
    confirmadas = sum(en_rango(m.get("fecha_confirmacion"), inicio, fin) for m in matches)

    return {
        "periodo": {"desde": desde, "hasta": hasta},
        # CA-20.5: sin evaluaciones no hay nada que mostrar
        "hay_datos": bool(evaluadas or avisos or razones or motivos),
        "resumen": {
            "evaluadas": len(evaluadas),
            "exitosas": exitosas,
            "no_exitosas": len(evaluadas) - exitosas,
            "porcentaje_exito": porcentaje(exitosas, len(evaluadas)),
            "porcentaje_no_exito": porcentaje(len(evaluadas) - exitosas, len(evaluadas)),
            "meta_exito": META_EXITO,
            "avisos_enviados": len(avisos),
            "respondidas": respondidas,
            "tasa_respuesta": porcentaje(respondidas, len(avisos)),
            "meta_respuesta": META_RESPUESTA,
        },
        "embudo": {"propuestas": propuestas, "confirmadas": confirmadas, "terminadas": sum(motivos.values())},
        "por_mes": sorted(por_mes.values(), key=lambda f: f["mes"]),
        "razones": [{"razon": r, "cantidad": n} for r, n in razones.most_common()],
        "motivos_fin": [{"motivo": r, "cantidad": n} for r, n in motivos.most_common()],
    }
