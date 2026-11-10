"""EP-08 · HU-20: estadísticas de éxito o fracaso de los match para el administrador.

Se calculan al consultar, a partir de matches (no se guardan en estadisticas_match todavía).
Una convivencia cuenta como evaluada cuando ya tiene resultado: «exitoso» o «no_exitoso» (HU-18),
o «no_exitoso» si se terminó por incompatibilidad. Su fecha es la de la última evaluación.
"""

from collections import Counter
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, Query

from app.db import db
from app.deps import solo_admin
from app.routers.perfil import datos_invalidos
from app.schemas.cuestionario import CATEGORIAS

router = APIRouter(prefix="/api/admin/estadisticas", tags=["Administración: estadísticas"])

ZONA = ZoneInfo("America/Santiago")  # los meses y el filtro de fechas se cuentan en hora de Chile
META_EXITO = 60  # Product Vision: 60 % de los match concretan una convivencia que funciona
META_RESPUESTA = 70  # Product Vision: 70 % de respuesta a las evaluaciones del primer mes
META_REPORTES_MAX = 5  # Product Vision (EP-02, EP-06, EP-07): reportes bajo el 5 % del total de anuncios
CONVIVENCIAS = ["confirmado", "finalizado"]
MAX_MESES = 24  # sin período, la serie mensual muestra a lo más los últimos dos años


def porcentaje(parte: int, total: int) -> float | None:
    return round(100 * parte / total, 1) if total else None


def fecha_resultado(match: dict) -> datetime | None:
    """Cuándo quedó el resultado: la última evaluación, o el término si no la hubo."""
    fechas = [e["fecha_eval"] for e in match.get("evaluacion", [])]
    return max(fechas) if fechas else match.get("fecha_fin_convivencia")


def en_rango(fecha: datetime | None, desde: datetime | None, hasta: datetime | None) -> bool:
    return fecha is not None and (desde is None or fecha >= desde) and (hasta is None or fecha < hasta)


def clave_mes(fecha: datetime) -> str:
    if fecha.tzinfo is None:  # Mongo devuelve las fechas en UTC sin zona
        fecha = fecha.replace(tzinfo=ZoneInfo("UTC"))
    return fecha.astimezone(ZONA).strftime("%Y-%m")


def meses_entre(primero: str, ultimo: str) -> list[str]:
    """Todos los meses de `primero` a `ultimo` (AAAA-MM), para que la serie no tenga huecos."""
    anio, mes = map(int, primero.split("-"))
    fin = tuple(map(int, ultimo.split("-")))
    meses = []
    while (anio, mes) <= fin and len(meses) <= 120:
        meses.append(f"{anio:04d}-{mes:02d}")
        anio, mes = (anio + 1, 1) if mes == 12 else (anio, mes + 1)
    return meses


