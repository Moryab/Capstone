from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.publicaciones import PublicacionOut

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


# CA-30.3. «precio_distinto» y «publicacion_duplicada» aún no están en el enum del modelo de datos
MOTIVOS_INCUMPLIMIENTO = {
    "informacion_falsa": "Información falsa",
    "contenido_inapropiado": "Contenido inapropiado",
    "precio_distinto": "Precio distinto al real",
    "publicacion_duplicada": "Publicación duplicada",
    "otro": "Otro",
}
MotivoIncumplimiento = Literal[
    "informacion_falsa", "contenido_inapropiado", "precio_distinto", "publicacion_duplicada", "otro"
]


class AccionPublicacionIn(JustificacionIn):
    """HU-30: el motivo del incumplimiento y el comentario (la justificación) son obligatorios."""

    accion: Literal["ocultar", "eliminar"]
    motivo: MotivoIncumplimiento


class ReporteHistorialOut(BaseModel):
    id: str
    codigo: int
    motivo: str
    estado: str
    fecha_reporte: datetime


class AccionHistorialOut(BaseModel):
    accion: str
    motivo: str | None = None
    justificacion: str
    estado_anterior: str | None = None
    estado_nuevo: str | None = None
    admin: str | None = None
    fecha_accion: datetime


class PublicacionAdminOut(BaseModel):
    """La publicación como la ve un estudiante, más su historial de moderación."""

    publicacion: PublicacionOut
    cantidad_reportes: int
    eliminada_por: str | None = None
    oculta_por_cuenta: bool  # la ocultó la suspensión de la cuenta del oferente, no una decisión aquí
    reportes: list[ReporteHistorialOut]
    acciones: list[AccionHistorialOut]
