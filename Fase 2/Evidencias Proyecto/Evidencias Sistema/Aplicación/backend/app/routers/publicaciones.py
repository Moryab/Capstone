import re
from datetime import datetime, timezone
from typing import Annotated

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse

from app.config import settings
from app.db import db, siguiente_codigo
from app.deps import SIN_VERIFICAR, VERIFICADO, esta_verificado, usuario_actual
from app.media import borrar_foto, guardar_foto_publicacion, tipo_imagen
from app.routers.catalogos import ids_comunas
from app.routers.perfil import datos_invalidos
from app.matching import cerrar_propuestas_de_publicacion, generar_propuestas
from app.schemas.busqueda import TAMANO_PAGINA, FiltrosBusqueda, error_rango, filtro_preferencias
from app.schemas.publicaciones import MAX_FOTOS, PublicacionIn, PublicacionOut
from app.ubicacion import MAX_KM_DESDE_LA_COMUNA, distancia_km, geojson

router = APIRouter(prefix="/api/publicaciones", tags=["Publicaciones"])

NO_ENCONTRADA = HTTPException(status.HTTP_404_NOT_FOUND, "Publicación no encontrada")
NO_ES_TUYA = HTTPException(
    status.HTTP_403_FORBIDDEN, "Solo quien publicó el alojamiento puede modificarlo"
)
SOLO_OFERENTE = (
    "Para publicar un alojamiento cambia tu rol a «Tengo un espacio». "
    "Mientras buscas dónde vivir no puedes publicar"
)
# CA-05.4: la publicación acepta JPG y PNG (la foto de perfil además acepta WebP)
FORMATOS_FOTO = ("jpg", "png")


async def buscar(publicacion_id: str) -> dict:
    """La publicación con ese id; las eliminadas se tratan como inexistentes (CA-08.2)."""
    try:
        oid = ObjectId(publicacion_id)
    except InvalidId:
        raise NO_ENCONTRADA
    doc = await db.publicaciones.find_one({"_id": oid, "estado": {"$ne": "eliminada"}})
    if not doc:
        raise NO_ENCONTRADA
    return doc


async def buscar_propia(publicacion_id: str, usuario: dict) -> dict:
    """CA-07.4 y CA-08.5: solo el oferente puede editar, eliminar o cambiar las fotos."""
    doc = await buscar(publicacion_id)
    if doc["oferente_id"] != usuario["_id"]:
        raise NO_ES_TUYA
    return doc


async def migrar_ubicaciones() -> None:
    """Antes se mostraba una zona desplazada 100 a 250 m del punto marcado: las publicaciones de
    entonces pasan a mostrarse en su punto exacto. Se puede repetir sin efecto."""
    await db.publicaciones.update_many(
        {"ubicacion.punto_exacto": {"$type": "object"}, "$expr": {"$ne": ["$ubicacion.coordenadas", "$ubicacion.punto_exacto"]}},
        [{"$set": {"ubicacion.coordenadas": "$ubicacion.punto_exacto"}}],
    )


def coordenadas_desde(datos: PublicacionIn, comuna: dict) -> dict | JSONResponse:
    """El punto marcado (si lo hay), que es también el que ven todos; sin punto, el centro de la comuna."""
    punto = datos.ubicacion.punto
    if punto is None:
        return {"coordenadas": comuna["centro"], "punto_exacto": None}
    exacto = [round(punto.lng, 6), round(punto.lat, 6)]
    if distancia_km(exacto, comuna["centro"]["coordinates"]) > MAX_KM_DESDE_LA_COMUNA:
        return datos_invalidos({
            "ubicacion.punto": f"El punto marcado queda lejos de {comuna['nombre']}. Revisa la comuna o mueve el punto"
        })
    return {"coordenadas": geojson(exacto), "punto_exacto": geojson(exacto)}


