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


settings = Settings()
