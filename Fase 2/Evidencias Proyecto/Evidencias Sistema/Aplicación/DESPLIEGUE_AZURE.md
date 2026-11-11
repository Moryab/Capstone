# Publicar RoomMatch en Azure

La plataforma corre en una máquina virtual (VM) de Azure con los mismos contenedores que en desarrollo, más un servidor web (Caddy) que entrega la página, reenvía `/api` a la API y saca el certificado HTTPS solo.

```
Internet ──https──> Caddy (web) ──/api──> API (FastAPI) ──> MongoDB
                       └── página (React compilado)
```

Archivos que se usan: `docker-compose.produccion.yml`, `frontend/Dockerfile` y `frontend/Caddyfile` (en esta carpeta).

**Servidor actual**

| | |
|---|---|
| Dirección | https://roommatch-g6.northcentralus.cloudapp.azure.com |
| VM | `roommatch-vm`, grupo de recursos `roommatch`, suscripción Azure for Students |
| Región / tamaño | North Central US / Standard B2als v2 (2 vCPU, 4 GB), Ubuntu 24.04, SSD estándar 30 GB |
| Costo | ~US$0,038 por hora **solo mientras está prendida** (más unos centavos al mes por disco e IP) |
| Entrar por SSH | usuario `azureuser` con la clave `roommatch-vm_key.pem` |

---

## Día a día

