from typing import Literal

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.compatibilidad import NIVEL_ALTO, nivel_de
from app.db import db
from app.deps import estudiante_verificado, usuario_actual
from app.matching import ABIERTAS, VIGENCIA, MatchNoDisponible, generar_propuestas, responder
from app.routers.catalogos import comunas_cerca_de
from app.routers.compatibilidades import el_otro, resumenes
from app.routers.evaluaciones import estado_evaluacion
from app.routers.perfil import datos_invalidos
from app.routers.publicaciones import sede_del_perfil
from app.ubicacion import distancia_km
from app.schemas.seguimiento import TerminoIn
from app.seguimiento import NoSePuedeTerminar, avisar_evaluaciones, terminar_convivencia

router = APIRouter(prefix="/api/matches", tags=["Match"])

NO_ENCONTRADO = HTTPException(status.HTTP_404_NOT_FOUND, "Propuesta no encontrada")
HISTORIAL = 10  # propuestas cerradas que se muestran


class BusquedaIn(BaseModel):
    buscando: bool


class RechazoIn(BaseModel):
    motivo: Literal["baja_compatibilidad", "alojamiento_no_conviene", "ya_encontro_alojamiento", "otro"] | None = None


async def vista(matches: list[dict], yo: ObjectId) -> list[dict]:
    """Cada propuesta vista desde quien consulta: la otra persona, el alojamiento y las respuestas.

    Para decidir sin abrir la publicación, también trae en qué hábitos coinciden, lo que incluye el
    alojamiento y la distancia de su zona a la sede de quien consulta (si la tiene en su perfil).
    """
    ids_otros = [el_otro(m, yo) for m in matches]
    otros = [u async for u in db.usuarios.find({"_id": {"$in": ids_otros}})]
    tarjetas = await resumenes(otros)
    publicaciones = {
        p["_id"]: p
        async for p in db.publicaciones.find(
            {"_id": {"$in": [m["publicacion_id"] for m in matches]}},
            {"titulo": 1, "tipo": 1, "costo_mensual": 1, "ubicacion.comuna_nombre": 1, "ubicacion.coordenadas": 1,
             "fotos": 1, "estado": 1, "cupos_disponibles": 1, "cupos_totales": 1, "caracteristicas": 1,
             "gastos.todos_incluidos": 1},
        )
    }
    # Hábitos en común según el cálculo vigente con cada persona
    coinciden = {
        el_otro(c, yo): c.get("categorias_coincidentes", [])
        async for c in db.compatibilidades.find({
            "vigente": True,
            "$or": [{"usuario_a_id": yo, "usuario_b_id": {"$in": ids_otros}},
                    {"usuario_b_id": yo, "usuario_a_id": {"$in": ids_otros}}],
        }, {"usuario_a_id": 1, "usuario_b_id": 1, "categorias_coincidentes": 1})
    } if matches else {}
    sede = await sede_del_perfil(await db.usuarios.find_one({"_id": yo}, {"perfil": 1})) if matches else None

    def distancia(pub: dict) -> float | None:
        coordenadas = pub.get("ubicacion", {}).get("coordenadas")
        if not sede or not coordenadas:
            return None
        return round(distancia_km(coordenadas["coordinates"], sede["coordenadas"]), 1)

    def una(m: dict) -> dict:
        soy_a = m["usuario_a_id"] == yo
        pub = publicaciones.get(m["publicacion_id"], {})
        principal = next((f["url"] for f in pub.get("fotos", []) if f["es_principal"]), None)
        return {
            "id": str(m["_id"]),
            "codigo": m["codigo"],
            "estado": m["estado"],
            "rol": "buscador" if soy_a else "oferente",
            "otro": tarjetas.get(el_otro(m, yo)),
            "publicacion": {
                "id": str(m["publicacion_id"]),
                "titulo": pub.get("titulo", "Alojamiento no disponible"),
                "tipo": pub.get("tipo"),
                "costo_mensual": pub.get("costo_mensual"),
                "comuna": pub.get("ubicacion", {}).get("comuna_nombre"),
                "cupos_disponibles": pub.get("cupos_disponibles"),
                "cupos_totales": pub.get("cupos_totales"),
                "caracteristicas": pub.get("caracteristicas", {}),
                "gastos_incluidos": bool(pub.get("gastos", {}).get("todos_incluidos")),
                "distancia_km": distancia(pub),
                "foto_url": principal,
                "visible": pub.get("estado") == "activa",
            },
            "porcentaje": m["pctj_compatibilidad"],
            "categorias_coincidentes": coinciden.get(el_otro(m, yo), []),
            "nivel": nivel_de(m["pctj_compatibilidad"]),
            "mi_respuesta": m["respuesta_a" if soy_a else "respuesta_b"]["estado"],
            "su_respuesta": m["respuesta_b" if soy_a else "respuesta_a"]["estado"],
            "fecha_sugerencia": m["fecha_sugerencia"],
            "vence": m["fecha_sugerencia"] + VIGENCIA if m["estado"] in ABIERTAS else None,
            "fecha_confirmacion": m["fecha_confirmacion"],
            # HU-18: evaluación de la convivencia al mes
            "evaluacion": estado_evaluacion(m, yo) if m["estado"] == "confirmado" else None,
            "fecha_fin": m.get("fecha_fin_convivencia"),
            "motivo_fin": m.get("motivo_fin"),
        }

    return [una(m) for m in matches]


