"""EP-08 · HU-18 y HU-19: evaluación de la convivencia al mes y razones cuando no funcionó.

Archivo de esta área: solo lo edita quien tiene estas historias. Las rutas de administración usan
Depends(solo_admin) (app/deps.py) y los avisos al usuario se envían con app.notificaciones.notificar.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/evaluaciones", tags=["Seguimiento post-match"])
