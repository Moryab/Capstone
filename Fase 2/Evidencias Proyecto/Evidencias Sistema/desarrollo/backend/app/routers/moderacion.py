"""EP-06 y EP-07 · HU-27 y HU-30: acciones del administrador sobre perfiles y publicaciones.

Archivo de esta área: solo lo edita quien tiene estas historias. Las rutas de administración usan
Depends(solo_admin) (app/deps.py) y los avisos al usuario se envían con app.notificaciones.notificar.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/moderacion", tags=["Moderación"])
