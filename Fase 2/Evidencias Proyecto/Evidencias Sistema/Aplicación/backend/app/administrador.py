"""Catálogos de comunas e instituciones del Gran Concepción que se cargan al iniciar la API.

Se insertan solo si no existen (por su código), así no se pisan cambios hechos después en la base.
Las coordenadas son aproximadas y las direcciones o dominios en None están por confirmar.
"""

from datetime import datetime, timezone

from app.config import settings
from app.db import db
from app.security import cifrar_password

# (codigo, nombre, sector, [longitud, latitud]) — GeoJSON usa primero la longitud
COMUNAS = [
    (1, "Concepción", "centro", [-73.0498, -36.8270]),
    (2, "Talcahuano", "norte", [-73.1170, -36.7249]),
    (3, "Hualpén", "norte", [-73.0950, -36.7900]),
    (4, "San Pedro de la Paz", "sur", [-73.1060, -36.8430]),
    (5, "Chiguayante", "sur", [-73.0280, -36.9250]),
    (6, "Penco", "norte", [-72.9950, -36.7400]),
    (7, "Tomé", "norte", [-72.9570, -36.6170]),
    (8, "Coronel", "sur", [-73.1580, -37.0170]),
    (9, "Lota", "sur", [-73.1560, -37.0890]),
    (10, "Hualqui", "sur", [-72.9380, -36.9770]),
]

CERCA_DE_CONCEPCION = ["Concepción", "San Pedro de la Paz", "Chiguayante", "Hualpén", "Talcahuano"]
CERCA_DE_TALCAHUANO = ["Talcahuano", "Hualpén", "Concepción", "Penco"]

# (codigo, nombre, sigla, tipo, dominios_correo, sedes)
# sede: (nombre, comuna, direccion, [longitud, latitud], comunas cercanas)
INSTITUCIONES = [
    (1, "Universidad de Concepción", "UdeC", "universidad", ["udec.cl"], [
        ("Campus Concepción", "Concepción", "Víctor Lamas 1290", [-73.0359, -36.8296], CERCA_DE_CONCEPCION),
    ]),
    (2, "Universidad del Bío-Bío", "UBB", "universidad", ["ubiobio.cl", "alumnos.ubiobio.cl"], [
        ("Sede Concepción", "Concepción", "Avenida Collao 1202", [-73.0128, -36.8211], CERCA_DE_CONCEPCION),
    ]),
    (3, "Universidad Católica de la Santísima Concepción", "UCSC", "universidad", ["ucsc.cl"], [
        ("Campus San Andrés", "Concepción", "Alonso de Ribera 2850", [-73.0612, -36.7966], CERCA_DE_CONCEPCION),
    ]),
    (4, "Universidad Andrés Bello", "UNAB", "universidad", ["unab.cl", "uandresbello.edu"], [
        ("Sede Concepción", "Talcahuano", "Autopista Concepción-Talcahuano 7100", [-73.0773, -36.7869], CERCA_DE_TALCAHUANO),
    ]),
    (5, "Universidad San Sebastián", "USS", "universidad", ["uss.cl", "correo.uss.cl"], [
        ("Sede Concepción", "Concepción", "Lientur 1457", [-73.0379, -36.8330], CERCA_DE_CONCEPCION),
    ]),
    (6, "Universidad del Desarrollo", "UDD", "universidad", ["udd.cl"], [
        ("Sede Concepción", "Concepción", "Ainavillo 456", [-73.0300, -36.8125], CERCA_DE_CONCEPCION),
    ]),
    (7, "Universidad Santo Tomás", "UST", "universidad", ["santotomas.cl"], [
        ("Sede Concepción", "Concepción", None, [-73.0498, -36.8270], CERCA_DE_CONCEPCION),
    ]),
    (8, "Duoc UC", "Duoc UC", "instituto_profesional", ["duocuc.cl"], [
        ("Sede San Andrés de Concepción", "Concepción", "Paicaví 3280", [-73.0560, -36.8090], CERCA_DE_CONCEPCION),
    ]),
    (9, "INACAP", "INACAP", "instituto_profesional", ["inacap.cl", "inacapmail.cl"], [
        ("Sede Concepción-Talcahuano", "Talcahuano", None, [-73.0800, -36.7800], CERCA_DE_TALCAHUANO),
    ]),
    (10, "Instituto Profesional Virginio Gómez", "IPVG", "instituto_profesional", ["virginiogomez.cl"], [
        ("Sede Concepción", "Concepción", None, [-73.0498, -36.8270], CERCA_DE_CONCEPCION),
    ]),
    (11, "Instituto Profesional AIEP", "AIEP", "instituto_profesional", ["aiep.cl"], [
        ("Sede Concepción", "Concepción", None, [-73.0498, -36.8270], CERCA_DE_CONCEPCION),
    ]),
]


