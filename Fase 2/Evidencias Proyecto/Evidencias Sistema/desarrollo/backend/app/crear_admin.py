"""Convierte una cuenta existente en administrador. El registro solo crea estudiantes.

Uso (con los contenedores levantados):
    docker compose exec api python -m app.crear_admin correo@ejemplo.cl
"""

import asyncio
import sys

from app.db import client, db


async def main(correo: str) -> None:
    resultado = await db.usuarios.update_one({"correo": correo.lower()}, {"$set": {"rol": "administrador"}})
    if not resultado.matched_count:
        print(f"No existe una cuenta con el correo {correo}")
    elif not resultado.modified_count:
        print(f"{correo} ya era administrador")
    else:
        # La API lee el rol desde la base en cada petición; basta con recargar la página
        print(f"{correo} ahora es administrador. Recarga la página para ver las opciones")
    await client.close()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Uso: python -m app.crear_admin correo@ejemplo.cl")
    asyncio.run(main(sys.argv[1]))
