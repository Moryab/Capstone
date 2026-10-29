"""Crea el archivo .env a partir de .env.example con claves aleatorias.

Se ejecuta una sola vez después de clonar el repositorio, antes de levantar Docker:

    python preparar.py
    docker compose up -d --build

Si el .env ya existe no lo toca: la clave de Mongo queda fijada al crear el volumen
mongo_data, y cambiarla después impediría que la API se conecte.
"""

import secrets
from pathlib import Path

CARPETA = Path(__file__).parent
EJEMPLO = CARPETA / ".env.example"
DESTINO = CARPETA / ".env"


def main() -> None:
    if DESTINO.exists():
        print(".env ya existe, no se modificó.")
        print("Para regenerarlo, bórralo y vuelve a ejecutar este script")
        print("(si cambias la clave de Mongo, borra también los datos con 'docker compose down -v').")
        return

    clave_mongo = secrets.token_urlsafe(24)
    clave_jwt = secrets.token_urlsafe(48)

    lineas = []
    for linea in EJEMPLO.read_text(encoding="utf-8").splitlines():
        if linea.startswith("MONGO_PASSWORD="):
            linea = f"MONGO_PASSWORD={clave_mongo}"
        elif linea.startswith("MONGO_URI="):
            linea = linea.replace("cambiar_esta_clave", clave_mongo)
        elif linea.startswith("JWT_SECRET="):
            linea = f"JWT_SECRET={clave_jwt}"
        lineas.append(linea)

    DESTINO.write_text("\n".join(lineas) + "\n", encoding="utf-8")
    print(".env creado con claves nuevas.")
    print("Ahora levanta el proyecto con: docker compose up -d --build")


if __name__ == "__main__":
    main()
