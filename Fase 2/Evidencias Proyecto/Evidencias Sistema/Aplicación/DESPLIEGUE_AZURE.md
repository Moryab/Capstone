# Publicar RoomMatch en Azure

La plataforma corre en una máquina virtual (VM) de Azure con los mismos contenedores que en desarrollo, más un servidor web (Caddy) que entrega la página, reenvía `/api` a la API y saca el certificado HTTPS solo.

```
Internet ──https──> Caddy (web) ──/api──> API (FastAPI) ──> MongoDB
                       └── página (React compilado)
```

Archivos que se usan: `docker-compose.produccion.yml`, `frontend/Dockerfile` y `frontend/Caddyfile` (en esta carpeta).

---

## 1. Crear la máquina virtual (una sola vez)

En [portal.azure.com](https://portal.azure.com) → **Máquinas virtuales** → **Crear** → **Máquina virtual de Azure**.

**Pestaña Aspectos básicos**
| Campo | Valor |
|---|---|
| Suscripción | Azure for Students |
| Grupo de recursos | Crear nuevo: `roommatch` |
| Nombre | `roommatch-vm` |
| Región | La más cercana que permita la suscripción (por ejemplo *Brazil South*; si da error de política, *East US*) |
| Imagen | **Ubuntu Server 24.04 LTS - x64 Gen2** |
| Tamaño | **Standard_B1ms** (2 GB de RAM). Si aparece alguno marcado como *apto para servicios gratuitos* con al menos 1 GB, también sirve (el paso 3 agrega memoria swap) |
| Tipo de autenticación | Clave pública SSH |
| Nombre de usuario | `azureuser` |
| Origen de la clave | Generar nuevo par de claves (nombre `roommatch-vm_key`) |
| Puertos de entrada públicos | Permitir **SSH (22), HTTP (80) y HTTPS (443)** |

**Pestaña Administración**
- **Habilitar apagado automático**: sí, a las 23:00, zona horaria *(UTC-03:00) Santiago*. Así se apaga sola si se olvida.

**Revisar y crear** → **Crear** → **Descargar la clave privada** (`roommatch-vm_key.pem`). Guárdala bien: sin ella no se puede entrar al servidor.

### Dirección fija con nombre (gratis)

En la VM → **Información general** → **Nombre DNS: No configurado** → escribir una etiqueta, por ejemplo `roommatch-g6`, y **Guardar**.
La plataforma quedará en `roommatch-g6.<región>.cloudapp.azure.com` (aparece completo en Información general). Esa es la dirección para el `.env` y para entrar desde el navegador.

---

## 2. Entrar al servidor

Desde PowerShell en tu computador (Windows ya trae `ssh`):

```Terminal
ssh -i "C:\ruta\a\roommatch-vm_key.pem" azureuser@roommatch-g6.<región>.cloudapp.azure.com
```

Si reclama que los permisos de la clave son demasiado abiertos (`UNPROTECTED PRIVATE KEY FILE`):
```Terminal
icacls "C:\ruta\a\roommatch-vm_key.pem" /inheritance:r /grant:r "$($env:USERNAME):R"
```

---

## 3. Preparar el servidor (una sola vez)

Todo esto se escribe **dentro del servidor** (después del `ssh`).

**Memoria swap de 2 GB** (para que compilar el frontend no se quede sin memoria):
```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

**Docker:**
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
exit
```
Volver a entrar con el mismo `ssh` (para que tome el permiso de Docker).

**El proyecto:**
```bash
git clone https://github.com/Moryab/Capstone.git
cd "Capstone/Fase 2/Evidencias Proyecto/Evidencias Sistema/Aplicación"
python3 preparar.py
```
Si el repositorio es privado, `git clone` pide usuario y contraseña: la contraseña es un *token* de GitHub (GitHub → Settings → Developer settings → Personal access tokens → Fine-grained, con permiso de lectura sobre el repositorio).

`preparar.py` crea el `.env` con claves nuevas y muestra **el correo y la clave del administrador**: anótalos.

**La dirección pública** en el `.env` (reemplazar por la tuya):
```bash
sed -i 's/^DOMINIO=.*/DOMINIO=roommatch-g6.<región>.cloudapp.azure.com/' .env
```

---

## 4. Levantar la plataforma

En la carpeta `Aplicación` del servidor:
```bash
docker compose -f docker-compose.yml -f docker-compose.produccion.yml up -d --build
```
La primera vez tarda unos minutos (descarga imágenes y compila el frontend). Después, abrir `https://roommatch-g6.<región>.cloudapp.azure.com` en el navegador.

Para revisar que todo esté arriba:
```bash
docker compose ps
```
Deben aparecer `mongo`, `api` y `web` como *Up*, e `inicializar-bd` como *Exited (0)* (termina después de preparar la base).

---

## Día a día

- **Prender**: portal → la VM → **Iniciar**. En uno o dos minutos la plataforma está disponible sola: Docker levanta todo al arrancar, no hay que entrar al servidor.
- **Apagar**: portal → la VM → **Detener**. Debe quedar **Detenida (desasignada)**; así no se cobra la máquina. Apagarla desde dentro del servidor (`shutdown`) **sí sigue cobrando**.
- **Gasto**: portal → **Administración de costos**. Conviene crear un presupuesto con aviso (por ejemplo US$10).

## Actualizar a la última versión

Después de subir cambios a GitHub, en el servidor:
```bash
cd "Capstone/Fase 2/Evidencias Proyecto/Evidencias Sistema/Aplicación"
git pull
python3 preparar.py   # solo agrega variables nuevas del .env.example, si las hay
docker compose -f docker-compose.yml -f docker-compose.produccion.yml up -d --build
```

## Respaldos

```bash
cd "Capstone/Fase 2/Evidencias Proyecto/Evidencias Sistema/Base de datos"
python3 respaldo.py crear
```
Para bajarlo a tu computador (desde PowerShell, no dentro del servidor):
```Terminal
scp -i "C:\ruta\a\roommatch-vm_key.pem" "azureuser@roommatch-g6.<región>.cloudapp.azure.com:Capstone/Fase 2/Evidencias Proyecto/Evidencias Sistema/Base de datos/respaldos/*" .
```

## Si algo falla

| Síntoma | Qué revisar |
|---|---|
| El navegador no carga la página | Que la VM esté *En ejecución* y que los puertos 80 y 443 estén abiertos (VM → Redes) |
| Advertencia de certificado o error de HTTPS | `docker compose logs web`: el `DOMINIO` del `.env` debe ser exactamente el nombre DNS de la VM. Después de corregirlo, volver a ejecutar el comando del paso 4 |
| La página carga pero no inicia sesión | `docker compose logs api` |
| La API no arranca | `docker compose logs inicializar-bd` (preparación de la base) |
| El `--build` se corta o el servidor se pone muy lento | Falta memoria: revisar que la swap esté activa (`free -h`) |