def punto(coordenadas: list[float]) -> dict:
    return {"type": "Point", "coordinates": coordenadas}


async def insertar_si_no_existe(coleccion: str, documentos: list[dict]) -> None:
    for doc in documentos:
        await db[coleccion].update_one({"codigo": doc["codigo"]}, {"$setOnInsert": doc}, upsert=True)
    # El contador queda al día para que lo que se cree después no repita códigos
    mayor = max(doc["codigo"] for doc in documentos)
    await db.contadores.update_one({"_id": coleccion}, {"$max": {"secuencia": mayor}}, upsert=True)


async def cargar_datos_iniciales() -> None:
    await insertar_si_no_existe("comunas", [
        {"codigo": codigo, "nombre": nombre, "region": "Biobío", "sector": sector, "centro": punto(centro)}
        for codigo, nombre, sector, centro in COMUNAS
    ])

    ids_comunas = {c["nombre"]: c["_id"] async for c in db.comunas.find({}, {"nombre": 1})}

    await insertar_si_no_existe("instituciones", [
        {
            "codigo": codigo,
            "nombre": nombre,
            "sigla": sigla,
            "tipo": tipo,
            "dominios_correo": dominios,
            "activa": True,
            "sedes": [
                {
                    "nombre": sede,
                    "comuna_id": ids_comunas[comuna],
                    "direccion": direccion,
                    "coordenadas": punto(coordenadas),
                    "comunas_cercanas_ids": [ids_comunas[c] for c in cercanas],
                    "sectores_cercanos": [],
                }
                for sede, comuna, direccion, coordenadas, cercanas in sedes
            ],
        }
        for codigo, nombre, sigla, tipo, dominios, sedes in INSTITUCIONES
    ])
    await crear_administrador()


async def crear_administrador() -> None:
    """Cuenta de administrador con el correo y la clave del .env (ADMIN_CORREO y ADMIN_PASSWORD).

    Si ya existe no se toca: la clave se cambia directamente en la base o borrando la cuenta.
    No tiene RUT, teléfono ni cuestionario, por lo que nunca aparece como estudiante.
    """
    if not settings.admin_correo or not settings.admin_password:
        return
    correo = settings.admin_correo.lower()
    ahora = datetime.now(timezone.utc)
    await db.usuarios.update_one(
        {"correo": correo},
        {"$setOnInsert": {
            "rut": f"admin:{correo}",  # el índice de RUT es único; el administrador no es estudiante
            "nombre": "Administrador",
            "ap_paterno": "RoomMatch",
            "correo": correo,
            "password": cifrar_password(settings.admin_password),
            "fecha_registro": ahora,
            "fecha_actualizacion": ahora,
            "rol": "administrador",
            "estado_cuenta": "activa",
            "correo_verificado": True,
            "verificacion": {"estado": "no_verificado"},
            "perfil": {"perfil_completo": False, "campos_faltantes": []},
            "seguridad": {"intentos_fallidos": 0, "bloqueado_hasta": None, "token_version": 0},
        }},
        upsert=True,
    )
