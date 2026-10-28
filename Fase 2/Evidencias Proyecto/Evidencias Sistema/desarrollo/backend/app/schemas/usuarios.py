import re
from datetime import date, datetime, timezone
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, ValidationInfo, field_validator

Genero = Literal["femenino", "masculino", "no_binario"]

EDAD_MINIMA = 16


def normalizar_rut(rut: str) -> str:
    """Valida formato y dígito verificador (módulo 11) y lo deja como 12345678-K (CA-01.3)."""
    limpio = re.sub(r"[.\s-]", "", rut).upper()
    if not re.fullmatch(r"\d{7,8}[\dK]", limpio):
        raise ValueError("El RUT no tiene un formato válido")
    cuerpo, dv = limpio[:-1], limpio[-1]

    suma, factor = 0, 2
    for digito in reversed(cuerpo):
        suma += int(digito) * factor
        factor = 2 if factor == 7 else factor + 1
    resto = 11 - suma % 11
    esperado = {10: "K", 11: "0"}.get(resto, str(resto))

    if dv != esperado:
        raise ValueError("El dígito verificador del RUT no es correcto")
    return f"{cuerpo}-{dv}"


def fecha_a_datetime(fecha: date) -> datetime:
    """Mongo no tiene tipo fecha sin hora; se guarda a medianoche UTC."""
    return datetime.combine(fecha, datetime.min.time(), timezone.utc)


class DatosPersonales(BaseModel):
    """Campos que se piden al registrarse y que después se pueden editar (HU-01 y HU-04)."""

    nombre: str = Field(max_length=60)
    ap_paterno: str = Field(max_length=60)
    ap_materno: str = Field(max_length=60)
    fecha_nac: date
    genero: Genero
    correo: EmailStr

    @field_validator("nombre", "ap_paterno", "ap_materno")
    @classmethod
    def limpiar_texto(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Este campo es obligatorio")
        return v

    @field_validator("fecha_nac")
    @classmethod
    def edad_valida(cls, v):
        hoy = date.today()
        edad = hoy.year - v.year - ((hoy.month, hoy.day) < (v.month, v.day))
        if v > hoy or edad > 100:
            raise ValueError("Ingresa una fecha de nacimiento válida")
        if edad < EDAD_MINIMA:
            raise ValueError(f"Debes tener al menos {EDAD_MINIMA} años para registrarte")
        return v

    @field_validator("correo")
    @classmethod
    def correo_minusculas(cls, v):
        return v.lower()


class RegistroIn(DatosPersonales):
    rut: str
    password: str
    confirmacion: str

    @field_validator("rut")
    @classmethod
    def validar_rut(cls, v):
        return normalizar_rut(v)

    @field_validator("password")
    @classmethod
    def password_segura(cls, v):
        # CA-01.4
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        if not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
            raise ValueError("La contraseña debe combinar letras y números")
        return v

    @field_validator("confirmacion")
    @classmethod
    def passwords_coinciden(cls, v, info: ValidationInfo):
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("La contraseña y su confirmación no coinciden")
        return v


class LoginIn(BaseModel):
    correo: EmailStr
    password: str

    @field_validator("correo")
    @classmethod
    def correo_minusculas(cls, v):
        return v.lower()


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UsuarioOut(BaseModel):
    id: str
    # Opcionales solo por las cuentas creadas antes de que el registro los pidiera
    rut: str | None = None
    nombre: str
    ap_paterno: str | None = None
    ap_materno: str | None = None
    fecha_nac: date | None = None
    genero: str | None = None
    correo: str
    rol: str
    estado_cuenta: str
    correo_verificado: bool
    verificacion_estado: str
    perfil_completo: bool
    campos_faltantes: list[str]
    fecha_registro: datetime

    @classmethod
    def desde_doc(cls, doc: dict) -> "UsuarioOut":
        fecha_nac = doc.get("fecha_nac")
        return cls(
            id=str(doc["_id"]),
            rut=doc.get("rut"),
            nombre=doc["nombre"],
            ap_paterno=doc.get("ap_paterno"),
            ap_materno=doc.get("ap_materno"),
            fecha_nac=fecha_nac.date() if fecha_nac else None,
            genero=doc.get("genero"),
            correo=doc["correo"],
            rol=doc["rol"],
            estado_cuenta=doc["estado_cuenta"],
            correo_verificado=doc.get("correo_verificado", False),
            verificacion_estado=doc.get("verificacion", {}).get("estado", "no_verificado"),
            perfil_completo=doc.get("perfil", {}).get("perfil_completo", False),
            campos_faltantes=doc.get("perfil", {}).get("campos_faltantes", []),
            fecha_registro=doc["fecha_registro"],
        )