async def campos_desde(datos: PublicacionIn) -> dict | JSONResponse:
    """Convierte lo enviado en los campos del documento. Devuelve un 422 si la comuna no existe o el
    punto no calza con ella."""
    try:
        comuna = await db.comunas.find_one({"_id": ObjectId(datos.ubicacion.comuna_id)})
    except InvalidId:
        comuna = None
    if not comuna:
        return datos_invalidos(COMUNA_INVALIDA)
    coordenadas = coordenadas_desde(datos, comuna)
    if isinstance(coordenadas, JSONResponse):
        return coordenadas

    gastos = datos.gastos.model_dump()
    return {
        "tipo": datos.tipo,
        "titulo": datos.titulo,
        "descripcion": datos.descripcion,
        "cupos_totales": datos.cupos_totales,
        "cupos_disponibles": datos.cupos_disponibles,
        "costo_mensual": datos.costo_mensual,
        "genero_preferido": datos.genero_preferido,
        # Sin cupos libres la publicación queda «completa» y sale de las búsquedas
        "estado": "activa" if datos.cupos_disponibles > 0 else "completa",
        "ubicacion": {
            "comuna_id": comuna["_id"],
            "comuna_nombre": comuna["nombre"],
            "sector": datos.ubicacion.sector,
            # Calle y número: se muestran en el detalle y sirven para ubicar el punto en el mapa
            "calle": datos.ubicacion.calle,
            "numero": datos.ubicacion.numero,
            "direccion_referencia": datos.ubicacion.direccion_referencia,
            # «coordenadas» es lo que se muestra (el punto marcado o el centro de la comuna); «punto_exacto», lo marcado
            **coordenadas,
        },
        "gastos": {**gastos, "todos_incluidos": all(g["incluido"] for g in gastos.values())},
        "reglas": datos.reglas.model_dump(),
        "caracteristicas": datos.caracteristicas.model_dump(),
    }


COMUNA_INVALIDA = {"ubicacion.comuna_id": "Selecciona una comuna de la lista"}


async def solo_oferente(usuario: dict = Depends(usuario_actual)) -> dict:
    """Publica quien tiene el rol de oferente (modos.py). Como dependencia, se revisa antes que los
    datos del formulario: a un buscador no se le muestran errores de campos, sino que cambie de rol.
    El frontend reconoce el 409 y le ofrece cambiarlo."""
    if not esta_verificado(usuario):
        raise HTTPException(status.HTTP_403_FORBIDDEN, SIN_VERIFICAR)
    if usuario.get("modo") != "oferente":
        raise HTTPException(status.HTTP_409_CONFLICT, SOLO_OFERENTE)
    return usuario


async def oferentes_verificados() -> list[ObjectId]:
    """Solo se muestran las publicaciones de oferentes verificados. Las de una cuenta con acceso
    limitado no cambian de estado: vuelven a verse en cuanto se verifica."""
    return [u["_id"] async for u in db.usuarios.find(VERIFICADO, {"_id": 1})]


@router.post("", status_code=status.HTTP_201_CREATED)
async def publicar(datos: PublicacionIn, usuario: dict = Depends(solo_oferente)):
    """HU-05 y HU-06: solo el oferente publica (modos.py)."""
    campos = await campos_desde(datos)
    if isinstance(campos, JSONResponse):
        return campos
    if datos.cupos_disponibles == 0:
        return datos_invalidos({"cupos_disponibles": "Al publicar debe haber al menos un cupo disponible"})

    doc = {
        "codigo": await siguiente_codigo("publicaciones"),
        "oferente_id": usuario["_id"],
        **campos,
        "fotos": [],
        "fecha_publicacion": datetime.now(timezone.utc),
        "fecha_ultima_modificacion": None,
        "fecha_eliminacion": None,
        "eliminada_por": None,
        "cantidad_reportes": 0,
        "cantidad_reportes_pendiente": 0,
    }
    resultado = await db.publicaciones.insert_one(doc)
    doc["_id"] = resultado.inserted_id
    await generar_propuestas()  # HU-17: el alojamiento nuevo se puede proponer a quienes buscan
    return {
        "mensaje": "Publicación creada",
        "publicacion": PublicacionOut.desde_doc(doc, es_propia=True, oferente=usuario),
    }


