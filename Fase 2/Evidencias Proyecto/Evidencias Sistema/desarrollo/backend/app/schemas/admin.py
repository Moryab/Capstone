from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel

# Mismos valores que los enum del modelo de datos
EstadoVerificacion = Literal["no_verificado", "pendiente", "verificado", "rechazado", "revocado"]
EstadoCuenta = Literal["pendiente", "activa", "suspendida", "inhabilitada"]
EstadoPublicacion = Literal["activa", "pausada", "completa", "suspendida", "eliminada"]


class UsuarioFilaOut(BaseModel):
    """Fila del listado «Usuarios» (CA-28.1)."""

    id: str
    nombre: str
    correo: str
    verificacion_estado: str
    estado_cuenta: str
    fecha_registro: datetime


class PublicacionFilaOut(BaseModel):
    """Fila del listado «Publicaciones» (CA-29.1)."""

    id: str
    titulo: str
    oferente: str | None = None  # None si la cuenta ya no existe
    costo_mensual: int
    comuna: str | None = None
    estado: str
    fecha_publicacion: datetime
    cantidad_reportes: int


class SuspensionOut(BaseModel):
    motivo: str | None = None
    fecha: datetime | None = None


class UsuarioPerfilOut(BaseModel):
    """Datos del perfil. Se nombra cada campo: la contraseña y los tokens nunca salen (CA-28.4)."""

    id: str
    rut: str | None = None
    nombre: str
    ap_paterno: str | None = None
    nombre_completo: str
    correo: str
    telefono: str | None = None
    fecha_nac: date | None = None
    genero: str | None = None
    foto_url: str | None = None
    institucion: str | None = None
    sede: str | None = None
    carrera: str | None = None
    anio_ingreso: int | None = None
    ciudad_origen: str | None = None
    region_origen: str | None = None
    direccion: str | None = None
    descripcion: str | None = None
    verificacion_estado: str
    estado_cuenta: str
    advertencias_recibidas: int
    fecha_registro: datetime
    suspension: SuspensionOut | None = None


class PublicacionUsuarioOut(BaseModel):
    id: str
    titulo: str
    estado: str
    costo_mensual: int
    comuna: str | None = None
    fecha_publicacion: datetime
    cantidad_reportes: int


class ReporteRecibidoOut(BaseModel):
    id: str
    codigo: int
    tipo_elemento: str
    motivo: str
    estado: str
    fecha_reporte: datetime


class SolicitudUsuarioOut(BaseModel):
    id: str
    codigo: int
    tipo_comprobante: str
    estado: str
    fecha_solicitud: datetime


class UsuarioDetalleOut(BaseModel):
    """CA-28.4: su perfil, sus publicaciones, los reportes recibidos y sus solicitudes."""

    perfil: UsuarioPerfilOut
    publicaciones: list[PublicacionUsuarioOut]
    reportes: list[ReporteRecibidoOut]
    solicitudes: list[SolicitudUsuarioOut]
