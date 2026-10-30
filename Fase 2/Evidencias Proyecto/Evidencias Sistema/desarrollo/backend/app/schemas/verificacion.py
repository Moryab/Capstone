from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

# Mismos valores que el enum del modelo de datos (colección solicitudes_verificacion)
TipoComprobante = Literal["certificado_alumno_regular", "comprobante_matricula", "credencial_estudiantil"]


class SolicitudOut(BaseModel):
    """Lo que ve el propio estudiante de su solicitud. No incluye la ruta del archivo en disco."""

    id: str
    codigo: int
    institucion_id: str
    institucion_nombre: str | None = None
    tipo_comprobante: str
    estado: str  # pendiente | en_revision | aprobada | rechazada
    fecha_solicitud: datetime
    fecha_revision: datetime | None = None
    motivo_rechazo: str | None = None
    archivo_nombre: str
    archivo_formato: str

    @classmethod
    def desde_doc(cls, doc: dict, institucion_nombre: str | None = None) -> "SolicitudOut":
        return cls(
            id=str(doc["_id"]),
            codigo=doc["codigo"],
            institucion_id=str(doc["institucion_id"]),
            institucion_nombre=institucion_nombre,
            tipo_comprobante=doc["tipo_comprobante"],
            estado=doc["estado"],
            fecha_solicitud=doc["fecha_solicitud"],
            fecha_revision=doc.get("fecha_revision"),
            motivo_rechazo=doc.get("motivo_rechazo"),
            archivo_nombre=doc["archivo"]["nombre_original"],
            archivo_formato=doc["archivo"]["formato"],
        )


class SolicitudResumenOut(BaseModel):
    """Fila del listado «Solicitudes de verificación» del administrador (CA-22.1)."""

    id: str
    codigo: int
    usuario_id: str
    nombre: str
    correo: str
    institucion_nombre: str | None = None
    tipo_comprobante: str
    estado: str
    fecha_solicitud: datetime
    fecha_revision: datetime | None = None


class SolicitanteOut(BaseModel):
    """Datos del perfil que el administrador compara con el comprobante (CA-22.1)."""

    id: str
    rut: str | None = None
    nombre: str
    ap_paterno: str | None = None
    nombre_completo: str
    correo: str
    telefono: str | None = None
    fecha_nac: date | None = None
    foto_url: str | None = None
    institucion_nombre: str | None = None  # la del perfil, que puede no coincidir con la de la solicitud
    sede: str | None = None
    carrera: str | None = None
    anio_ingreso: int | None = None
    fecha_registro: datetime
    verificacion_estado: str


class SolicitudAdminOut(SolicitudOut):
    """Detalle de una solicitud para el administrador: el comprobante y los datos del perfil."""

    observaciones: str | None = None
    admin_revisor: str | None = None
    solicitante: SolicitanteOut


class RechazoIn(BaseModel):
    """CA-22.3: rechazar exige un motivo, que se le muestra al estudiante."""

    motivo: str = Field(max_length=300)

    @field_validator("motivo")
    @classmethod
    def motivo_obligatorio(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Escribe el motivo del rechazo")
        return v


class RevocacionIn(BaseModel):
    """CA-23.4: dejar sin efecto una verificación también exige un motivo para el estudiante."""

    motivo: str = Field(max_length=300)

    @field_validator("motivo")
    @classmethod
    def motivo_obligatorio(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Escribe el motivo de la revocación")
        return v


class VerificacionOut(BaseModel):
    """CA-21.4: estado de la verificación del estudiante y su última solicitud, si hay."""

    estado: str  # no_verificado | pendiente | verificado | rechazado | revocado
    puede_solicitar: bool
    motivo_revocacion: str | None = None
    solicitud: SolicitudOut | None = None
