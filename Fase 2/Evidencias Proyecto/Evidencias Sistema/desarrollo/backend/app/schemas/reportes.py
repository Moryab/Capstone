from datetime import datetime
from typing import Literal, get_args

from pydantic import BaseModel, Field, ValidationInfo, field_validator

TipoElemento = Literal["usuario", "publicacion"]
# Mismos valores que el enum del modelo de datos, en el orden en que se muestran en el listado
EstadoReporte = Literal["pendiente", "en_revision", "resuelto", "descartado"]
ESTADOS_REPORTE = get_args(EstadoReporte)

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


class ReporteFilaOut(BaseModel):
    """Fila del listado «Reportes» del administrador (CA-26.1)."""

    id: str
    codigo: int
    tipo_elemento: str
    reportado: str | None = None  # nombre o título; None si ya no existe
    motivo: str
    estado: str
    fecha_reporte: datetime


class PersonaReporteOut(BaseModel):
    id: str
    nombre: str
    correo: str


class ElementoReportadoOut(BaseModel):
    """Resumen del perfil o la publicación reportados, con su id para el acceso directo (CA-26.2)."""

    id: str
    titulo: str
    estado: str  # estado de la cuenta o de la publicación
    # Perfil
    correo: str | None = None
    verificacion_estado: str | None = None
    # Publicación
    comuna: str | None = None
    costo_mensual: int | None = None
    oferente: PersonaReporteOut | None = None


class OtroReporteOut(BaseModel):
    id: str
    codigo: int
    motivo: str
    estado: str
    fecha_reporte: datetime


class AccionReporteOut(BaseModel):
    """CA-27.4: qué administrador la aplicó, cuándo, cuál fue y por qué."""

    accion: str
    justificacion: str
    fecha_accion: datetime
    admin: PersonaReporteOut | None = None


class ReporteDetalleOut(BaseModel):
    """CA-26.2. Quién reportó solo se le entrega al administrador (CA-24.2 y CA-25.2)."""

    id: str
    codigo: int
    tipo_elemento: str
    motivo: str
    descripcion: str | None = None
    estado: str
    fecha_reporte: datetime
    fecha_toma_revision: datetime | None = None
    reportante: PersonaReporteOut | None = None
    admin_revisor: PersonaReporteOut | None = None
    elemento: ElementoReportadoOut | None = None
    otros_reportes: list[OtroReporteOut]
    resolucion: str | None = None
    accion: AccionReporteOut | None = None
