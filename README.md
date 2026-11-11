# RoomMatch

### Plataforma para encontrar roomie y alojamiento para estudiantes

El proyecto consiste en desarrollar una plataforma que permita a los estudiantes buscar alojamiento y posibles compañeros de vivienda según sus necesidades, preferencias y características de convivencia.

La plataforma permitirá registrar usuarios, crear perfiles, publicar alojamientos, realizar búsquedas mediante filtros y obtener coincidencias entre estudiantes.

## Características principales
* **Registro de usuarios** y creación de perfiles detallados.
* **Publicación de alojamientos** con especificaciones.
* **Búsquedas inteligentes** mediante filtros avanzados.
* **Sistema de coincidencias** (match) entre estudiantes.

## Integrantes 
### Capstone_003D - Grupo 6 
* Bayrom Caamaño.
* Catalina González.
* Noemí Goler.

## Cómo ejecutar el proyecto

El código está en `Fase 2/Evidencias Proyecto/Evidencias Sistema/`:
- `Aplicación/backend/`: API en FastAPI, corre en Docker.
- `Aplicación/frontend/`: interfaz en React + Vite, corre con Node.
- `Base de datos/`: todo lo de MongoDB. Se levanta junto con la API (el `docker-compose.yml` de `Aplicación` lo incluye), así que no hay que hacer nada aparte.
  - `docker-compose.yml`: el servicio `mongo` y el servicio `inicializar-bd`, que en cada arranque crea las colecciones, los índices y los catálogos antes de que parta la API.
  - `scripts/colecciones.js`: el modelo de datos, es decir, cada colección con su validador `$jsonSchema`. Se aplica a la base sin borrar nada. Está en modo `warn`: si la API guarda algo que no cumple el modelo, se guarda igual y queda anotado en `docker compose logs mongo` («Document would fail validation»). **Si se agrega o cambia un campo, hay que actualizar su esquema aquí.**
  - `scripts/indices.js`: índices de todas las colecciones. **Los índices nuevos se agregan aquí**, en el bloque de cada épica (ya no en el backend).
  - `scripts/datos_iniciales.js`: comunas e instituciones del Gran Concepción. Solo inserta las que faltan, no pisa cambios.
  - `respaldo.py`: respaldo y restauración de la base (ver «Respaldar la base de datos»).

### Requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js](https://nodejs.org/) 20 o superior
- [Python](https://www.python.org/) 3, para crear y completar el `.env` (`preparar.py`)

### Solo la primera vez
1. Crear el archivo `.env` con el script `preparar.py`, en la carpeta `Aplicación`. Copia `.env.example` y genera claves aleatorias para la base de datos, las sesiones y la cuenta de administrador, así que no hay que reemplazar nada a mano. Al terminar muestra el correo y la clave del administrador. El `.env` no se sube a git porque contiene contraseñas.
   ```Terminal
   cd "C:\Capstone\Fase 2\Evidencias Proyecto\Evidencias Sistema\Aplicación"
   python preparar.py
   ```
   Si el `.env` ya existe, el script no cambia sus claves (la de la base queda fijada al levantarla por primera vez); solo le agrega las variables nuevas que falten. Por eso conviene volver a ejecutarlo después de un `git pull` que cambie `.env.example`. Para empezar de cero, borrar el `.env`, ejecutar `docker compose down -v` (borra los datos locales) y volver a correr el script.

   La cuenta de administrador se crea al levantar la API. Su correo y su clave quedan en el `.env` (`ADMIN_CORREO` y `ADMIN_PASSWORD`); al iniciar sesión con ella se entra al panel de administración.
2. Instalar las dependencias del frontend:
   ```Terminal
   cd "C:\Capstone\Fase 2\Evidencias Proyecto\Evidencias Sistema\Aplicación\frontend"
   npm install
   ```

### Cada vez que se trabaja
1. Abrir **Docker Desktop** y esperar a que diga que está corriendo.
2. Levantar la base de datos y la API (terminal 1):
   ```Terminal
   cd "C:\Capstone\Fase 2\Evidencias Proyecto\Evidencias Sistema\Aplicación"
   docker compose up -d --build
   ```
3. Levantar el frontend (terminal 2):
   ```Terminal
   cd "C:\Capstone\Fase 2\Evidencias Proyecto\Evidencias Sistema\Aplicación\frontend"
   npm run dev
   ```
4. Abrir http://localhost:5173 en el navegador.

### Direcciones útiles
| Qué | Dirección |
|---|---|
| Aplicación | http://localhost:5173 |
| Documentación de la API (probar endpoints) | http://localhost:8000/docs |
| Estado de la API y la base de datos | http://localhost:8000/api/health |

### Para detener
- Frontend: `Ctrl + C` en su terminal.
- API y base de datos: `docker compose down` en la carpeta `Aplicación`. Los datos se conservan para la próxima vez.

### Si algo falla
- **`failed to connect to the docker API`**: Docker Desktop no está abierto.
- **La API no responde**: revisar el error con `docker compose logs api` (en la carpeta `Aplicación`).
- **Se cambió código del backend o `requirements.txt`**: volver a ejecutar `docker compose up -d --build`; sin `--build` sigue corriendo la versión anterior.
- **Error de módulos en el frontend** (por ejemplo después de un `git pull`): ejecutar `npm install` en la carpeta `frontend`.
- **La API no arranca y `inicializar-bd` falló**: revisar el error con `docker compose logs inicializar-bd`. Suele ser un índice que se cambió en `scripts/indices.js` y ya existía con otra definición: hay que borrarlo antes de crearlo de nuevo (como se hace con `rut_1`).

## Publicar en Azure

La plataforma se publica en una máquina virtual de Azure con HTTPS. La guía paso a paso (crear la VM, prepararla, levantar, prender y apagar, actualizar) está en [`Aplicación/DESPLIEGUE_AZURE.md`](Fase%202/Evidencias%20Proyecto/Evidencias%20Sistema/Aplicación/DESPLIEGUE_AZURE.md).

## Respaldar la base de datos

Con la base levantada, en la carpeta `Base de datos`:
```Terminal
cd "C:\Capstone\Fase 2\Evidencias Proyecto\Evidencias Sistema\Base de datos"
python respaldo.py crear
```
Deja el respaldo en `Base de datos/respaldos/` (no se sube a git porque tiene datos de los usuarios). Para volver a ese estado, reemplazando los datos actuales:
```Terminal
python respaldo.py restaurar "respaldos/roommatch-AAAA-MM-DD_HHMM.archive.gz"
```
Solo respalda la base: las fotos y los comprobantes están en los volúmenes de Docker de la API.

## Probar la evaluación de la convivencia (30 días)

La evaluación de la convivencia se habilita 30 días después de que ambos estudiantes confirman el match (HU-18 y HU-19). Para probarla sin esperar un mes, se adelanta esa fecha directamente en la base de datos.

### Antes de empezar
- La API y la base de datos deben estar levantadas (ver «Cada vez que se trabaja»).
- Se necesita una convivencia confirmada: un estudiante buscador y un oferente que hayan aceptado la misma propuesta de match.

### 1. Abrir la consola de la base de datos
En la carpeta `Aplicación`:
```Terminal
docker compose exec mongo sh -c 'mongosh -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin roommatch'
```
El comando usa el usuario y la clave que ya tiene el contenedor, así que no hay que escribirlos. Para salir de la consola, escribir `exit`.

### 2. Ver las convivencias confirmadas
```js
db.matches.find({ estado: "confirmado" }, { codigo: 1, fecha_habilitacion_evaluacion: 1, resultado: 1 })
```
Anotar el `codigo` del match que se va a probar y su `fecha_habilitacion_evaluacion`, para poder dejarla como estaba al final.

### 3. Habilitar la evaluación
Reemplazar `1` por el código del match:
```js
db.matches.updateOne({ codigo: 1 }, { $set: { fecha_habilitacion_evaluacion: new Date(Date.now() - 60000) } })
```

### 4. Evaluar en la aplicación
1. Iniciar sesión como uno de los dos estudiantes del match.
2. En **Propuestas** aparece el botón **Evaluar convivencia**, en lugar de «Podrás evaluar la convivencia desde el…».
3. Al abrir el formulario, llega la notificación «Cuéntanos cómo va tu convivencia». Si nadie abre el formulario, la API la envía sola en un máximo de 30 minutos.

### Recordatorio a los 7 días (opcional)
Después del paso 4, sin evaluar, simular que el aviso se envió hace 8 días:
```js
db.matches.updateOne({ codigo: 1 }, { $set: { "seguimiento.$[].fecha_aviso": new Date(Date.now() - 8 * 24 * 3600 * 1000) } })
```
El recordatorio «Aún no evalúas tu convivencia» llega cuando alguno de los dos abre la evaluación, o en un máximo de 30 minutos.

### Volver a dejarlo como estaba
Para repetir la prueba, borrar las evaluaciones y los avisos, y restaurar la fecha anotada en el paso 2:
```js
db.matches.updateOne({ codigo: 1 }, { $set: {
  fecha_habilitacion_evaluacion: ISODate("2026-11-29T02:36:11.171Z"),
  evaluacion: [], seguimiento: [], resultado: "pendiente"
} })
```
Esto no borra las notificaciones ya enviadas ni el ajuste de recomendaciones del estudiante (`ajuste_recomendacion` en `usuarios`), que queda guardado aunque se borre la evaluación.
