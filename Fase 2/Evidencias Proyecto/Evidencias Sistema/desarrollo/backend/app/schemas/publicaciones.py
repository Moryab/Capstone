import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, ValidationInfo, field_validator, model_validator

TipoAlojamiento = Literal["habitacion", "departamento"]
GeneroPreferido = Literal["femenino", "masculino", "indiferente"]

SERVICIOS = ("agua", "luz", "gas", "internet")
MAX_FOTOS = 5  # CA-05.4
MAX_CUPOS = 10
MAX_COSTO = 5_000_000  # tope de sentido común para evitar errores de tipeo


def texto_obligatorio(v: str) -> str:
    v = v.strip()
    if not v:
        raise ValueError("Este campo es obligatorio")
    return v


def texto_opcional(v: str | None) -> str | None:
    return (v or "").strip() or None


class UbicacionIn(BaseModel):
    """CA-06.2: comuna de la lista más el sector; la dirección de referencia es opcional."""

    comuna_id: str
    sector: str = Field(max_length=80)
    direccion_referencia: str | None = Field(default=None, max_length=150)

    @field_validator("comuna_id", "sector")
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
    costo_mensual: int = Field(gt=0, le=MAX_COSTO)  # CA-06.1: pesos chilenos, mayor a 0
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

    @classmethod
    def desde_doc(cls, doc: dict, es_propia: bool, oferente: dict | None = None) -> "PublicacionOut":
        ubicacion = {**doc["ubicacion"], "comuna_id": str(doc["ubicacion"]["comuna_id"])}
        ubicacion.pop("coordenadas", None)
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
            ubicacion=ubicacion,
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
            )
            if oferente
            else None,
            es_propia=es_propia,
        )
