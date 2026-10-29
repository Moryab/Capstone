"""EP-07 · HU-28 y HU-29: listados de usuarios y publicaciones para el administrador.

Archivo de esta área: solo lo edita quien tiene estas historias. Las rutas de administración usan
Depends(solo_admin) (app/deps.py) y los avisos al usuario se envían con app.notificaciones.notificar.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/admin", tags=["Administración"])