@router.get("")
async def mis_propuestas(usuario: dict = Depends(estudiante_verificado)):
    """HU-17: las propuestas de match de RoomMatch, como buscador y como oferente."""
    yo = usuario["_id"]
    await generar_propuestas(usuario)  # también vence las que pasaron su plazo
    await avisar_evaluaciones()
    usuario = await db.usuarios.find_one({"_id": yo})

    mias = {"$or": [{"usuario_a_id": yo}, {"usuario_b_id": yo}]}
    abiertas = [m async for m in db.matches.find({**mias, "estado": {"$in": ABIERTAS}}).sort("fecha_sugerencia", -1)]
    confirmados = [m async for m in db.matches.find({**mias, "estado": "confirmado"}).sort("fecha_confirmacion", -1)]
    cerradas = [m async for m in db.matches.find({**mias, "estado": {"$in": ["rechazado", "expirado", "finalizado"]}})]
    # Lo más reciente primero: el término de la convivencia o la respuesta a la propuesta
    cerradas.sort(key=lambda m: m.get("fecha_fin_convivencia") or m["fecha_respuesta"] or m["fecha_sugerencia"], reverse=True)
    cerradas = cerradas[:HISTORIAL]
    return {
        "modo": usuario.get("modo"),
        "buscando": bool(usuario.get("buscando_alojamiento")),
        "con_convivencia": bool(usuario.get("match_activo_id")),
        "propuestas": await vista(abiertas, yo),
        "confirmados": await vista(confirmados, yo),
        "historial": await vista(cerradas, yo),
    }


@router.put("/busqueda")
async def cambiar_busqueda(datos: BusquedaIn, usuario: dict = Depends(usuario_actual)):
    """«Estoy buscando alojamiento»: solo quien lo activa recibe propuestas como buscador."""
    if datos.buscando and usuario.get("modo") != "buscador":
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Para activar la búsqueda cambia tu rol a «Busco dónde vivir». Mientras ofreces un espacio no puedes buscar",
        )
    if datos.buscando and usuario.get("match_activo_id"):
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya tienes una convivencia activa")  # CA-17.4
    await db.usuarios.update_one({"_id": usuario["_id"]}, {"$set": {"buscando_alojamiento": datos.buscando}})
    if not datos.buscando:
        # Las propuestas que aún nadie ha respondido dejan de tener sentido
        await db.matches.update_many(
            {"usuario_a_id": usuario["_id"], "estado": "sugerido"}, {"$set": {"estado": "expirado"}}
        )
        return {"mensaje": "Dejaste de recibir propuestas", "propuestas_nuevas": 0}
    nuevas = await generar_propuestas({**usuario, "buscando_alojamiento": True})
    return {"mensaje": "Te avisaremos cuando encontremos alojamientos compatibles", "propuestas_nuevas": nuevas}


async def propuesta_de(match_id: str, usuario: dict) -> dict:
    try:
        oid = ObjectId(match_id)
    except InvalidId:
        raise NO_ENCONTRADO
    match = await db.matches.find_one(
        {"_id": oid, "$or": [{"usuario_a_id": usuario["_id"]}, {"usuario_b_id": usuario["_id"]}]}
    )
    if not match:
        raise NO_ENCONTRADO  # tampoco se revela si existe entre otras personas
    return match