@router.get("")
async def estadisticas(
    desde: date | None = Query(default=None),
    hasta: date | None = Query(default=None),
    ciudad: str | None = Query(default=None, description="Id de la comuna del alojamiento"),
    _admin: dict = Depends(solo_admin),  # CA-20.6
):
    """CA-20.1 a CA-20.5. Con `desde` y `hasta` (AAAA-MM-DD, ambos incluidos) todo se recalcula solo
    con ese período (CA-20.4). Con `ciudad` solo cuentan los match de alojamientos de esa comuna
    (los registros nuevos no dependen de la ciudad: un estudiante no tiene una)."""
    if desde and hasta and desde > hasta:
        return datos_invalidos({"hasta": "La fecha final debe ser igual o posterior a la inicial"})
    inicio = datetime.combine(desde, time.min, ZONA) if desde else None
    fin = datetime.combine(hasta + timedelta(days=1), time.min, ZONA) if hasta else None  # incluye todo «hasta»

    filtro_ciudad: dict = {}
    ids_ciudad: list = []
    if ciudad:
        try:
            comuna = ObjectId(ciudad)
        except InvalidId:
            return datos_invalidos({"ciudad": "Ciudad no válida"})
        ids_ciudad = [p["_id"] async for p in db.publicaciones.find({"ubicacion.comuna_id": comuna}, {"_id": 1})]
        filtro_ciudad = {"publicacion_id": {"$in": ids_ciudad}}

    matches = [m async for m in db.matches.find({"estado": {"$in": CONVIVENCIAS}, **filtro_ciudad})]

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
        mes = clave_mes(fecha_resultado(m))
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
        {**({"fecha_sugerencia": rango_sugerencia} if rango_sugerencia else {}), **filtro_ciudad}
    )
    confirmadas = sum(en_rango(m.get("fecha_confirmacion"), inicio, fin) for m in matches)

    # Registros nuevos por mes (estudiantes), para la evolución mensual
    rango_registro = {k: v for k, v in (("$gte", inicio), ("$lt", fin)) if v}
    fechas_registro = [
        u["fecha_registro"]
        async for u in db.usuarios.find(
            {"rol": "estudiante", **({"fecha_registro": rango_registro} if rango_registro else {})},
            {"fecha_registro": 1},
        )
        if u.get("fecha_registro")
    ]
    registros = Counter(clave_mes(f) for f in fechas_registro)

    # Reportes de perfiles y de publicaciones (HU-24 a HU-27). Con ciudad, solo los de publicaciones
    # de esa comuna: un perfil no tiene ciudad
    filtro_reportes: dict = {"fecha_reporte": rango_registro} if rango_registro else {}
    if ciudad:
        filtro_reportes |= {"tipo_elemento": "publicacion", "elemento_reportado_id": {"$in": ids_ciudad}}
    lista_reportes = [
        r async for r in db.reportes.find(
            filtro_reportes, {"tipo_elemento": 1, "estado": 1, "motivo": 1, "elemento_reportado_id": 1}
        )
    ]
    por_tipo = Counter(r["tipo_elemento"] for r in lista_reportes)
    por_estado = Counter(r["estado"] for r in lista_reportes)
    por_motivo = Counter((r["tipo_elemento"], r["motivo"]) for r in lista_reportes)

    # Tasa de reportes (meta: bajo el 5 % del total de anuncios). Anuncios: los publicados hasta el
    # final del período, en cualquier estado (uno suspendido por un reporte también cuenta)
    filtro_anuncios: dict = {"fecha_publicacion": {"$lt": fin}} if fin else {}
    if ciudad:
        filtro_anuncios["_id"] = {"$in": ids_ciudad}
    anuncios = await db.publicaciones.count_documents(filtro_anuncios)
    publicaciones_reportadas = len({
        r["elemento_reportado_id"] for r in lista_reportes if r["tipo_elemento"] == "publicacion"
    })

    # EP-08: qué diferencias de hábitos fracasan más. Para cada categoría se compara la tasa de
    # fracaso de las convivencias evaluadas cuyo par difería en ella con la de las que coincidían.
    # Se usa la compatibilidad con que se propuso el match (los cálculos viejos quedan como historial)
    ids_compatibilidad = [m["compatibilidad_id"] for m in evaluadas if m.get("compatibilidad_id")]
    diferencias = {
        c["_id"]: set(c.get("categorias_diferentes", []))
        async for c in db.compatibilidades.find({"_id": {"$in": ids_compatibilidad}}, {"categorias_diferentes": 1})
    }
    casos = [
        (m["resultado"] == "no_exitoso", diferencias[m["compatibilidad_id"]])
        for m in evaluadas if m.get("compatibilidad_id") in diferencias
    ]
    analisis_categorias = []
    for categoria in CATEGORIAS:
        con = [fracaso for fracaso, difieren in casos if categoria in difieren]
        sin = [fracaso for fracaso, difieren in casos if categoria not in difieren]
        tasa_con, tasa_sin = porcentaje(sum(con), len(con)), porcentaje(sum(sin), len(sin))
        analisis_categorias.append({
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
    # Primero las que más suben el fracaso; las que no se pueden comparar, al final
    analisis_categorias.sort(key=lambda f: (
        f["diferencia"] is None, -(f["diferencia"] or 0), -(f["tasa_fracaso_con_diferencia"] or 0), f["categoria"]
    ))

    # Serie mensual continua (sin huecos): del inicio del período (o del primer dato) al mes final
    hoy = datetime.now(ZONA).strftime("%Y-%m")
    claves = set(por_mes) | set(registros)
    primero = inicio.strftime("%Y-%m") if inicio else (min(claves) if claves else hoy)
    ultimo = (fin - timedelta(days=1)).strftime("%Y-%m") if fin else max([hoy, *claves])
    meses = meses_entre(primero, ultimo)
    if not inicio:
        meses = meses[-MAX_MESES:]
    serie_mensual = [
        {
            "mes": mes,
            "exitosos": por_mes.get(mes, {}).get("exitosos", 0),
            "no_exitosos": por_mes.get(mes, {}).get("no_exitosos", 0),
            "registros": registros.get(mes, 0),
        }
        for mes in meses
    ]

    return {
        "periodo": {"desde": desde, "hasta": hasta, "ciudad": ciudad},
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
        "serie_mensual": serie_mensual,
        "registros_nuevos": sum(registros.values()),
        "reportes": {
            "total": len(lista_reportes),
            "perfiles": por_tipo.get("usuario", 0),
            "publicaciones": por_tipo.get("publicacion", 0),
            "por_estado": {e: por_estado.get(e, 0) for e in ("pendiente", "en_revision", "resuelto")},
            "anuncios": anuncios,
            "publicaciones_reportadas": publicaciones_reportadas,
            "tasa_reportes": porcentaje(publicaciones_reportadas, anuncios),
            "meta_tasa_reportes_max": META_REPORTES_MAX,
            "por_motivo": [
                {"tipo": t, "motivo": m, "cantidad": n} for (t, m), n in por_motivo.most_common()
            ],
        },
        # CA-20.3: de la más a la menos frecuente; a igual cantidad, por nombre (orden estable)
        "razones": [{"razon": r, "cantidad": n} for r, n in sorted(razones.items(), key=lambda x: (-x[1], x[0]))],
        "motivos_fin": [{"motivo": r, "cantidad": n} for r, n in sorted(motivos.items(), key=lambda x: (-x[1], x[0]))],
        "analisis_categorias": analisis_categorias,
    }
