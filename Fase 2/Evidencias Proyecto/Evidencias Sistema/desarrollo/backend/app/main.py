from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.datos_iniciales import cargar_datos_iniciales
from app.db import client, crear_indices
from app.routers import auth, catalogos, perfil


@asynccontextmanager
async def lifespan(app: FastAPI):
    await crear_indices()
    await cargar_datos_iniciales()
    yield
    await client.close()


app = FastAPI(title="RoomMatch API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Reemplazan los mensajes en inglés de Pydantic cuando el valor no tiene el tipo esperado
MENSAJES_FORMATO = {
    "correo": "El correo no tiene un formato válido",
    "fecha_nac": "Ingresa una fecha de nacimiento válida",
    "genero": "Selecciona una opción válida",
    "anio_ingreso": "Ingresa un año válido",
}


@app.exception_handler(RequestValidationError)
async def errores_validacion(request: Request, exc: RequestValidationError):
    """Devuelve los errores como {campo: mensaje} para que el formulario los marque (CA-01.3)."""
    errores = {}
    for err in exc.errors():
        campo = err["loc"][-1] if len(err["loc"]) > 1 else "general"
        mensaje = err["msg"].removeprefix("Value error, ")
        if err["type"] == "missing" or err.get("input") in ("", None):
            mensaje = "Este campo es obligatorio"
        elif err["type"] == "string_too_long":
            mensaje = f"Máximo {err['ctx']['max_length']} caracteres"
        elif err["type"] != "value_error" and campo in MENSAJES_FORMATO:
            mensaje = MENSAJES_FORMATO[campo]
        errores[str(campo)] = mensaje
    return JSONResponse(status_code=422, content={"detail": "Datos inválidos", "errores": errores})


app.include_router(auth.router)
app.include_router(perfil.router)
app.include_router(catalogos.router)


@app.get("/api/health", tags=["Sistema"])
async def health():
    await client.admin.command("ping")
    return {"status": "ok", "mongo": "conectado"}