async def contestar(match_id: str, usuario: dict, acepta: bool, motivo: str | None = None) -> dict:
    match = await propuesta_de(match_id, usuario)
    try:
        match = await responder(match, usuario, acepta, motivo)
    except MatchNoDisponible as e:
        raise HTTPException(status.HTTP_409_CONFLICT, str(e))
    mensajes = {
        "confirmado": "¡Match confirmado! Su convivencia comienza hoy",
        "rechazado": "Rechazaste la propuesta",
    }
    return {
        "mensaje": mensajes.get(match["estado"], "Aceptaste la propuesta. Falta la otra respuesta"),
        "propuesta": (await vista([match], usuario["_id"]))[0],
    }


@router.post("/{match_id}/aceptar")
async def aceptar(match_id: str, usuario: dict = Depends(estudiante_verificado)):
    """CA-17.2: cuando ambos aceptan, el match queda confirmado."""
    return await contestar(match_id, usuario, acepta=True)


@router.post("/{match_id}/rechazar")
async def rechazar(match_id: str, datos: RechazoIn, usuario: dict = Depends(estudiante_verificado)):
    """CA-17.3: la propuesta queda rechazada y no se crea convivencia."""
    return await contestar(match_id, usuario, acepta=False, motivo=datos.motivo)


@router.post("/{match_id}/terminar")
async def terminar(match_id: str, datos: TerminoIn, usuario: dict = Depends(usuario_actual)):
    """Terminar una convivencia confirmada. Si fue por incompatibilidad, con sus razones (HU-19)."""
    match = await propuesta_de(match_id, usuario)
    if match["estado"] != "confirmado":
        raise HTTPException(status.HTTP_409_CONFLICT, "Esta convivencia no está activa")

    yo = usuario["_id"]
    ya_explico = any(e["evaluador_id"] == yo and e.get("razones") for e in match.get("evaluacion", []))
    razones = []
    if datos.motivo == "incompatibilidad" and not ya_explico:
        if errores := datos.errores():
            return datos_invalidos(errores)
        razones = datos.sin_repetir()
    con_otra = any(r["razon"] == "otra" for r in razones)

    try:
        match = await terminar_convivencia(
            match, usuario, datos.motivo, razones, datos.razon_otra_detalle if con_otra else None,
            datos.comentario, datos.seguir_buscando,
        )
    except NoSePuedeTerminar as e:
        raise HTTPException(status.HTTP_409_CONFLICT, str(e))
    return {
        "mensaje": "La convivencia terminó. Usaremos lo que nos contaste para tus próximas recomendaciones"
        if razones else "La convivencia terminó",
        "propuesta": (await vista([match], yo))[0],
    }


# ---------- ¿Tus alojamientos calzan con lo que busca? (perfil de un buscador visto por un oferente) ----------

GENEROS_SOLO = {"femenino": "mujeres", "masculino": "hombres"}
REGLAS_TEXTO = {
    "permite_mascotas": ("mascotas", "Busca un lugar donde se acepten mascotas", "Busca un lugar sin mascotas"),
    "permite_fumar": ("fumar", "Busca un lugar donde se pueda fumar", "Busca un lugar donde no se fume"),
    "permite_visitas": ("visitas", "Busca un lugar donde se permitan visitas", "Busca un lugar sin visitas"),
}


def pesos(monto: int) -> str:
    return "$" + f"{monto:,}".replace(",", ".")


async def nombres_comunas(ids) -> str:
    nombres = sorted([c["nombre"] async for c in db.comunas.find({"_id": {"$in": list(ids)}}, {"nombre": 1})])
    return ", ".join(nombres[:-1]) + (f" o {nombres[-1]}" if len(nombres) > 1 else (nombres[0] if nombres else ""))


