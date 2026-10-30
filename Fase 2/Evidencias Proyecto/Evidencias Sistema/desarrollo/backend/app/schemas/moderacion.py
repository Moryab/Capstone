from typing import Literal

from pydantic import BaseModel, Field, field_validator

MAX_JUSTIFICACION = 500

# CA-27.1 y CA-27.2: qué se puede hacer según lo reportado
ACCIONES_PERFIL = ("desestimar", "advertir", "suspender", "quitar_verificacion")
ACCIONES_PUBLICACION = ("desestimar", "ocultar", "eliminar")
AccionReporte = Literal["desestimar", "advertir", "suspender", "quitar_verificacion", "ocultar", "eliminar"]


class JustificacionIn(BaseModel):
    """CA-27.3: sin justificación la acción no se aplica."""

    justificacion: str = Field(max_length=MAX_JUSTIFICACION)

    @field_validator("justificacion")
    @classmethod
    def justificacion_obligatoria(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Escribe la justificación")
        return v


class AccionReporteIn(JustificacionIn):
    accion: AccionReporte
