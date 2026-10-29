"""EP-08 · HU-20: estadísticas de éxito o fracaso de los match para el administrador.

Archivo de esta área: solo lo edita quien tiene estas historias. Las rutas de administración usan
Depends(solo_admin) (app/deps.py) y los avisos al usuario se envían con app.notificaciones.notificar.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/admin/estadisticas", tags=["Administración: estadísticas"])