# Cada vocal acepta sus variantes con tilde: «concepcion» encuentra «Concepción» y al revés
VARIANTES = {"a": "aáàä", "e": "eéèë", "i": "iíìï", "o": "oóòö", "u": "uúùü", "n": "nñ"}


def patron_sin_tildes(palabra: str) -> str:
    return "".join(
        f"[{VARIANTES[base]}]" if (base := next((b for b, v in VARIANTES.items() if c in v), None)) else re.escape(c)
        for c in palabra.lower()
    )


CAMPOS_TEXTO = ("titulo", "descripcion", "ubicacion.comuna_nombre", "ubicacion.sector")


def filtro_texto(texto: str) -> list[dict]:
    """Cada palabra debe aparecer en alguno de los campos («pieza talcahuano» busca las dos)."""
    return [
        {"$or": [{campo: {"$regex": patron_sin_tildes(palabra), "$options": "i"}} for campo in CAMPOS_TEXTO]}
        for palabra in texto.split()[:8]
    ]


async def consulta_de_busqueda(filtros: FiltrosBusqueda, usuario: dict) -> dict | JSONResponse:
    """La consulta de Mongo con todos los filtros combinados (CA-11.4 y CA-12.3). La usan el
    listado y el mapa, para que muestren exactamente lo mismo. Devuelve un 422 si algo no calza."""
    if error := error_rango(filtros.costo_min, filtros.costo_max):
        return datos_invalidos(error)

    # CA-09.5: eliminadas, suspendidas por un administrador o sin cupos no aparecen
    consulta: dict = {"estado": "activa", "oferente_id": {"$in": await oferentes_verificados()},
                      **filtro_preferencias(filtros)}

    zonas: set | None = None
    if filtros.comunas:
        comunas = await ids_comunas(filtros.comunas)
        if comunas is None:
            return datos_invalidos({"comunas": "Selecciona comunas de la lista"})
        zonas = set(comunas)
    if zonas is not None:
        consulta["ubicacion.comuna_id"] = {"$in": list(zonas)}
    if filtros.cerca_institucion:
        # CA-11.3: a radio_km o menos de la sede del perfil, medido desde la ubicación de cada alojamiento
        # (el punto marcado o, sin él, el centro de su comuna). Es lo mismo que el círculo del mapa
        sede = await sede_del_perfil(usuario)
        if sede is None:
            return datos_invalidos({
                "cerca_institucion": "Indica tu institución y sede en tu perfil para usar esta opción"
            })
        consulta["ubicacion.coordenadas"] = {
            "$geoWithin": {"$centerSphere": [sede["coordenadas"], filtros.radio_km / RADIO_TIERRA_KM]}
        }
    if filtros.buscar.strip():
        consulta["$and"] = filtro_texto(filtros.buscar)
    return consulta


