import re
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, ValidationInfo, field_validator


class RegistroIn(BaseModel):
    nombre: str = Field(max_length=60)
    ap_paterno: str | None = Field(default=None, max_length=60)
    correo: EmailStr
    password: str
    confirmacion: str

    @field_validator("nombre", "ap_paterno")
    @classmethod
    def limpiar_texto(cls, v):
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Este campo es obligatorio")
        return v

    @field_validator("correo")
    @classmethod
    def correo_minusculas(cls, v):
        return v.lower()

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
    nombre: str
    ap_paterno: str | None = None
    correo: str
    rol: str
    estado_cuenta: str
    correo_verificado: bool
    verificacion_estado: str
    perfil_completo: bool
    fecha_registro: datetime

    @classmethod
    def desde_doc(cls, doc: dict) -> "UsuarioOut":
        return cls(
            id=str(doc["_id"]),
            nombre=doc["nombre"],
            ap_paterno=doc.get("ap_paterno"),
            correo=doc["correo"],
            rol=doc["rol"],
            estado_cuenta=doc["estado_cuenta"],
            correo_verificado=doc.get("correo_verificado", False),
            verificacion_estado=doc.get("verificacion", {}).get("estado", "no_verificado"),
            perfil_completo=doc.get("perfil", {}).get("perfil_completo", False),
            fecha_registro=doc["fecha_registro"],
        )
