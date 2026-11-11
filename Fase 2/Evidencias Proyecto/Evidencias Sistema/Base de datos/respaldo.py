"""Respaldo y restauración de la base de datos de RoomMatch.

Uso (con la base levantada, desde esta carpeta):
    python respaldo.py crear                       -> respaldos/roommatch-AAAA-MM-DD_HHMM.archive.gz
    python respaldo.py restaurar <archivo>         -> reemplaza la base actual por la del respaldo

Respalda solo la base (mongodump). Las fotos y los comprobantes están en los volúmenes media_data
y privado_data, no en Mongo.
"""

import subprocess
import sys
from datetime import datetime
from pathlib import Path

CARPETA = Path(__file__).resolve().parent
COMPOSE = CARPETA.parent / "Aplicación" / "docker-compose.yml"
RESPALDOS = CARPETA / "respaldos"

# Usa el usuario y la clave que ya tiene el contenedor, así no pasan por la línea de comandos
CREDENCIALES = (
    '-u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin'
)


def en_mongo(comando: str, **kwargs) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["docker", "compose", "-f", str(COMPOSE), "exec", "-T", "mongo", "sh", "-c", comando],
        check=True,
        **kwargs,
    )


def crear() -> None:
    RESPALDOS.mkdir(exist_ok=True)
    destino = RESPALDOS / f"roommatch-{datetime.now():%Y-%m-%d_%H%M}.archive.gz"
    with destino.open("wb") as archivo:
        en_mongo(f"mongodump {CREDENCIALES} --db roommatch --archive --gzip --quiet", stdout=archivo)
    print(f"Respaldo creado: {destino}")


def restaurar(origen: Path) -> None:
    if not origen.is_file():
        sys.exit(f"No existe el archivo {origen}")
    respuesta = input("Esto reemplaza los datos actuales de la base por los del respaldo. ¿Seguir? (s/n) ")
    if respuesta.strip().lower() != "s":
        sys.exit("Cancelado")
    with origen.open("rb") as archivo:
        en_mongo(f"mongorestore {CREDENCIALES} --archive --gzip --drop --quiet", stdin=archivo)
    print("Base restaurada. Reiniciar la API: docker compose restart api (en la carpeta Aplicación)")


if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] == "crear":
        crear()
    elif len(sys.argv) == 3 and sys.argv[1] == "restaurar":
        restaurar(Path(sys.argv[2]))
    else:
        sys.exit(__doc__)
