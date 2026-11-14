"""Pruebas unitarias (PU-01 a PU-14): lógica de negocio sin base de datos."""

from datetime import date, timedelta

import pytest
from pydantic import ValidationError

from app.compatibilidad import calcular, nivel_de, puntaje_categoria
from app.schemas.cuestionario import CuestionarioIn
from app.schemas.usuarios import DatosPersonales, normalizar_rut, normalizar_telefono, validar_password
from app.schemas.verificacion import TIPOS_POR_SITUACION, situacion_de

from .conftest import CUESTIONARIO


def cuestionario(importancia=None, **respuestas) -> dict:
    """Un cuestionario como se guarda en la base (importancia como lista)."""
    datos = {**{k: v for k, v in CUESTIONARIO.items() if k != "importancia"}, **respuestas}
    datos["importancia"] = [{"categoria": c, "nivel": n} for c, n in (importancia or {}).items()]
    return datos


# PU-01 · HU-14: puntaje por categoría
@pytest.mark.parametrize("categoria, a, b, esperado", [
    ("horario_sueno", "temprano", "temprano", 1.0),       # iguales
    ("horario_sueno", "temprano", "intermedio", 0.5),     # un paso
    ("horario_sueno", "temprano", "tarde", 0.0),          # extremos
    ("horario_estudio", "manana", "variable", 0.5),       # «depende del día»
    ("fumar", "no_fuma_no_tolera", "no_fuma_tolera", 1.0),
    ("fumar", "no_fuma_tolera", "fuma", 0.75),
    ("fumar", "no_fuma_no_tolera", "fuma", 0.0),
    ("mascotas", "no_tiene_tolera", "tiene", 0.75),
    ("mascotas", "no_tiene_no_tolera", "tiene", 0.0),
])
def test_pu01_puntaje_por_categoria(categoria, a, b, esperado):
    assert puntaje_categoria(categoria, a, b) == esperado


# PU-02 · HU-15: nivel según el porcentaje
@pytest.mark.parametrize("porcentaje, nivel", [(75, "alta"), (74.9, "media"), (50, "media"), (49.9, "baja")])
def test_pu02_nivel_segun_porcentaje(porcentaje, nivel):
    assert nivel_de(porcentaje) == nivel


# PU-03 · HU-14: ejemplo del anexo «Algoritmo de compatibilidad» (sección 6)
def test_pu03_ejemplo_del_anexo():
    a = cuestionario(
        horario_sueno="temprano", horario_estudio="manana", orden_limpieza="alto", ruido="bajo",
        visitas="ocasional", fumar="no_fuma_no_tolera", mascotas="no_tiene_tolera",
        importancia={"horario_sueno": "flexible", "horario_estudio": "flexible", "orden_limpieza": "imprescindible",
                     "ruido": "importante", "visitas": "importante", "fumar": "importante", "mascotas": "flexible"},
    )
    b = cuestionario(
        horario_sueno="intermedio", horario_estudio="variable", orden_limpieza="alto", ruido="moderado",
        visitas="ocasional", fumar="no_fuma_tolera", mascotas="tiene",
        importancia={"horario_sueno": "importante", "horario_estudio": "flexible", "orden_limpieza": "importante",
                     "ruido": "flexible", "visitas": "flexible", "fumar": "importante", "mascotas": "imprescindible"},
    )
    resultado = calcular(a, b)
    assert resultado["porcentaje"] == 79.4
    assert resultado["nivel"] == "alta"
    assert resultado["descartado"] is False


# PU-04 · HU-14: el cálculo es simétrico
def test_pu04_simetrico():
    a = cuestionario(horario_sueno="temprano", ruido="bajo", importancia={"ruido": "imprescindible"})
    b = cuestionario(horario_sueno="tarde", visitas="frecuente", importancia={"visitas": "flexible"})
    assert calcular(a, b)["porcentaje"] == calcular(b, a)["porcentaje"]


# PU-05 · HU-14: cuestionarios iguales dan 100%
def test_pu05_iguales_dan_100():
    assert calcular(cuestionario(), cuestionario())["porcentaje"] == 100.0


# PU-06 · HU-14: un choque en algo imprescindible descarta el par
def test_pu06_choque_imprescindible_descarta():
    no_tolera = cuestionario(fumar="no_fuma_no_tolera", importancia={"fumar": "imprescindible"})
    fuma = cuestionario(fumar="fuma")
    resultado = calcular(no_tolera, fuma)
    assert resultado["descartado"] is True
    assert resultado["categoria_descarte"] == "fumar"


