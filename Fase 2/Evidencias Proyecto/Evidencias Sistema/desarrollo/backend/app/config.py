from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongo_uri: str
    mongo_db: str = "roommatch"

    jwt_secret: str
    jwt_minutos: int = 480            # vida máxima del token (8 h)
    inactividad_minutos: int = 30     # CA-02.5: cierre por inactividad
    max_intentos_login: int = 5
    bloqueo_minutos: int = 15

    cors_origins: list[str] = ["http://localhost:5173"]  # Vite en desarrollo

    # Archivos subidos por los usuarios (fotos de perfil). En Docker es un volumen
    media_dir: str = "/app/media"
    max_foto_mb: int = 5

    # Comprobantes de alumno regular (HU-21): fuera de media_dir, que es público. Se entregan
    # solo por la API al propio estudiante y a los administradores (CA-21.5)
    privado_dir: str = "/app/privado"
    max_comprobante_mb: int = 5

    # Cuenta de administrador que se crea al iniciar la API si no existe (EP-02, EP-06, EP-07, HU-20)
    admin_correo: str | None = None
    admin_password: str | None = None


settings = Settings()
