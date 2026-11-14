"""Pruebas de rendimiento (PR-01 a PR-04): tiempos de respuesta de RNF-09, RNF-10 y RNF-03 con 1.000
estudiantes verificados cargados en la base de prueba. Los tiempos medidos se muestran al final de la
ejecución, en «Mediciones de rendimiento»."""

import random
import time
import uuid
from statistics import quantiles

import pytest
from bson import ObjectId

from app.schemas.cuestionario import CATEGORIAS

from .conftest import CLAVE, CUESTIONARIO, iniciar_sesion, publicacion, rut_valido

CANTIDAD = 1000
OPCIONES = {
    "horario_sueno": ["temprano", "intermedio", "tarde"],
    "horario_estudio": ["manana", "tarde", "noche", "variable"],
    "orden_limpieza": ["alto", "medio", "bajo"],
    "ruido": ["bajo", "moderado", "alto"],
    "visitas": ["nunca", "ocasional", "frecuente"],
    "fumar": ["no_fuma_no_tolera", "no_fuma_tolera", "fuma"],
    "mascotas": ["no_tiene_no_tolera", "no_tiene_tolera", "tiene"],
}

MEDICIONES: list[str] = []  # conftest.pytest_terminal_summary las muestra al final


def p95(tiempos: list[float]) -> float:
    return quantiles(tiempos, n=20)[-1]


@pytest.fixture(scope="module")
def mil_estudiantes(cliente, bd, estudiante):
    """Carga 1.000 buscadores verificados con respuestas variadas, copiando un registro hecho por la API."""
    modelo = bd.usuarios.find_one({"_id": ObjectId(estudiante(verificado=True, modo="buscador",
                                                              buscando=True, cuestionario=CUESTIONARIO)["id"])})
    rng = random.Random(2026)
    documentos = []
    for i in range(CANTIDAD):
        doc = {k: v for k, v in modelo.items() if k != "_id"}
        cuestionario = {c: rng.choice(OPCIONES[c]) for c in CATEGORIAS}
        cuestionario.update({
            **{k: modelo["cuestionario"][k] for k in ("completo", "campos_faltantes", "fecha_respuesta",
                                                      "fecha_actualizacion")},
            "importancia": [{"categoria": c, "nivel": rng.choice(["flexible", "importante"])} for c in CATEGORIAS],
        })
        doc.update({
            "rut": rut_valido(40_000_000 + i),
            "correo": f"carga.{i}.{uuid.uuid4().hex[:6]}@pruebas.cl",
            "perfil": {**modelo["perfil"], "telefono": f"+569{70_000_000 + i}"},
            "cuestionario": cuestionario,
        })
        documentos.append(doc)
    bd.usuarios.insert_many(documentos)
    return CANTIDAD


@pytest.fixture(scope="module")
def oferente(estudiante, mil_estudiantes):
    return estudiante(verificado=True, modo="oferente")


# PR-01 · RNF-10: guardar el cuestionario y calcular la compatibilidad con todos, en menos de 5 s
def test_pr01_cuestionario_con_mil_candidatos(cliente, oferente):
    inicio = time.perf_counter()
    r = cliente.put("/api/cuestionario", json=CUESTIONARIO, headers=oferente["headers"])
    duracion = time.perf_counter() - inicio
    assert r.status_code == 200
    calculadas = r.json()["compatibilidades_calculadas"]
    MEDICIONES.append(f"PR-01 Cuestionario con {calculadas} candidatos: {duracion:.3f} s (meta < 5 s)")
    assert calculadas >= CANTIDAD
    assert duracion < 5


# PR-02 · RNF-09: listado de posibles roomies, 30 peticiones, p95 menor a 2 s
def test_pr02_listado_de_roomies(cliente, oferente):
    cliente.put("/api/cuestionario", json=CUESTIONARIO, headers=oferente["headers"])
    tiempos = []
    for _ in range(30):
        inicio = time.perf_counter()
        r = cliente.get("/api/compatibilidades", headers=oferente["headers"])
        tiempos.append(time.perf_counter() - inicio)
        assert r.status_code == 200 and r.json()["total"] >= CANTIDAD
    MEDICIONES.append(f"PR-02 Posibles roomies (30 peticiones): p95 {p95(tiempos):.3f} s, "
                      f"máx. {max(tiempos):.3f} s (meta p95 < 2 s)")
    assert p95(tiempos) < 2


# PR-03 · RNF-09: búsqueda de alojamientos, 30 peticiones, p95 menor a 2 s
def test_pr03_busqueda_de_alojamientos(cliente, estudiante, comuna_id, mil_estudiantes):
    duenio = estudiante(verificado=True, modo="oferente")
    for costo in range(100_000, 400_000, 20_000):
        cliente.post("/api/publicaciones", json=publicacion(comuna_id, costo), headers=duenio["headers"])
    buscador = estudiante(verificado=True, modo="buscador")
    tiempos = []
    for _ in range(30):
        inicio = time.perf_counter()
        r = cliente.get("/api/publicaciones", params={"costo_max": 300_000}, headers=buscador["headers"])
        tiempos.append(time.perf_counter() - inicio)
        assert r.status_code == 200
    MEDICIONES.append(f"PR-03 Búsqueda de alojamientos (30 peticiones): p95 {p95(tiempos):.3f} s, "
                      f"máx. {max(tiempos):.3f} s (meta p95 < 2 s)")
    assert p95(tiempos) < 2


# PR-04 · RNF-03: inicio de sesión (incluye verificar el hash bcrypt), 10 peticiones, menos de 1 s
def test_pr04_inicio_de_sesion(cliente, oferente):
    tiempos = []
    for _ in range(10):
        inicio = time.perf_counter()
        iniciar_sesion(cliente, oferente["correo"], CLAVE)
        tiempos.append(time.perf_counter() - inicio)
    MEDICIONES.append(f"PR-04 Inicio de sesión (10 peticiones): máx. {max(tiempos):.3f} s (meta < 1 s)")
    assert max(tiempos) < 1
