from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.db import client, crear_indices
from app.routers import auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    await crear_indices()
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


@app.exception_handler(RequestValidationError)
async def errores_validacion(request: Request, exc: RequestValidationError):
    """Devuelve los errores como {campo: mensaje} para que el formulario los marque (CA-01.3)."""
    errores = {}
    for err in exc.errors():
        campo = err["loc"][-1] if len(err["loc"]) > 1 else "general"
        mensaje = err["msg"].removeprefix("Value error, ")
        if err["type"] == "missing":
            mensaje = "Este campo es obligatorio"
        elif campo == "correo":
            mensaje = "El correo no tiene un formato válido"
        errores[str(campo)] = mensaje
    return JSONResponse(status_code=422, content={"detail": "Datos inválidos", "errores": errores})


app.include_router(auth.router)


@app.get("/api/health", tags=["Sistema"])
async def health():
    await client.admin.command("ping")
    return {"status": "ok", "mongo": "conectado"}
