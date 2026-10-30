"""EP-08: datos que envía el estudiante sobre su convivencia (HU-18 y HU-19)."""

from typing import Literal

from pydantic import BaseModel, Field, field_validator

# CA-19.1: las categorías del cuestionario más gastos, comunicación u otra (modelo de datos)
Razon = Literal[
    "horario_sueno", "horario_estudio", "orden_limpieza", "ruido", "visitas", "fumar", "mascotas",
    "gastos", "comunicacion", "otra",
]
# Motivos de término del modelo de datos (matches.motivo_fin)
MotivoFin = Literal["incompatibilidad", "termino_arriendo", "cambio_ciudad", "fin_estudios", "otro"]


def texto_opcional(v: str | None) -> str | None:
    return (v or "").strip() or None


class RazonIn(BaseModel):
    razon: Razon
    gravedad: Literal["leve", "moderada", "grave"] = "moderada"


class RazonesIn(BaseModel):
    razones: list[RazonIn] = []
    razon_otra_detalle: str | None = Field(default=None, max_length=300)

    @field_validator("razon_otra_detalle")
    @classmethod
    def detalle_opcional(cls, v):
        return texto_opcional(v)

    def sin_repetir(self) -> list[dict]:
        """Una misma razón elegida dos veces cuenta una vez (con la última gravedad)."""
        return list({r.razon: r.model_dump() for r in self.razones}.values())

    def errores(self) -> dict | None:
        """CA-19.2: al menos una razón, y «otra» con su detalle."""
        if not self.razones:
            return {"razones": "Elige al menos una razón"}
        if any(r.razon == "otra" for r in self.razones) and not self.razon_otra_detalle:
            return {"razon_otra_detalle": "Cuéntanos cuál fue la otra razón"}
        return None


class TerminoIn(RazonesIn):
    """Terminar una convivencia. Las razones se piden solo si terminó por incompatibilidad."""

    motivo: MotivoFin
    comentario: str | None = Field(default=None, max_length=300)
    seguir_buscando: bool = False  # el buscador quiere nuevas propuestas de inmediato

    @field_validator("comentario")
    @classmethod
    def comentario_opcional(cls, v):
        return texto_opcional(v)