@router.get("")
async def buscar_alojamientos(
    filtros: Annotated[FiltrosBusqueda, Query()], usuario: dict = Depends(usuario_actual)
):
    """HU-09 a HU-12: alojamientos activos de a 10, del más reciente al más antiguo (CA-09.1) o,
    con orden=cercania, del más cercano a la sede del perfil al más lejano."""
    consulta = await consulta_de_busqueda(filtros, usuario)
    if isinstance(consulta, JSONResponse):
        return consulta
    sede = await sede_del_perfil(usuario)
    if filtros.orden == "cercania" and not sede:
        return datos_invalidos({"orden": "Indica tu institución y sede en tu perfil para ordenar por cercanía"})

    total = await db.publicaciones.count_documents(consulta)
    saltar = (filtros.pagina - 1) * TAMANO_PAGINA
    if filtros.orden == "cercania":
        # $geoNear usa el índice de ubicacion.coordenadas: el punto marcado o el centro de la comuna
        cursor = await db.publicaciones.aggregate([
            {"$geoNear": {
                "near": geojson(sede["coordenadas"]), "key": "ubicacion.coordenadas",
                "distanceField": "distancia_m", "spherical": True, "query": consulta,
            }},
            # Las del centro de una misma comuna empatan: entre ellas, la más reciente primero
            {"$sort": {"distancia_m": 1, "fecha_publicacion": -1, "_id": -1}},
            {"$skip": saltar},
            {"$limit": TAMANO_PAGINA},
        ])
    else:
        cursor = (
            db.publicaciones.find(consulta)
            .sort([("fecha_publicacion", -1), ("_id", -1)])
            .skip(saltar)
            .limit(TAMANO_PAGINA)
        )
    return {
        "total": total,
        "pagina": filtros.pagina,
        "paginas": max(1, -(-total // TAMANO_PAGINA)),
        "orden": filtros.orden,
        "resultados": [
            con_distancia(PublicacionOut.desde_doc(doc, es_propia=doc["oferente_id"] == usuario["_id"]), doc, sede)
            async for doc in cursor
        ],
    }


def con_distancia(pub: PublicacionOut, doc: dict, sede: dict | None) -> PublicacionOut:
    """La publicación con la distancia de su ubicación a la sede (sin sede, queda en None)."""
    if not sede:
        return pub
    km = distancia_km(doc["ubicacion"]["coordenadas"]["coordinates"], sede["coordenadas"])
    return pub.model_copy(update={"distancia_km": round(km, 1)})


# Radio medio de la Tierra, para pasar km a radianes en $centerSphere
RADIO_TIERRA_KM = 6378.1

# El mapa trae todos los resultados de una vez (sin páginas), con este tope por si crecen mucho
MAX_PUNTOS_MAPA = 300


async def sede_del_perfil(usuario: dict) -> dict | None:
    """La sede del perfil con sus coordenadas, para ubicarla en el mapa y medir distancias. Si la
    sede no calza con ninguna, se usa la primera de la institución."""
    perfil = usuario.get("perfil", {})
    if not perfil.get("institucion_id"):
        return None
    institucion = await db.instituciones.find_one({"_id": perfil["institucion_id"]}, {"sigla": 1, "nombre": 1, "sedes": 1})
    sedes = (institucion or {}).get("sedes", [])
    sede = next((s for s in sedes if s["nombre"] == perfil.get("sede")), sedes[0] if sedes else None)
    if not sede or not sede.get("coordenadas"):
        return None
    comuna = await db.comunas.find_one({"_id": sede.get("comuna_id")}, {"nombre": 1})
    return {
        "institucion": institucion["sigla"],
        "institucion_nombre": institucion["nombre"],
        "nombre": sede["nombre"],
        # Dirección y comuna, para mostrarlas junto al mapa (la dirección puede faltar)
        "direccion": sede.get("direccion"),
        "comuna": comuna["nombre"] if comuna else None,
        "coordenadas": sede["coordenadas"]["coordinates"],
    }


@router.get("/mapa")
async def mapa_de_alojamientos(
    filtros: Annotated[FiltrosBusqueda, Query()], usuario: dict = Depends(usuario_actual)
):
    """Los mismos alojamientos del listado, como puntos para el mapa, con la distancia a la sede.

    `precision` dice qué es cada punto: «exacta» (el punto que marcó el oferente) o «comuna» (sin punto
    marcado, el centro de la comuna; varias pueden compartirlo).
    """
    consulta = await consulta_de_busqueda(filtros, usuario)
    if isinstance(consulta, JSONResponse):
        return consulta
    sede = await sede_del_perfil(usuario)
    total = await db.publicaciones.count_documents(consulta)
    cursor = (
        db.publicaciones.find(consulta, {
            "titulo": 1, "tipo": 1, "costo_mensual": 1, "cupos_disponibles": 1, "ubicacion": 1, "fotos": 1,
            "oferente_id": 1,
        })
        .sort([("fecha_publicacion", -1), ("_id", -1)])
        .limit(MAX_PUNTOS_MAPA)
    )
    puntos = []
    async for p in cursor:
        es_propia = p["oferente_id"] == usuario["_id"]
        exacto = p["ubicacion"].get("punto_exacto")
        coordenadas = exacto["coordinates"] if exacto else p["ubicacion"]["coordenadas"]["coordinates"]
        precision = "exacta" if exacto else "comuna"
        principal = next((f["url"] for f in p.get("fotos", []) if f["es_principal"]), None)
        puntos.append({
            "id": str(p["_id"]),
            "titulo": p["titulo"],
            "tipo": p["tipo"],
            "costo_mensual": p["costo_mensual"],
            "cupos_disponibles": p["cupos_disponibles"],
            "comuna": p["ubicacion"]["comuna_nombre"],
            "sector": p["ubicacion"]["sector"],
            "foto_url": principal,
            "coordenadas": coordenadas,
            "precision": precision,
            "distancia_km": round(distancia_km(coordenadas, sede["coordenadas"]), 1) if sede else None,
            "es_propia": es_propia,
        })
    return {"total": total, "mostrados": len(puntos), "sede": sede, "puntos": puntos}


@router.get("/filtros")
async def opciones_de_filtro(usuario: dict = Depends(usuario_actual)):
    """Opciones del panel de filtros.

    CA-11.2: solo las comunas que tienen publicaciones activas, con su provincia (concepcion, arauco o biobio).
    CA-11.3: la institución del perfil, para la opción «Cerca de mi institución».
    """
    conteo = {
        fila["_id"]: fila["cantidad"]
        async for fila in await db.publicaciones.aggregate([
            {"$match": {"estado": "activa", "oferente_id": {"$in": await oferentes_verificados()}}},
            {"$group": {"_id": "$ubicacion.comuna_id", "cantidad": {"$sum": 1}}},
        ])
    }
    comunas = [
        {"id": str(c["_id"]), "nombre": c["nombre"], "sector": c["sector"], "cantidad": conteo[c["_id"]]}
        async for c in db.comunas.find({"_id": {"$in": list(conteo)}}).sort("nombre")
    ]

    perfil = usuario.get("perfil", {})
    institucion = None
    if perfil.get("institucion_id"):
        inst = await db.instituciones.find_one({"_id": perfil["institucion_id"]}, {"sigla": 1})
        if inst:
            institucion = {"sigla": inst["sigla"], "sede": perfil.get("sede")}
    return {"comunas": comunas, "institucion": institucion}


@router.get("/mias", response_model=list[PublicacionOut])
async def mis_publicaciones(usuario: dict = Depends(usuario_actual)):
    """«Mis publicaciones» (CA-07.1), de la más reciente a la más antigua."""
    cursor = db.publicaciones.find(
        {"oferente_id": usuario["_id"], "estado": {"$ne": "eliminada"}}
    ).sort("fecha_publicacion", -1)
    return [PublicacionOut.desde_doc(doc, es_propia=True) async for doc in cursor]


@router.get("/{publicacion_id}", response_model=PublicacionOut)
async def detalle(publicacion_id: str, usuario: dict = Depends(usuario_actual)):
    """CA-05.5: detalle de una publicación. Los demás solo ven las activas."""
    doc = await buscar(publicacion_id)
    es_propia = doc["oferente_id"] == usuario["_id"]
    if not es_propia and doc["estado"] != "activa":
        raise NO_ENCONTRADA

    oferente = await db.usuarios.find_one({"_id": doc["oferente_id"]})
    # Una cuenta con acceso limitado no se les muestra a los demás, tampoco sus publicaciones
    if not es_propia and (not oferente or not esta_verificado(oferente)):
        raise NO_ENCONTRADA
    pub = PublicacionOut.desde_doc(doc, es_propia=es_propia, oferente=oferente)
    sede = await sede_del_perfil(usuario)
    return con_distancia(pub, doc, sede).model_copy(update={"sede": sede})


@router.put("/{publicacion_id}")
async def editar(publicacion_id: str, datos: PublicacionIn, usuario: dict = Depends(usuario_actual)):
    """HU-07: mismas validaciones que al publicar (CA-07.3)."""
    doc = await buscar_propia(publicacion_id, usuario)
    if doc["estado"] == "suspendida":
        raise HTTPException(
            status.HTTP_409_CONFLICT, "La publicación está suspendida por moderación y no se puede editar"
        )
    campos = await campos_desde(datos)
    if isinstance(campos, JSONResponse):
        return campos

    # Pausada por el cambio de rol: si su dueño sigue siendo buscador, sigue pausada. Si ya volvió a
    # ser oferente, guardarla equivale a responder «sí, sigue disponible» (opción «Editarla antes»)
    if doc["estado"] == "pausada" and usuario.get("modo") != "oferente":
        campos["estado"] = "pausada"
    campos["fecha_ultima_modificacion"] = datetime.now(timezone.utc)  # CA-07.5
    await db.publicaciones.update_one({"_id": doc["_id"]}, {"$set": campos})
    actualizado = await db.publicaciones.find_one({"_id": doc["_id"]})
    # HU-17: sin cupos se cierran sus propuestas abiertas; con los cambios puede calzar con otros
    if actualizado["estado"] != "activa":
        await cerrar_propuestas_de_publicacion(doc["_id"])
    await generar_propuestas()
    return {
        "mensaje": "Cambios guardados",
        "publicacion": PublicacionOut.desde_doc(actualizado, es_propia=True, oferente=usuario),
    }


@router.post("/{publicacion_id}/reactivar")
async def reactivar(publicacion_id: str, usuario: dict = Depends(usuario_actual)):
    """El oferente que volvió a ese rol confirma que su publicación pausada sigue disponible
    (modos.py). Vuelve a verse si tiene cupos; si no, queda «completa»."""
    doc = await buscar_propia(publicacion_id, usuario)
    if usuario.get("modo") != "oferente":
        raise HTTPException(status.HTTP_409_CONFLICT, SOLO_OFERENTE)
    estado = "activa" if doc["cupos_disponibles"] > 0 else "completa"
    # La condición evita reactivar algo que, entretanto, un administrador ocultó
    resultado = await db.publicaciones.update_one(
        {"_id": doc["_id"], "estado": "pausada"},
        {"$set": {"estado": estado, "fecha_ultima_modificacion": datetime.now(timezone.utc)}},
    )
    if not resultado.modified_count:
        raise HTTPException(status.HTTP_409_CONFLICT, "Esta publicación ya no está pausada")
    if estado == "activa":
        await generar_propuestas()  # HU-17: se puede proponer otra vez a quienes buscan
    return {"mensaje": "Publicación activa de nuevo" if estado == "activa"
            else "Publicación guardada como completa: no tiene cupos disponibles", "estado": estado}


@router.delete("/{publicacion_id}")
async def eliminar(publicacion_id: str, usuario: dict = Depends(usuario_actual)):
    """HU-08: eliminación lógica; el registro se conserva para el historial (CA-08.4)."""
    doc = await buscar_propia(publicacion_id, usuario)
    await db.publicaciones.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "estado": "eliminada",
                "fecha_eliminacion": datetime.now(timezone.utc),
                "eliminada_por": "oferente",
            }
        },
    )
    await cerrar_propuestas_de_publicacion(doc["_id"])
    return {"mensaje": "Publicación eliminada"}


