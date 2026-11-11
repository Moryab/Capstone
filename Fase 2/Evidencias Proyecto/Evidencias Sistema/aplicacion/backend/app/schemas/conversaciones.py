from pydantic import BaseModel, Field, field_validator

MAX_MENSAJE = 1000


class ConversacionIn(BaseModel):
    """Abrir (o retomar) la conversación con otro estudiante."""

    usuario_id: str


class MensajeIn(BaseModel):
    """Un mensaje de texto. `publicacion_id` adjunta la tarjeta del alojamiento del que se habla."""

    texto: str = Field(max_length=MAX_MENSAJE)
    publicacion_id: str | None = None

    @field_validator("texto")
    @classmethod
    def no_vacio(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Escribe un mensaje")
        return v