def revisar_publicacion(pub: dict, p: dict, genero: str | None, zona: set | None, texto_zona: str) -> list[dict]:
    """Las mismas condiciones que usa matching.py para proponer un alojamiento a un buscador, una por
    una, con el motivo en palabras cuando no se cumple. Solo revisa lo que el buscador pidió."""
    revisiones = []

    def revisar(clave, ok, motivo):
        revisiones.append({"clave": clave, "ok": bool(ok), "motivo": None if ok else motivo})

    minimo, maximo, costo = p.get("costo_min"), p.get("costo_max"), pub["costo_mensual"]
    if minimo is not None or maximo is not None:
        rango = (f"entre {pesos(minimo)} y {pesos(maximo)}" if minimo is not None and maximo is not None
                 else f"hasta {pesos(maximo)}" if maximo is not None else f"desde {pesos(minimo)}")
        revisar("precio", (minimo is None or costo >= minimo) and (maximo is None or costo <= maximo), f"Busca un precio {rango}")
    if zona is not None:
        revisar("ubicacion", pub["ubicacion"]["comuna_id"] in zona, texto_zona)
    if p.get("tipo_alojamiento"):
        tipo = "una habitación" if p["tipo_alojamiento"] == "habitacion" else "un departamento"
        revisar("tipo", pub["tipo"] == p["tipo_alojamiento"], f"Busca {tipo}")
    for regla, valor in (("permite_mascotas", p.get("requiere_mascotas")), ("permite_fumar", p.get("requiere_fumar")),
                         ("permite_visitas", p.get("requiere_visitas"))):
        if valor is not None:
            clave, si, no = REGLAS_TEXTO[regla]
            revisar(clave, pub["reglas"][regla] == valor, si if valor else no)
    for extra, campo, motivo in (("gastos_incluidos", pub.get("gastos", {}).get("todos_incluidos"), "Busca con gastos incluidos"),
                                 ("amoblado", pub.get("caracteristicas", {}).get("amoblado"), "Busca un lugar amoblado"),
                                 ("estacionamiento", pub.get("caracteristicas", {}).get("estacionamiento"), "Busca estacionamiento")):
        if p.get(extra):
            revisar(extra, campo, motivo)
    # El género que pide el alojamiento también cuenta, aunque no sea una preferencia del buscador
    if pub["genero_preferido"] != "indiferente":
        revisar("genero", pub["genero_preferido"] == genero,
                f"Tu alojamiento es solo para {GENEROS_SOLO[pub['genero_preferido']]}")
    return revisiones


@router.get("/calce/{usuario_id}")
async def calce_con(usuario_id: str, usuario: dict = Depends(estudiante_verificado)):
    """Para un oferente que ve el perfil de un buscador: si sus alojamientos activos cumplen las
    preferencias de búsqueda que ese buscador guardó, las mismas que usan las propuestas de match.
    Explica por qué RoomMatch los propuso o no, sin mostrar todo su perfil de búsqueda: solo el
    motivo de lo que no se cumple."""
    try:
        otro = await db.usuarios.find_one({"_id": ObjectId(usuario_id)})
    except InvalidId:
        otro = None
    if not otro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    if usuario.get("modo") != "oferente" or otro.get("modo") != "buscador":
        return {"aplica": False}

    preferencias = otro.get("preferencias_busqueda") or {}
    zona, texto_zona = None, ""
    if preferencias.get("comunas_ids"):
        zona = {ObjectId(c) if isinstance(c, str) else c for c in preferencias["comunas_ids"]}
        texto_zona = f"Busca en {await nombres_comunas(zona)}"
    if preferencias.get("cerca_institucion"):
        cercanas = await comunas_cerca_de(otro)
        if cercanas is not None:
            zona = set(cercanas) if zona is None else zona & set(cercanas)
            texto_zona = f"Busca cerca de su sede: {await nombres_comunas(zona)}"

    alojamientos = []
    async for pub in db.publicaciones.find(
        {"oferente_id": usuario["_id"], "estado": "activa", "cupos_disponibles": {"$gt": 0}}
    ).sort("fecha_publicacion", -1):
        revisiones = revisar_publicacion(pub, preferencias, otro.get("genero"), zona, texto_zona)
        alojamientos.append({
            "id": str(pub["_id"]),
            "titulo": pub["titulo"],
            "comuna": pub["ubicacion"]["comuna_nombre"],
            "costo_mensual": pub["costo_mensual"],
            "calza": all(r["ok"] for r in revisiones),
            "revisiones": revisiones,
        })

    a, b = sorted([usuario["_id"], otro["_id"]])
    compatibilidad = await db.compatibilidades.find_one({"usuario_a_id": a, "usuario_b_id": b, "vigente": True})
    return {
        "aplica": True,
        "buscando": bool(otro.get("buscando_alojamiento")),
        "con_preferencias": any(
            preferencias.get(k) for k in ("costo_min", "costo_max", "tipo_alojamiento", "comunas_ids", "cerca_institucion",
                                          "gastos_incluidos", "amoblado", "estacionamiento")
        ) or any(preferencias.get(k) is not None for k in ("requiere_mascotas", "requiere_fumar", "requiere_visitas")),
        "compatibilidad_alta": bool(compatibilidad and compatibilidad["porcentaje"] >= NIVEL_ALTO and not compatibilidad["descartado"]),
        "alojamientos": alojamientos,
    }