@router.post("/{publicacion_id}/fotos")
async def subir_foto(
    publicacion_id: str, foto: UploadFile = File(...), usuario: dict = Depends(usuario_actual)
):
    """CA-05.4: hasta 5 fotos JPG o PNG de máximo 5 MB cada una. La primera queda como principal."""
    doc = await buscar_propia(publicacion_id, usuario)
    fotos = doc.get("fotos", [])
    if len(fotos) >= MAX_FOTOS:
        return datos_invalidos({"fotos": f"Puedes subir como máximo {MAX_FOTOS} fotos"})

    limite = settings.max_foto_mb * 1024 * 1024
    contenido = await foto.read(limite + 1)
    if len(contenido) > limite:
        return datos_invalidos({"fotos": f"Cada foto debe pesar como máximo {settings.max_foto_mb} MB"})
    extension = tipo_imagen(contenido)
    if extension not in FORMATOS_FOTO:
        return datos_invalidos({"fotos": "Las fotos deben ser imágenes JPG o PNG"})

    url = await run_in_threadpool(guardar_foto_publicacion, publicacion_id, contenido, extension)
    nueva = {
        "url": url,
        "formato": extension,
        "tamano_bytes": len(contenido),
        "es_principal": not fotos,
        "orden": len(fotos),
        "fecha_subida": datetime.now(timezone.utc),
    }
    # La condición sobre el largo evita pasarse de 5 si llegan dos subidas a la vez
    resultado = await db.publicaciones.update_one(
        {"_id": doc["_id"], f"fotos.{MAX_FOTOS - 1}": {"$exists": False}},
        {"$push": {"fotos": nueva}},
    )
    if not resultado.modified_count:
        await run_in_threadpool(borrar_foto, url)
        return datos_invalidos({"fotos": f"Puedes subir como máximo {MAX_FOTOS} fotos"})
    return {"mensaje": "Foto agregada", "foto": {"url": url, "es_principal": nueva["es_principal"]}}