- **Prender**: [portal.azure.com](https://portal.azure.com) → Máquinas virtuales → `roommatch-vm` → **Iniciar**. En uno o dos minutos la plataforma está disponible sola: no hay que entrar al servidor.
- **Apagar**: misma página → **Detener**. Debe quedar **Detenida (desasignada)**; así no se cobra la máquina. Apagarla desde dentro del servidor (`shutdown`) **sí sigue cobrando**.
- **Apagado automático**: todos los días a las 23:00 (hora de Chile). Si se necesita más tarde, se cambia en la VM → Operaciones → Apagado automático.
- **Gasto**: portal → **Administración de costos**. El crédito de estudiante (US$100) vence el 14/05/2027.

---

## Actualizar a la última versión

Después de subir cambios a GitHub, entrar al servidor (ver «Entrar al servidor») y ejecutar:
```bash
cd ~/Capstone/Fase\ 2/Evidencias\ Proyecto/Evidencias\ Sistema/Aplicación
git pull
python3 preparar.py   # solo agrega variables nuevas del .env.example, si las hay
sudo docker compose -f docker-compose.yml -f docker-compose.produccion.yml up -d --build
```

## Entrar al servidor

Desde PowerShell en el computador donde está la clave:
```Terminal
ssh -i "$env:USERPROFILE\.ssh\roommatch-vm_key.pem" -o ConnectTimeout=60 azureuser@roommatch-g6.northcentralus.cloudapp.azure.com
```
Queda una línea `azureuser@roommatch-vm:~$`: lo que se escriba ahí se ejecuta en el servidor. Para salir, `exit`.

- Si dice *Connection timed out*, volver a intentar (a veces la conexión se corta). Si el nombre no se resuelve, usar la IP que aparece en el portal en vez del nombre.
- Si reclama que los permisos de la clave son demasiado abiertos (`UNPROTECTED PRIVATE KEY FILE`):
  ```Terminal
  icacls "$env:USERPROFILE\.ssh\roommatch-vm_key.pem" /inheritance:r /grant:r "$($env:USERNAME):R"
  ```
- La clave **no se puede volver a descargar** desde Azure. Si otro integrante necesita entrar, se le pasa el archivo por un medio privado (no por el repositorio).

## Respaldos

En el servidor:
```bash
cd ~/Capstone/Fase\ 2/Evidencias\ Proyecto/Evidencias\ Sistema/Base\ de\ datos
python3 respaldo.py crear
```
Para bajarlo al computador (desde PowerShell, no dentro del servidor):
```Terminal
scp -i "$env:USERPROFILE\.ssh\roommatch-vm_key.pem" "azureuser@roommatch-g6.northcentralus.cloudapp.azure.com:Capstone/Fase 2/Evidencias Proyecto/Evidencias Sistema/Base de datos/respaldos/*" .
```

## Si algo falla

| Síntoma | Qué revisar |
|---|---|
| La página no carga | Que la VM esté *En ejecución* en el portal (quizás se apagó a las 23:00) |
| Advertencia de certificado o error de HTTPS | `sudo docker compose logs web`: el `DOMINIO` del `.env` debe ser exactamente el nombre DNS de la VM |
| La página carga pero no inicia sesión | `sudo docker compose logs api` |
| La API no arranca | `sudo docker compose logs inicializar-bd` (preparación de la base) |
| Ver qué está corriendo | `sudo docker ps` (deben estar `web`, `api` y `mongo` *Up*) |

Los comandos `docker compose` se ejecutan en la carpeta `Aplicación` del servidor.

---

## Cómo se creó (por si hay que hacerlo de nuevo)

### 1. Crear la VM
Portal → **Máquinas virtuales** → **Crear** → **Máquina virtual de Azure**:

| Campo | Valor |
|---|---|
| Suscripción / grupo de recursos | Azure for Students / nuevo: `roommatch` |
| Nombre | `roommatch-vm` |
| Región | **North Central US** |
| Opciones de disponibilidad | No se requiere redundancia de la infraestructura |
| Imagen | Ubuntu Server 24.04 LTS - x64 Gen2 |
| Tamaño | **Standard_B2als_v2** |
| Autenticación | Clave pública SSH, usuario `azureuser`, generar par de claves `roommatch-vm_key` |
| Puertos de entrada | HTTP (80), HTTPS (443), SSH (22) |
| Discos | SSD estándar (redundante **local**), 30 GiB |
| Administración | Apagado automático 23:00, (UTC-04:00) Santiago |

Al crear, **descargar la clave privada** y guardarla en `C:\Users\<usuario>\.ssh\`.

**Problemas que aparecieron y cómo se resolvieron** (propios de la cuenta de estudiante):
- *Brazil South* da un error de política: la suscripción solo permite algunas regiones.
- En *East US* la serie B no está disponible, y la serie F (`F1ads_v7`) falló con **QuotaExceeded** (cuota 0 para esa familia).
- Para ver qué se podía usar: **Cuotas** → Mis cuotas → Proveedor *Compute*, región, y buscar la familia (por ejemplo `Basv2`). La columna *Uso actual* muestra «0 de 10» = límite 10. Con el triángulo «solucionar problemas» → *Mostrar recomendaciones* → *Mostrarme cuotas en diferentes regiones para Familia Basv2* apareció **North Central US** con límite 10.
- Antes hubo que registrar los proveedores: **Suscripciones** → Azure for Students → **Proveedores de recursos** → registrar `Microsoft.Compute` y `Microsoft.DevTestLab` (este último es el del apagado automático). `Microsoft.Network` y `Microsoft.Storage` ya venían registrados.

### 2. Nombre DNS
VM → Información general → **Nombre DNS: Sin configurar** → etiqueta `roommatch-g6` → Guardar. Queda `roommatch-g6.northcentralus.cloudapp.azure.com`, que no cambia aunque cambie la IP.

### 3. Preparar el servidor (dentro del servidor, por SSH)
Memoria swap de 2 GB y Docker:
```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker azureuser
```

### 4. Descargar el proyecto y crear el `.env`
```bash
cd ~ && git clone https://github.com/Moryab/Capstone.git
cd ~/Capstone/Fase\ 2/Evidencias\ Proyecto/Evidencias\ Sistema/Aplicación
python3 preparar.py
sed -i 's/^DOMINIO=.*/DOMINIO=roommatch-g6.northcentralus.cloudapp.azure.com/' .env
```
`preparar.py` genera claves nuevas y muestra **el correo y la clave del administrador del servidor** (distinta a la de cada computador): hay que anotarla. Si se pierde, se puede ver con `grep ADMIN .env` en esa carpeta.

### 5. Levantar
```bash
sudo docker compose -f docker-compose.yml -f docker-compose.produccion.yml up -d --build
```
La primera vez tarda unos minutos (descarga imágenes y compila el frontend). Caddy obtiene el certificado HTTPS al arrancar. Comprobar en el navegador: `https://roommatch-g6.northcentralus.cloudapp.azure.com`.
