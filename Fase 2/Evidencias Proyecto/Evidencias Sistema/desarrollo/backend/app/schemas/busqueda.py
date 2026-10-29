from pydantic import BaseModel, Field

from app.schemas.publicaciones import MAX_COSTO, TipoAlojamiento

TAMANO_PAGINA = 10  # CA-09.1


class Preferencias(BaseModel):
    """Filtros de costo, ubicación y preferencias (HU-10 a HU-12).

    En las reglas, None es «da lo mismo»; True o False exige que la regla coincida (CA-12.1).
    Gastos incluidos, amoblado y estacionamiento solo filtran cuando son True.
    """

    costo_min: int | None = Field(default=None, ge=0, le=MAX_COSTO)
    costo_max: int | None = Field(default=None, ge=0, le=MAX_COSTO)
    tipo_alojamiento: TipoAlojamiento | None = None
    requiere_mascotas: bool | None = None
    requiere_fumar: bool | None = None
    requiere_visitas: bool | None = None
    gastos_incluidos: bool = False
    amoblado: bool = False
    estacionamiento: bool = False


class PreferenciasIn(Preferencias):
    """Lo que se guarda en usuarios.preferencias_busqueda para «Usar mis preferencias» (CA-12.2)."""

    comunas_ids: list[str] = []


class FiltrosBusqueda(Preferencias):
    """Parámetros de GET /api/publicaciones. Las comunas se repiten: ?comunas=a&comunas=b."""

    pagina: int = Field(default=1, ge=1)
    comunas: list[str] = []
    cerca_institucion: bool = False  # CA-11.3


def error_rango(costo_min: int | None, costo_max: int | None) -> dict | None:
    """CA-10.3: el mínimo no puede superar al máximo."""
    if costo_min is not None and costo_max is not None and costo_min > costo_max:
        return {"costo_max": "El máximo debe ser mayor o igual al mínimo"}
    return None