# PU-07 · HU-14: el mismo choque en algo importante no descarta, pero baja el porcentaje
def test_pu07_choque_importante_no_descarta():
    no_tolera = cuestionario(fumar="no_fuma_no_tolera", importancia={"fumar": "importante"})
    resultado = calcular(no_tolera, cuestionario(fumar="fuma"))
    assert resultado["descartado"] is False
    assert resultado["porcentaje"] < 100


# PU-08 · HU-19: un ajuste personal sobre una categoría con problemas baja más el porcentaje
def test_pu08_ajuste_personal_baja_mas():
    a, b = cuestionario(ruido="bajo"), cuestionario(ruido="alto")
    sin_ajuste = calcular(a, b)["porcentaje"]
    con_ajuste = calcular(a, b, ajustes_a={"ruido": 2.0})["porcentaje"]
    assert con_ajuste < sin_ajuste


# PU-09 · CA-01.3: RUT válido con o sin puntos se normaliza
@pytest.mark.parametrize("entrada, esperado", [
    ("12.345.678-5", "12345678-5"),
    ("123456785", "12345678-5"),
    ("12345678-5", "12345678-5"),
    ("10.000.013-k", "10000013-K"),
])
def test_pu09_rut_valido_se_normaliza(entrada, esperado):
    assert normalizar_rut(entrada) == esperado


# PU-10 · CA-01.3: RUT con dígito verificador incorrecto o mal formado se rechaza
@pytest.mark.parametrize("entrada", ["12.345.678-9", "12345678-K", "abc", "123", ""])
def test_pu10_rut_invalido_se_rechaza(entrada):
    with pytest.raises(ValueError):
        normalizar_rut(entrada)


# PU-11 · HU-01: teléfono en distintos formatos se guarda como +569XXXXXXXX
@pytest.mark.parametrize("entrada", ["9 1234 5678", "912345678", "+56 9 1234 5678", "+56912345678", "(9) 1234-5678"])
def test_pu11_telefono_se_normaliza(entrada):
    assert normalizar_telefono(entrada) == "+56912345678"


def test_pu11_telefono_incompleto_se_rechaza():
    with pytest.raises(ValueError):
        normalizar_telefono("1234")


# PU-12 · CA-01.4: la contraseña exige 8 caracteres con letras y números
@pytest.mark.parametrize("clave, valida", [
    ("Clave123", True), ("corta1", False), ("solamenteletras", False), ("12345678", False),
])
def test_pu12_contrasena(clave, valida):
    if valida:
        assert validar_password(clave) == clave
    else:
        with pytest.raises(ValueError):
            validar_password(clave)


# PU-13 · HU-01: la edad debe estar entre 18 y 65 años
def _nacido_hace(anios: int, dias_extra: int = 0) -> date:
    hoy = date.today()
    try:
        fecha = hoy.replace(year=hoy.year - anios)
    except ValueError:  # 29 de febrero
        fecha = hoy.replace(year=hoy.year - anios, day=28)
    return fecha + timedelta(days=dias_extra)


@pytest.mark.parametrize("fecha, valida", [
    (_nacido_hace(18), True),                    # cumple 18 hoy
    (_nacido_hace(18, dias_extra=1), False),      # 17 años
    (_nacido_hace(65), True),
    (_nacido_hace(66), False),
])
def test_pu13_edad(fecha, valida):
    datos = {"nombre": "A", "ap_paterno": "B", "ap_materno": "C", "fecha_nac": fecha,
             "genero": "femenino", "correo": "a@b.cl"}
    if valida:
        assert DatosPersonales(**datos).fecha_nac == fecha
    else:
        with pytest.raises(ValidationError):
            DatosPersonales(**datos)


# PU-14 · CA-13.4 y HU-21: máximo 3 imprescindibles; cada documento corresponde a su situación
def test_pu14_maximo_tres_imprescindibles():
    base = {k: v for k, v in CUESTIONARIO.items() if k != "importancia"}
    tres = dict.fromkeys(["fumar", "mascotas", "ruido"], "imprescindible")
    assert CuestionarioIn(**base, importancia=tres)
    with pytest.raises(ValidationError):
        CuestionarioIn(**base, importancia={**tres, "visitas": "imprescindible"})


@pytest.mark.parametrize("tipo, situacion", [
    ("certificado_alumno_regular", "matriculado"),
    ("comprobante_matricula", "matriculado"),
    ("credencial_estudiantil", "matriculado"),
    ("carta_aceptacion", "seleccionado"),
])
def test_pu14_documento_segun_situacion(tipo, situacion):
    assert situacion_de(tipo) == situacion
    otra = "seleccionado" if situacion == "matriculado" else "matriculado"
    assert tipo not in TIPOS_POR_SITUACION[otra]
