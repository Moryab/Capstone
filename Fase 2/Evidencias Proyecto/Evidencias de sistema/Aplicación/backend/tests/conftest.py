"""Configuración común de las pruebas automatizadas de RoomMatch.

Las pruebas usan una base de datos aparte (MONGO_DB debe terminar en «_test»): se prepara con los mismos
scripts de la carpeta «Base de datos» y se borra al terminar. Si MONGO_DB apunta a otra base, las pruebas
no se ejecutan, para no tocar nunca los datos reales. Cómo ejecutarlas: tests/README.md.
"""

import os
import random
import uuid
from datetime import date

import pytest

if not os.environ.get("MONGO_DB", "").endswith("_test"):
    pytest.exit("MONGO_DB debe ser una base de prueba (terminar en «_test»). Revisa tests/README.md", returncode=2)

from bson import ObjectId  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from pymongo import MongoClient  # noqa: E402

from app.config import settings  # noqa: E402
from app.main import app  # noqa: E402

CLAVE = "Prueba1234"

# Respuestas del cuestionario usadas por defecto (todas «importante»)
CUESTIONARIO = {
    "horario_sueno": "intermedio",
    "horario_estudio": "tarde",
    "orden_limpieza": "medio",
    "ruido": "moderado",
    "visitas": "ocasional",
    "fumar": "no_fuma_tolera",
    "mascotas": "no_tiene_tolera",
    "importancia": {},
}


def rut_valido(cuerpo: int) -> str:
    """Un RUT con su dígito verificador correcto (módulo 11)."""
    suma, factor = 0, 2
    for digito in reversed(str(cuerpo)):
        suma += int(digito) * factor
        factor = 2 if factor == 7 else factor + 1
    resto = 11 - suma % 11
    return f"{cuerpo}-{ {10: 'K', 11: '0'}.get(resto, str(resto)) }".replace(" ", "")


def datos_registro(**cambios) -> dict:
    """Datos de registro válidos con RUT, correo y teléfono únicos en cada llamada."""
    hoy = date.today()
    datos = {
        "nombre": "Prueba",
        "ap_paterno": "Automatizada",
        "ap_materno": "RoomMatch",
        "fecha_nac": date(hoy.year - 21, 1, 15).isoformat(),
        "genero": "femenino",
        "correo": f"prueba.{uuid.uuid4().hex[:12]}@pruebas.cl",
        "rut": rut_valido(random.randint(10_000_000, 29_999_999)),
        "telefono": f"9{random.randint(10_000_000, 99_999_999)}",
        "password": CLAVE,
        "confirmacion": CLAVE,
    }
    return {**datos, **cambios}


@pytest.fixture(scope="session")
def bd():
    """Acceso directo a la base de prueba, para preparar datos y revisar resultados. Al final la borra."""
    cliente = MongoClient(settings.mongo_uri, tz_aware=True)
    base = cliente[settings.mongo_db]
    yield base
    cliente.drop_database(settings.mongo_db)
    cliente.close()


@pytest.fixture(scope="session")
def cliente(bd):
    """Cliente de pruebas de FastAPI: levanta la API completa (con su inicio) contra la base de prueba."""
    with TestClient(app) as c:
        yield c


def iniciar_sesion(cliente, correo: str, clave: str = CLAVE) -> dict:
    r = cliente.post("/api/auth/login", json={"correo": correo, "password": clave})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="session")
def admin(cliente):
    """Encabezados con la sesión del administrador que la API crea al iniciar."""
    return iniciar_sesion(cliente, settings.admin_correo, settings.admin_password)


@pytest.fixture(scope="session")
def estudiante(cliente, bd):
    """Crea estudiantes por la API y devuelve {id, correo, headers}.

    Por defecto el correo queda verificado (en la plataforma se hace con un código que llega por correo).
    Con verificado=True queda además como estudiante verificado; modo, cuestionario y buscando ajustan
    el resto de su estado.
    """

    def crear(verificado=False, modo=None, cuestionario=None, buscando=False, **datos):
        registro = datos_registro(**datos)
        r = cliente.post("/api/auth/registro", json=registro)
        assert r.status_code == 201, r.text
        uid = ObjectId(r.json()["usuario"]["id"])
        cambios = {"correo_verificado": True, "modo": modo, "buscando_alojamiento": buscando}
        if verificado:
            cambios["verificacion"] = {"estado": "verificado"}
        bd.usuarios.update_one({"_id": uid}, {"$set": cambios})
        headers = iniciar_sesion(cliente, registro["correo"])
        if cuestionario is not None:
            r = cliente.put("/api/cuestionario", json=cuestionario, headers=headers)
            assert r.status_code == 200, r.text
        return {"id": str(uid), "correo": registro["correo"], "headers": headers}

    return crear


def publicacion(comuna_id: str, costo: int = 180_000, **cambios) -> dict:
    """Datos válidos para publicar un alojamiento."""
    gasto = {"incluido": True}
    return {
        "tipo": "habitacion",
        "titulo": "Habitación de prueba automatizada",
        "descripcion": "Habitación amoblada creada por las pruebas automatizadas.",
        "cupos_totales": 2,
        "cupos_disponibles": 1,
        "costo_mensual": costo,
        "genero_preferido": "indiferente",
        "ubicacion": {"comuna_id": comuna_id, "sector": "Centro", "calle": "Calle de prueba", "numero": "123"},
        "gastos": {"agua": gasto, "luz": gasto, "gas": gasto, "internet": gasto},
        "reglas": {
            "permite_fumar": False, "permite_mascotas": False, "permite_visitas": True,
            "horario_silencio": {"aplica": False},
        },
        **cambios,
    }


@pytest.fixture(scope="session")
def comuna_id(bd) -> str:
    return str(bd.comunas.find_one({}, {"_id": 1})["_id"])


@pytest.fixture(scope="session")
def institucion_id(bd) -> str:
    return str(bd.instituciones.find_one({"activa": True}, {"_id": 1})["_id"])


def pytest_terminal_summary(terminalreporter):
    """Muestra los tiempos medidos por las pruebas de rendimiento al final de la ejecución."""
    from .test_rendimiento import MEDICIONES

    if MEDICIONES:
        terminalreporter.section("Mediciones de rendimiento")
        for linea in MEDICIONES:
            terminalreporter.write_line(linea)


# Archivos de prueba para los comprobantes de estudiante
PDF_MINIMO = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"
