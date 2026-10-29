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


def filtro_preferencias(p: Preferencias) -> dict:
    """Condiciones de Mongo para costo, tipo, reglas y extras (sin la ubicación).

    Lo usan la búsqueda de alojamientos y las propuestas de match (HU-17).
    """
    consulta: dict = {}
    costo = {}
    if p.costo_min is not None:
        costo["$gte"] = p.costo_min  # CA-10.1: los extremos se incluyen
    if p.costo_max is not None:
        costo["$lte"] = p.costo_max
    if costo:
        consulta["costo_mensual"] = costo

    if p.tipo_alojamiento:
        consulta["tipo"] = p.tipo_alojamiento
    for regla, valor in (
        ("permite_mascotas", p.requiere_mascotas),
        ("permite_fumar", p.requiere_fumar),
        ("permite_visitas", p.requiere_visitas),
    ):
        if valor is not None:
            consulta[f"reglas.{regla}"] = valor
    if p.gastos_incluidos:
        consulta["gastos.todos_incluidos"] = True
    if p.amoblado:
        consulta["caracteristicas.amoblado"] = True
    if p.estacionamiento:
        consulta["caracteristicas.estacionamiento"] = True
    return consulta


def error_rango(costo_min: int | None, costo_max: int | None) -> dict | None:
    """CA-10.3: el mínimo no puede superar al máximo."""
    if costo_min is not None and costo_max is not None and costo_min > costo_max:
        return {"costo_max": "El máximo debe ser mayor o igual al mínimo"}
    return None
