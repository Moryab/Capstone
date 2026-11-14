from datetime import datetime
from typing import Literal, get_args

from pydantic import BaseModel, field_validator

# HU-13: categorías del cuestionario; sus opciones están en CuestionarioIn, según el modelo de datos
Categoria = Literal["horario_sueno", "horario_estudio", "orden_limpieza", "ruido", "visitas", "fumar", "mascotas"]
CATEGORIAS = get_args(Categoria)
Nivel = Literal["imprescindible", "importante", "flexible"]

MAX_IMPRESCINDIBLES = 3  # CA-13.4
NIVEL_POR_DEFECTO = "importante"


class CuestionarioIn(BaseModel):
    """Todas las categorías son obligatorias: la compatibilidad (HU-14) las necesita (CA-13.3)."""

    horario_sueno: Literal["temprano", "intermedio", "tarde"]
    horario_estudio: Literal["manana", "tarde", "noche", "variable"]
    orden_limpieza: Literal["alto", "medio", "bajo"]
    ruido: Literal["bajo", "moderado", "alto"]
    visitas: Literal["nunca", "ocasional", "frecuente"]
    fumar: Literal["no_fuma_no_tolera", "no_fuma_tolera", "fuma"]
    mascotas: Literal["no_tiene_no_tolera", "no_tiene_tolera", "tiene"]
    # Las categorías que no vengan quedan como «importante»
    importancia: dict[Categoria, Nivel] = {}

    @field_validator("importancia")
    @classmethod
    def maximo_imprescindibles(cls, v):
        if list(v.values()).count("imprescindible") > MAX_IMPRESCINDIBLES:
            raise ValueError(f"Puedes marcar hasta {MAX_IMPRESCINDIBLES} categorías como imprescindibles")
        return {categoria: v.get(categoria, NIVEL_POR_DEFECTO) for categoria in CATEGORIAS}


class CuestionarioAvanceIn(BaseModel):
    """Autoguardado mientras se responde por primera vez: llegan solo las respuestas que cambiaron.
    Mismos valores permitidos que CuestionarioIn; ninguna es obligatoria."""

    horario_sueno: Literal["temprano", "intermedio", "tarde"] | None = None
    horario_estudio: Literal["manana", "tarde", "noche", "variable"] | None = None
    orden_limpieza: Literal["alto", "medio", "bajo"] | None = None
    ruido: Literal["bajo", "moderado", "alto"] | None = None
    visitas: Literal["nunca", "ocasional", "frecuente"] | None = None
    fumar: Literal["no_fuma_no_tolera", "no_fuma_tolera", "fuma"] | None = None
    mascotas: Literal["no_tiene_no_tolera", "no_tiene_tolera", "tiene"] | None = None
    importancia: dict[Categoria, Nivel] = {}


def respuestas_de(cuestionario: dict) -> dict:
    return {categoria: cuestionario.get(categoria) for categoria in CATEGORIAS}


def importancia_de(cuestionario: dict) -> dict:
    """En la base es una lista [{categoria, nivel}]; aquí se usa como {categoria: nivel}."""
    guardada = {i["categoria"]: i["nivel"] for i in cuestionario.get("importancia", [])}
    return {categoria: guardada.get(categoria, NIVEL_POR_DEFECTO) for categoria in CATEGORIAS}


class CuestionarioOut(BaseModel):
    respuestas: dict[str, str | None]
    importancia: dict[str, str]
    completo: bool
    campos_faltantes: list[str]
    fecha_respuesta: datetime | None = None
    fecha_actualizacion: datetime | None = None

    @classmethod
    def desde_doc(cls, usuario: dict) -> "CuestionarioOut":
        cuestionario = usuario.get("cuestionario") or {}
        respuestas = respuestas_de(cuestionario)
        return cls(
            respuestas=respuestas,
            importancia=importancia_de(cuestionario),
            completo=cuestionario.get("completo", False),
            campos_faltantes=[c for c, v in respuestas.items() if v is None],
            fecha_respuesta=cuestionario.get("fecha_respuesta"),
            fecha_actualizacion=cuestionario.get("fecha_actualizacion"),
        )