async def reordenar_fotos(publicacion_id: ObjectId, fotos: list[dict]) -> None:
    """Deja el orden correlativo y garantiza que haya una foto principal si quedan fotos."""
    if fotos and not any(f["es_principal"] for f in fotos):
        fotos[0]["es_principal"] = True
    for orden, foto in enumerate(fotos):
        foto["orden"] = orden
    await db.publicaciones.update_one({"_id": publicacion_id}, {"$set": {"fotos": fotos}})


@router.delete("/{publicacion_id}/fotos/{nombre}")
async def quitar_foto(publicacion_id: str, nombre: str, usuario: dict = Depends(usuario_actual)):
    doc = await buscar_propia(publicacion_id, usuario)
    fotos = doc.get("fotos", [])
    quitada = next((f for f in fotos if f["url"].rsplit("/", 1)[-1] == nombre), None)
    if not quitada:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Foto no encontrada")

    await reordenar_fotos(doc["_id"], [f for f in fotos if f is not quitada])
    await run_in_threadpool(borrar_foto, quitada["url"])
    return {"mensaje": "Foto eliminada"}


@router.put("/{publicacion_id}/fotos/{nombre}/principal")
async def elegir_principal(publicacion_id: str, nombre: str, usuario: dict = Depends(usuario_actual)):
    """La foto principal es la que se muestra en los listados."""
    doc = await buscar_propia(publicacion_id, usuario)
    fotos = doc.get("fotos", [])
    if not any(f["url"].rsplit("/", 1)[-1] == nombre for f in fotos):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Foto no encontrada")

    for foto in fotos:
        foto["es_principal"] = foto["url"].rsplit("/", 1)[-1] == nombre
    # La principal pasa al primer lugar
    fotos.sort(key=lambda f: not f["es_principal"])
    await reordenar_fotos(doc["_id"], fotos)
    return {"mensaje": "Foto principal actualizada"}
