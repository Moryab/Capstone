import re
from datetime import date

from pydantic import BaseModel, Field, field_validator

from app.schemas.usuarios import DatosPersonales

REGIONES = [
    "Arica y Parinacota",
    "Tarapacá",
    "Antofagasta",
    "Atacama",
    "Coquimbo",
    "Valparaíso",
    "Metropolitana de Santiago",
    "Libertador General Bernardo O'Higgins",
    "Maule",
    "Ñuble",
    "Biobío",
    "La Araucanía",
    "Los Ríos",
    "Los Lagos",
    "Aysén del General Carlos Ibáñez del Campo",
    "Magallanes y de la Antártica Chilena",
]

# Obligatorios del subdocumento perfil según el modelo de datos (CA-03.5)
CAMPOS_OBLIGATORIOS = [
    "institucion_id",
    "sede",
    "carrera",
    "direccion",
    "ciudad_origen",
    "region_origen",
    "telefono",
]

ANIO_MINIMO_INGRESO = 1980


def calcular_faltantes(perfil: dict) -> list[str]:
    return [campo for campo in CAMPOS_OBLIGATORIOS if not perfil.get(campo)]


def normalizar_telefono(telefono: str) -> str:
    """Acepta 9 1234 5678, 912345678 o +56 9 1234 5678 y lo deja como +56912345678."""
    digitos = re.sub(r"[\s()-]", "", telefono).removeprefix("+").removeprefix("56")
    if not re.fullmatch(r"\d{9}", digitos):
        raise ValueError("Ingresa un teléfono de 9 dígitos, por ejemplo 9 1234 5678")
    return f"+56{digitos}"


class PerfilIn(DatosPersonales):
    """HU-03 y HU-04: datos personales más los datos de estudiante."""

    institucion_id: str
    sede: str = Field(max_length=100)
    carrera: str = Field(max_length=100)
    anio_ingreso: int | None = None
    direccion: str = Field(max_length=150)
    ciudad_origen: str = Field(max_length=80)
    region_origen: str
    telefono: str
    descripcion: str | None = Field(default=None, max_length=300)  # CA-03.1

    @field_validator("institucion_id", "sede", "carrera", "direccion", "ciudad_origen")
    @classmethod
    def texto_obligatorio(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Este campo es obligatorio")
        return v

    @field_validator("region_origen")
    @classmethod
    def region_valida(cls, v):
        if v not in REGIONES:
            raise ValueError("Selecciona una región válida")
        return v

    @field_validator("telefono")
    @classmethod
    def validar_telefono(cls, v):
        return normalizar_telefono(v)

    @field_validator("anio_ingreso")
    @classmethod
    def anio_valido(cls, v):
        if v is not None and not ANIO_MINIMO_INGRESO <= v <= date.today().year:
            raise ValueError(f"Ingresa un año entre {ANIO_MINIMO_INGRESO} y {date.today().year}")
        return v

    @field_validator("descripcion")
    @classmethod
    def descripcion_opcional(cls, v):
        return (v or "").strip() or None


class PerfilOut(BaseModel):
    # Los datos personales pueden faltar en cuentas creadas antes de que el registro los pidiera
    rut: str | None = None
    nombre: str
    ap_paterno: str | None = None
    ap_materno: str | None = None
    fecha_nac: date | None = None
    genero: str | None = None
    correo: str
    institucion_id: str | None = None
    sede: str | None = None
    carrera: str | None = None
    anio_ingreso: int | None = None
    direccion: str | None = None
    ciudad_origen: str | None = None
    region_origen: str | None = None
    telefono: str | None = None
    descripcion: str | None = None
    perfil_completo: bool
    campos_faltantes: list[str]

    @classmethod
    def desde_doc(cls, doc: dict) -> "PerfilOut":
        perfil = doc.get("perfil", {})
        institucion_id = perfil.get("institucion_id")
        fecha_nac = doc.get("fecha_nac")
        return cls(
            rut=doc.get("rut"),
            nombre=doc["nombre"],
            ap_paterno=doc.get("ap_paterno"),
            ap_materno=doc.get("ap_materno"),
            fecha_nac=fecha_nac.date() if fecha_nac else None,
            genero=doc.get("genero"),
            correo=doc["correo"],
            institucion_id=str(institucion_id) if institucion_id else None,
            sede=perfil.get("sede"),
            carrera=perfil.get("carrera"),
            anio_ingreso=perfil.get("anio_ingreso"),
            direccion=perfil.get("direccion"),
            ciudad_origen=perfil.get("ciudad_origen"),
            region_origen=perfil.get("region_origen"),
            telefono=perfil.get("telefono"),
            descripcion=perfil.get("descripcion"),
            perfil_completo=perfil.get("perfil_completo", False),
            campos_faltantes=perfil.get("campos_faltantes", calcular_faltantes(perfil)),
        )
