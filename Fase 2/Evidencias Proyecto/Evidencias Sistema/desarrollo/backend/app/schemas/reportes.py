from typing import Literal

from pydantic import BaseModel, Field, ValidationInfo, field_validator

# CA-24.1. «comportamiento_inapropiado» e «informacion_falsa» aún no están en el enum del modelo de datos
MotivoPerfil = Literal["perfil_falso", "comportamiento_inapropiado", "informacion_falsa", "estafa", "otro"]

MAX_DESCRIPCION = 500


class ReportePerfilIn(BaseModel):
    """HU-24: el motivo es obligatorio y la descripción solo se exige con «otro» (CA-24.3)."""

    motivo: MotivoPerfil
    # validate_default: si no llega, igual se revisa que «otro» traiga descripción
    descripcion: str | None = Field(default=None, max_length=MAX_DESCRIPCION, validate_default=True)

    @field_validator("descripcion")
    @classmethod
    def descripcion_segun_motivo(cls, v: str | None, info: ValidationInfo) -> str | None:
        v = (v or "").strip() or None
        if not v and info.data.get("motivo") == "otro":
            raise ValueError("Cuéntanos qué ocurrió")
        return v
