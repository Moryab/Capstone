from typing import Literal

from pydantic import BaseModel, Field, ValidationInfo, field_validator

# CA-24.1. «comportamiento_inapropiado» e «informacion_falsa» aún no están en el enum del modelo de datos
MotivoPerfil = Literal["perfil_falso", "comportamiento_inapropiado", "informacion_falsa", "estafa", "otro"]
# CA-25.1. «fotos_no_corresponden» aún no está en el enum del modelo de datos
MotivoPublicacion = Literal["publicacion_enganosa", "estafa", "contenido_inapropiado", "fotos_no_corresponden", "otro"]

MAX_DESCRIPCION = 500


class ReporteIn(BaseModel):
    """El motivo es obligatorio y la descripción solo se exige con «otro» (CA-24.3 y CA-25.3)."""

    motivo: str
    # validate_default: si no llega, igual se revisa que «otro» traiga descripción
    descripcion: str | None = Field(default=None, max_length=MAX_DESCRIPCION, validate_default=True)

    @field_validator("descripcion")
    @classmethod
    def descripcion_segun_motivo(cls, v: str | None, info: ValidationInfo) -> str | None:
        v = (v or "").strip() or None
        if not v and info.data.get("motivo") == "otro":
            raise ValueError("Cuéntanos qué ocurrió")
        return v


class ReportePerfilIn(ReporteIn):
    motivo: MotivoPerfil


class ReportePublicacionIn(ReporteIn):
    motivo: MotivoPublicacion
