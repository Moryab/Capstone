"""Crea el archivo .env a partir de .env.example con claves aleatorias.

Se ejecuta después de clonar el repositorio, antes de levantar Docker:

    python preparar.py
    docker compose up -d --build

Si el .env ya existe no cambia lo que tiene: la clave de Mongo queda fijada al crear el volumen
mongo_data, y cambiarla después impediría que la API se conecte. Solo le agrega las variables
nuevas de .env.example que le falten (por ejemplo, la cuenta de administrador).
"""

import secrets
from pathlib import Path

CARPETA = Path(__file__).parent
EJEMPLO = CARPETA / ".env.example"
DESTINO = CARPETA / ".env"


def con_claves(linea: str, clave_mongo: str) -> str:
    """Reemplaza los valores de ejemplo por claves aleatorias."""
    if linea.startswith("MONGO_PASSWORD="):
        return f"MONGO_PASSWORD={clave_mongo}"
    if linea.startswith("MONGO_URI="):
        return linea.replace("cambiar_esta_clave", clave_mongo)
    if linea.startswith("JWT_SECRET="):
        return f"JWT_SECRET={secrets.token_urlsafe(48)}"
    if linea.startswith("ADMIN_PASSWORD="):
        return f"ADMIN_PASSWORD={secrets.token_urlsafe(12)}"
    return linea


def variable(linea: str) -> str | None:
    """El nombre de la variable de una línea, o None si es un comentario o está vacía."""
    return linea.split("=", 1)[0] if "=" in linea and not linea.startswith("#") else None


def mostrar_admin(lineas: list[str]) -> None:
    valores = dict(linea.split("=", 1) for linea in lineas if variable(linea))
    if valores.get("ADMIN_CORREO"):
        print(f"Cuenta de administrador: {valores['ADMIN_CORREO']} / {valores.get('ADMIN_PASSWORD')}")


def main() -> None:
    ejemplo = EJEMPLO.read_text(encoding="utf-8").splitlines()

    if DESTINO.exists():
        texto = DESTINO.read_text(encoding="utf-8")
        tiene = {variable(linea) for linea in texto.splitlines()}
        # Las variables de Mongo nunca faltan en un .env existente, así que no se tocan sus claves
        nuevas = [con_claves(linea, "") for linea in ejemplo if variable(linea) and variable(linea) not in tiene]
        if not nuevas:
            print(".env ya existe y está completo, no se modificó.")
            print("Para regenerarlo, bórralo y vuelve a ejecutar este script")
            print("(si cambias la clave de Mongo, borra también los datos con 'docker compose down -v').")
            return
        separador = "" if texto.endswith("\n") else "\n"
        DESTINO.write_text(texto + separador + "\n".join(nuevas) + "\n", encoding="utf-8")
        print("Se agregaron al .env: " + ", ".join(variable(linea) for linea in nuevas))
        mostrar_admin(nuevas)
        print("Aplica los cambios con: docker compose up -d")
        return

    clave_mongo = secrets.token_urlsafe(24)
    lineas = [con_claves(linea, clave_mongo) for linea in ejemplo]
    DESTINO.write_text("\n".join(lineas) + "\n", encoding="utf-8")
    print(".env creado con claves nuevas.")
    mostrar_admin(lineas)
    print("Ahora levanta el proyecto con: docker compose up -d --build")


if __name__ == "__main__":
    main()
