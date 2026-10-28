from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.datos_iniciales import cargar_datos_iniciales
from app.db import client, crear_indices
from app.media import CARPETA_FOTOS, URL_MEDIA
from app.routers import auth, catalogos, perfil, publicaciones, usuarios


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
    "costo_mensual": "Ingresa el monto en pesos, solo números",
    "monto_estimado": "Ingresa el monto en pesos, solo números",
}

# Límites incumplidos: van antes que MENSAJES_FORMATO porque el valor sí tenía el tipo correcto.
# {ctx} trae el límite de cada regla
MENSAJES_LIMITE = {
    "string_too_short": "Mínimo {min_length} caracteres",
    "string_too_long": "Máximo {max_length} caracteres",
    "greater_than": "Debe ser mayor a {gt}",
    "greater_than_equal": "Debe ser como mínimo {ge}",
    "less_than_equal": "Debe ser como máximo {le}",
}

# Valores del tipo equivocado, para los campos que no están en MENSAJES_FORMATO
MENSAJES_TIPO = {
    "int_parsing": "Ingresa un número entero",
    "int_from_float": "Ingresa un número entero",
    "bool_parsing": "Selecciona una opción",
    "bool_type": "Selecciona una opción",
    "literal_error": "Selecciona una opción válida",
}


@app.exception_handler(RequestValidationError)
async def errores_validacion(request: Request, exc: RequestValidationError):
    """Devuelve los errores como {campo: mensaje} para que el formulario los marque (CA-01.3).

    Los campos anidados usan la ruta con puntos, por ejemplo «gastos.agua.monto_estimado».
    """
    errores = {}
    for err in exc.errors():
        ruta = [str(parte) for parte in err["loc"][1:]]  # loc[0] es «body», «path» o «query»
        campo = ".".join(ruta) or "general"
        mensaje = err["msg"].removeprefix("Value error, ")
        if err["type"] == "missing" or err.get("input") in ("", None):
            mensaje = "Este campo es obligatorio"
        elif err["type"] in MENSAJES_LIMITE:
            mensaje = MENSAJES_LIMITE[err["type"]].format(**err["ctx"])
        elif err["type"] != "value_error" and ruta and ruta[-1] in MENSAJES_FORMATO:
            mensaje = MENSAJES_FORMATO[ruta[-1]]
        elif err["type"] in MENSAJES_TIPO:
            mensaje = MENSAJES_TIPO[err["type"]]
        errores[campo] = mensaje
    return JSONResponse(status_code=422, content={"detail": "Datos inválidos", "errores": errores})


app.include_router(auth.router)
app.include_router(perfil.router)
app.include_router(catalogos.router)
app.include_router(usuarios.router)
app.include_router(publicaciones.router)

# Fotos subidas por los usuarios (perfil y alojamientos)
CARPETA_FOTOS.mkdir(parents=True, exist_ok=True)
app.mount(URL_MEDIA, StaticFiles(directory=settings.media_dir), name="media")


@app.get("/api/health", tags=["Sistema"])
async def health():
    await client.admin.command("ping")
    return {"status": "ok", "mongo": "conectado"}
