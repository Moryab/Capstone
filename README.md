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
* Catalina Gonzáles.
* Noemí Goler.

## Cómo ejecutar el proyecto

El código está en `Fase 2/Evidencias Proyecto/Evidencias Sistema/desarrollo/`:
- `backend/`: API en FastAPI + MongoDB, corre en Docker.
- `frontend/`: interfaz en React + Vite, corre con Node.

### Requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js](https://nodejs.org/) 20 o superior

### Solo la primera vez
1. Crear el archivo `.env` copiando `.env.example` (en la carpeta `desarrollo`) y reemplazar los valores. El `.env` no se sube a git porque contiene contraseñas.
   ```Terminal
   cd "C:\Capstone\Fase 2\Evidencias Proyecto\Evidencias Sistema\desarrollo"
   copy .env.example .env
   ```
2. Instalar las dependencias del frontend:
   ```Terminal
   cd "C:\Capstone\Fase 2\Evidencias Proyecto\Evidencias Sistema\desarrollo\frontend"
   npm install
   ```

### Cada vez que se trabaja
1. Abrir **Docker Desktop** y esperar a que diga que está corriendo.
2. Levantar la base de datos y la API (terminal 1):
   ```Terminal
   cd "C:\Capstone\Fase 2\Evidencias Proyecto\Evidencias Sistema\desarrollo"
   docker compose up -d --build
   ```
3. Levantar el frontend (terminal 2):
   ```Terminal
   cd "C:\Capstone\Fase 2\Evidencias Proyecto\Evidencias Sistema\desarrollo\frontend"
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
- API y base de datos: `docker compose down` en la carpeta `desarrollo`. Los datos se conservan para la próxima vez.

### Si algo falla
- **`failed to connect to the docker API`**: Docker Desktop no está abierto.
- **La API no responde**: revisar el error con `docker compose logs api` (en la carpeta `desarrollo`).
- **Se cambió código del backend o `requirements.txt`**: volver a ejecutar `docker compose up -d --build`; sin `--build` sigue corriendo la versión anterior.
- **Error de módulos en el frontend** (por ejemplo después de un `git pull`): ejecutar `npm install` en la carpeta `frontend`.
