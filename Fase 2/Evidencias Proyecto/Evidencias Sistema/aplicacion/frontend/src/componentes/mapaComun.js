import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './mapa.css'

// Lo que comparten los mapas (Leaflet + OpenStreetMap). Solo lo importan componentes que se cargan
// con lazy(), para que Leaflet no pese en el resto de la aplicación

// Centro del Gran Concepción, para cuando todavía no hay puntos
export const CENTRO_INICIAL = [-36.827, -73.0498]

// La API entrega [longitud, latitud] (GeoJSON); Leaflet usa [latitud, longitud]
export const aLatLng = ([lng, lat]) => [lat, lng]

// Color de las zonas aproximadas (el --primario de index.css; Leaflet no lee variables CSS)
export const ESTILO_ZONA = { color: '#0f766e', weight: 2, fillOpacity: 0.15 }

// Capa de OpenStreetMap: <TileLayer {...CAPA_OSM} />
export const CAPA_OSM = {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
}

// Un texto como marcador (precio, «Tu sede»…). El HTML lo arma el código, nunca un texto del usuario
export const iconoTexto = (html) => L.divIcon({ className: 'mapa-marcador', html, iconSize: null, iconAnchor: [0, 0] })

// Alfiler del punto exacto, dibujado con CSS (la imagen por defecto de Leaflet no carga con Vite)
export const iconoPin = L.divIcon({
  className: 'mapa-marcador',
  html: '<span class="mapa-pin" aria-hidden="true"></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
})
