"""EP-06 · HU-24, HU-25 y HU-26: reportar perfiles y publicaciones, y la revisión del administrador.

Archivo de esta área: solo lo edita quien tiene estas historias. Las rutas de administración usan
Depends(solo_admin) (app/deps.py) y los avisos al usuario se envían con app.notificaciones.notificar.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/reportes", tags=["Reportes"])
