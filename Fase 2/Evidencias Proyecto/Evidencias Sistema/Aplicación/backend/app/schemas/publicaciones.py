import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, ValidationInfo, field_validator, model_validator

from app.schemas.perfil import calcular_edad

TipoAlojamiento = Literal["habitacion", "departamento"]
GeneroPreferido = Literal["femenino", "masculino", "indiferente"]

SERVICIOS = ("agua", "luz", "gas", "internet")
MAX_FOTOS = 5  # CA-05.4
MAX_CUPOS = 10
MAX_COSTO = 5_000_000  # tope de sentido común para evitar errores de tipeo
MIN_COSTO = 30_000  # un arriendo de $1 o $10 es un error de tipeo o una publicación falsa


def texto_obligatorio(v: str) -> str:
    v = v.strip()
    if not v:
        raise ValueError("Este campo es obligatorio")
    return v


def texto_opcional(v: str | None) -> str | None:
    return (v or "").strip() or None


class PuntoIn(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class UbicacionIn(BaseModel):
    """CA-06.2: comuna de la lista, el barrio (sector), la calle y el número; la referencia es opcional.

    La calle y el número se muestran en la publicación y sirven para ubicar el punto en el mapa. El punto
    exacto, en cambio, solo lo ven su dueño y el administrador (ubicacion.py).
    """

    comuna_id: str
    sector: str = Field(max_length=80)
    calle: str = Field(max_length=100)
    numero: str = Field(max_length=10)
    direccion_referencia: str | None = Field(default=None, max_length=150)
    punto: PuntoIn | None = None

    @field_validator("comuna_id", "sector", "calle", "numero")
    @classmethod
    def obligatorios(cls, v):
        return texto_obligatorio(v)

    @field_validator("direccion_referencia")
    @classmethod
    def opcionales(cls, v):
        return texto_opcional(v)


class Gasto(BaseModel):
    """CA-06.3: incluido en el arriendo o, si no, su monto mensual estimado."""

    incluido: bool
    monto_estimado: int | None = Field(default=None, ge=0, le=MAX_COSTO)

    @model_validator(mode="after")
    def monto_si_no_incluido(self):
        if self.incluido:
            self.monto_estimado = None
        elif self.monto_estimado is None:
            raise ValueError("Indica el monto mensual estimado")
        return self


class Gastos(BaseModel):
    agua: Gasto
    luz: Gasto
    gas: Gasto
    internet: Gasto


class HorarioSilencio(BaseModel):
    aplica: bool
    desde: str | None = None
    hasta: str | None = None

    @model_validator(mode="after")
    def horas_si_aplica(self):
        if not self.aplica:
            self.desde = self.hasta = None
            return self
        for hora in (self.desde, self.hasta):
            if not hora or not re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", hora):
                raise ValueError("Indica desde y hasta qué hora, por ejemplo 23:00 y 08:00")
        return self


class Reglas(BaseModel):
    """CA-06.4: opciones predefinidas más un texto libre de hasta 300 caracteres."""

    permite_fumar: bool
    permite_mascotas: bool
    permite_visitas: bool
    horario_silencio: HorarioSilencio
    reglas_adicionales: str | None = Field(default=None, max_length=300)

    @field_validator("reglas_adicionales")
    @classmethod
    def opcionales(cls, v):
        return texto_opcional(v)


class Caracteristicas(BaseModel):
    amoblado: bool = False
    banio_privado: bool = False
    estacionamiento: bool = False


class PublicacionIn(BaseModel):
    """HU-05 y HU-06. Mismas validaciones al publicar y al editar (CA-07.3)."""

    tipo: TipoAlojamiento
    titulo: str = Field(min_length=5, max_length=100)
    descripcion: str = Field(max_length=1000)
    cupos_totales: int = Field(ge=1, le=MAX_CUPOS)
    cupos_disponibles: int = Field(ge=0, le=MAX_CUPOS)
    costo_mensual: int = Field(le=MAX_COSTO)  # CA-06.1: pesos chilenos, desde MIN_COSTO
    genero_preferido: GeneroPreferido = "indiferente"
    ubicacion: UbicacionIn
    gastos: Gastos
    reglas: Reglas
    caracteristicas: Caracteristicas = Caracteristicas()

    # "before": se recortan los espacios antes de revisar el largo mínimo del título
    @field_validator("titulo", "descripcion", mode="before")
    @classmethod
    def obligatorios(cls, v):
        return texto_obligatorio(v) if isinstance(v, str) else v

    @field_validator("costo_mensual")
    @classmethod
    def costo_realista(cls, v):
        if v < MIN_COSTO:
            raise ValueError(f"El arriendo debe ser de al menos ${MIN_COSTO:,}".replace(",", "."))
        return v

    @field_validator("cupos_disponibles")
    @classmethod
    def cupos_coherentes(cls, v, info: ValidationInfo):
        totales = info.data.get("cupos_totales")
        if totales is not None and v > totales:
            raise ValueError("No puede haber más cupos disponibles que cupos totales")
        return v


class FotoOut(BaseModel):
    url: str
    es_principal: bool


class OferenteOut(BaseModel):
    id: str
    nombre: str
    ap_paterno: str | None = None
    foto_url: str | None = None
    verificado: bool
    # Lo principal de quien publica, como en su perfil público (CA-16.3: la edad, nunca la fecha)
    edad: int | None = None
    genero: str | None = None
    carrera: str | None = None


def ubicacion_out(ubicacion: dict) -> dict:
    """`zona` es donde se muestra el alojamiento: el punto marcado o, sin él, el centro de la comuna.
    `punto` es el marcado (None si no hay). Como la calle y el número son públicos, lo ven todos."""
    datos = {k: v for k, v in ubicacion.items() if k not in ("coordenadas", "punto_exacto")}
    lng, lat = ubicacion["coordenadas"]["coordinates"]
    exacto = ubicacion.get("punto_exacto")
    return {
        **datos,
        "comuna_id": str(ubicacion["comuna_id"]),
        "zona": {"lat": lat, "lng": lng, "radio_m": None},
        "punto": {"lat": exacto["coordinates"][1], "lng": exacto["coordinates"][0]} if exacto else None,
    }


class PublicacionOut(BaseModel):
    id: str
    codigo: int
    tipo: str
    titulo: str
    descripcion: str
    cupos_totales: int
    cupos_disponibles: int
    costo_mensual: int
    genero_preferido: str
    estado: str
    ubicacion: dict
    gastos: dict
    reglas: dict
    caracteristicas: dict
    fotos: list[FotoOut]
    fecha_publicacion: datetime
    fecha_ultima_modificacion: datetime | None = None  # CA-07.5
    oferente: OferenteOut | None = None
    es_propia: bool
    # Distancia en línea recta desde el alojamiento hasta la sede del perfil de quien mira
    distancia_km: float | None = None
    # Solo en el detalle: la sede del perfil de quien mira, para mostrarla en el mapa junto al alojamiento
    sede: dict | None = None

    @classmethod
    def desde_doc(
        cls, doc: dict, es_propia: bool, oferente: dict | None = None
    ) -> "PublicacionOut":
        return cls(
            id=str(doc["_id"]),
            codigo=doc["codigo"],
            tipo=doc["tipo"],
            titulo=doc["titulo"],
            descripcion=doc.get("descripcion") or "",
            cupos_totales=doc["cupos_totales"],
            cupos_disponibles=doc["cupos_disponibles"],
            costo_mensual=doc["costo_mensual"],
            genero_preferido=doc.get("genero_preferido") or "indiferente",
            estado=doc["estado"],
            ubicacion=ubicacion_out(doc["ubicacion"]),
            gastos=doc["gastos"],
            reglas=doc["reglas"],
            caracteristicas=doc.get("caracteristicas", {}),
            fotos=[FotoOut(url=f["url"], es_principal=f["es_principal"]) for f in doc.get("fotos", [])],
            fecha_publicacion=doc["fecha_publicacion"],
            fecha_ultima_modificacion=doc.get("fecha_ultima_modificacion"),
            oferente=OferenteOut(
                id=str(oferente["_id"]),
                nombre=oferente["nombre"],
                ap_paterno=oferente.get("ap_paterno"),
                foto_url=oferente.get("perfil", {}).get("foto_url"),
                verificado=oferente.get("verificacion", {}).get("estado") == "verificado",
                edad=calcular_edad(oferente.get("fecha_nac")),
                genero=oferente.get("genero"),
                carrera=oferente.get("perfil", {}).get("carrera"),
            )
            if oferente
            else None,
            es_propia=es_propia,
        )
