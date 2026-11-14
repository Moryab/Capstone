# Pruebas automatizadas de RoomMatch

Pruebas del backend con pytest, según el documento «08 Plan de Pruebas y Evidencias».

| Archivo | Casos |
| --- | --- |
| `test_unitarias.py` | PU-01 a PU-14: algoritmo de compatibilidad y validaciones, sin base de datos |
| `test_integracion.py` | PI-01 a PI-10: flujos completos por la API (registro, sesión, cuestionario, verificación, búsqueda) |
| `test_seguridad.py` | PS-01 a PS-10: contraseñas, fuerza bruta, tokens, permisos y archivos |
| `test_rendimiento.py` | PR-01 a PR-04: tiempos de respuesta con 1.000 estudiantes cargados |

Las pruebas usan una base aparte, **`roommatch_test`**, que se crea con los mismos scripts de la carpeta
«Base de datos» y se borra al terminar. Si `MONGO_DB` no termina en `_test`, las pruebas no corren, así
que nunca tocan los datos reales. Tampoco envían correos ni guardan archivos en los volúmenes de la API.

## Cómo ejecutarlas

Requisito: la plataforma levantada con `docker compose up -d` (se usa su MongoDB y la imagen de la API).
Desde **Git Bash**, en la carpeta `Evidencias de sistema`:

```bash
# 1. Crear la base de prueba (colecciones, índices y catálogos)
MSYS_NO_PATHCONV=1 docker run --rm --network desarrollo_default --env-file Aplicación/.env \
  -e MONGO_DB=roommatch_test -v "$(pwd -W)/Base de datos/scripts:/scripts:ro" mongo:7 \
  sh -c 'mongosh "$MONGO_URI" --quiet --file /scripts/colecciones.js --file /scripts/indices.js --file /scripts/datos_iniciales.js --file /scripts/carreras.js'

# 2. Ejecutar las pruebas con la cobertura del backend
cd Aplicación
MSYS_NO_PATHCONV=1 docker run --rm --network desarrollo_default --env-file .env \
  -e MONGO_DB=roommatch_test -e SMTP_HOST= \
  -e ADMIN_CORREO=admin.pruebas@roommatch.cl -e ADMIN_PASSWORD=AdminPruebas2026 \
  -e MEDIA_DIR=/tmp/media -e PRIVADO_DIR=/tmp/privado -e TZ=America/Santiago \
  -e PYTHONDONTWRITEBYTECODE=1 -e COVERAGE_FILE=/tmp/.coverage \
  -v "$(pwd -W)/backend:/app:ro" -w /app desarrollo-api \
  sh -c 'pip install -q -r requirements.txt -r tests/requirements.txt && python -m pytest tests -p no:cacheprovider -v --cov=app --cov-report=term'
```

Para ejecutar un solo tipo, se cambia `tests` por el archivo, por ejemplo `tests/test_seguridad.py`.
Al final se muestran las «Mediciones de rendimiento» y la cobertura por módulo.

El registro de cada ejecución oficial se guarda en
`Evidencias de documentación/Evidencias de pruebas/Resultado pruebas automatizadas AAAA-MM-DD.txt`.
