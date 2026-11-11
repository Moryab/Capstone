# Producción: compila el frontend y lo sirve con Caddy, que también reenvía /api a la API y
# obtiene el certificado HTTPS automáticamente (ver Caddyfile y docker-compose.produccion.yml)
FROM node:22-alpine AS compilacion
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=compilacion /app/dist /srv
