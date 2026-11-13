import { useEffect } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import { aLatLng, CAPA_MAPA, iconoAlojamiento, iconoSede, iconoTexto } from './mapaComun.js'

function explicacion({ punto, comuna_nombre: comuna }, esPropia, conSede) {
  const sede = conSede ? ' La línea punteada la une con tu sede.' : ''
  if (punto) return `El marcador está en la dirección del alojamiento.${sede}`
  if (esPropia) return `No marcaste el punto en el mapa, así que se muestra el centro de ${comuna}. Puedes marcarlo desde «Editar».`
  return `El oferente no marcó el punto en el mapa: se muestra el centro de ${comuna}.${sede}`
}

// Con la sede a la vista, el mapa encuadra a ambos; sin ella, se centra en el alojamiento
function Encuadre({ puntos }) {
  const mapa = useMap()
  useEffect(() => {
    if (puntos.length > 1) mapa.fitBounds(puntos, { padding: [56, 56], maxZoom: 16 })
  }, [mapa, puntos])
  return null
}

/**
 * La ubicación en el detalle de una publicación: solo el alojamiento (con la casa o el edificio de su
 * tipo) y, si quien mira indicó su sede, la sede y una línea entre ambos.
 */
export default function MapaUbicacion({ ubicacion, tipo, esPropia, sede }) {
  const { zona, punto } = ubicacion
  const posicion = punto ? [punto.lat, punto.lng] : [zona.lat, zona.lng]
  const posicionSede = sede && !esPropia ? aLatLng(sede.coordenadas) : null
  const puntos = posicionSede ? [posicion, posicionSede] : [posicion]

  return (
    <div className="mapa-alojamientos">
      <div className="mapa-marco">
        <MapContainer center={posicion} zoom={punto ? 16 : 13} scrollWheelZoom={false} className="mapa-lienzo mapa-chico">
          <TileLayer {...CAPA_MAPA} />
          <Encuadre puntos={puntos} />
          {posicionSede && (
            <>
              <Polyline positions={puntos} interactive={false}
                pathOptions={{ color: '#0b1f3a', weight: 2.5, opacity: 0.55, dashArray: '2 8', lineCap: 'round' }} />
              <Marker position={posicionSede} icon={iconoSede} title={`Tu sede: ${sede.institucion} ${sede.nombre}`}>
                <Popup>
                  <p className="mapa-popup-titulo">{sede.institucion_nombre ?? sede.institucion}</p>
                  <p className="mapa-popup-sede">
                    {sede.nombre}
                    <br />
                    {sede.direccion ? `${sede.direccion}, ${sede.comuna}` : sede.comuna}
                  </p>
                </Popup>
              </Marker>
            </>
          )}
          {punto ? (
            <Marker position={posicion} icon={iconoAlojamiento(tipo)} title="Ubicación del alojamiento" zIndexOffset={500} />
          ) : (
            <Marker position={posicion} icon={iconoTexto('<span class="mapa-burbuja grupo"><span>Centro de la comuna</span></span>')}
              interactive={false} />
          )}
        </MapContainer>
      </div>
      <p className="mapa-nota">{explicacion(ubicacion, esPropia, Boolean(posicionSede))}</p>
    </div>
  )
}
