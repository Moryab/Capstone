"""EP-02 · HU-21 y HU-22: solicitud de verificación del estudiante y su revisión.

Archivo de esta área: solo lo edita quien tiene estas historias. Las rutas de administración usan
Depends(solo_admin) (app/deps.py) y los avisos al usuario se envían con app.notificaciones.notificar.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/verificacion", tags=["Verificación"])
