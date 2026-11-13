import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './mapa.css'

// Lo que comparten los mapas (Leaflet + OpenStreetMap). Solo lo importan componentes que se cargan
// con lazy(), para que Leaflet no pese en el resto de la aplicación

// Concepción, la ciudad con más sedes de la región, para cuando todavía no hay puntos
export const CENTRO_INICIAL = [-36.827, -73.0498]

// La API entrega [longitud, latitud] (GeoJSON); Leaflet usa [latitud, longitud]
export const aLatLng = ([lng, lat]) => [lat, lng]

// Capa base de OpenStreetMap (gratuita, sin clave). mapa.css la suaviza con un filtro para que se
// destaquen la sede y los alojamientos. <TileLayer {...CAPA_MAPA} />
export const CAPA_MAPA = {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  maxZoom: 19,
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

// La sede del perfil: alfiler dorado con un birrete y un halo que la distingue de todo lo demás
export const iconoSede = L.divIcon({
  className: 'mapa-marcador',
  html: '<span class="mapa-sede-pin" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 4 2 9l10 5 8-4v6h2V9z" fill="currentColor"/><path d="M6 12.2V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-3.8l-6 3z" fill="currentColor"/></svg></span>',
  iconSize: [44, 52],
  iconAnchor: [22, 50],
  popupAnchor: [0, -46],
})

// Íconos de cada tipo de alojamiento (trazos de 24×24): una casa para la habitación y un edificio para
// el departamento. Se usan en los marcadores (como HTML) y en la ventana al tocarlos (como JSX)
export const TRAZOS_TIPO = {
  habitacion: ['M3.5 11 12 4l8.5 7', 'M5.5 9.5V20h13V9.5', 'M10 20v-5.5h4V20'],
  departamento: ['M5 20.5V4h10v16.5', 'M15 9h4v11.5', 'M3 20.5h18', 'M8 7.5h1M11 7.5h1M8 11h1M11 11h1M8 14.5h1M11 14.5h1', 'M17 12.5h0M17 16h0'],
}

// El ícono del tipo como texto SVG, para los marcadores de Leaflet (que son HTML)
export const svgTipo = (tipo) => {
  const trazos = TRAZOS_TIPO[tipo] ?? TRAZOS_TIPO.habitacion
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${trazos.map((d) => `<path d="${d}"/>`).join('')}</svg>`
}

// Alfiler del alojamiento en el detalle: verde, con la casa o el edificio según su tipo
export const iconoAlojamiento = (tipo) => L.divIcon({
  className: 'mapa-marcador',
  html: `<span class="mapa-aloj-pin" aria-hidden="true">${svgTipo(tipo)}</span>`,
  iconSize: [40, 48],
  iconAnchor: [20, 46],
  popupAnchor: [0, -42],
})
