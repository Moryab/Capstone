import { useEffect, useRef } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { CENTRO_INICIAL, CAPA_MAPA, iconoPin } from './mapaComun.js'

const redondear = ({ lat, lng }) => ({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) })

function AlTocar({ onTocar }) {
  useMapEvents({ click: (e) => onTocar(redondear(e.latlng)) })
  return null
}

// Al cambiar la comuna, el mapa va a su centro (no al cargar: si ya hay punto, se parte en él)
function SeguirComuna({ centro }) {
  const mapa = useMap()
  const primera = useRef(true)
  useEffect(() => {
    if (primera.current) {
      primera.current = false
      return
    }
    if (centro) mapa.setView(centro, 14)
  }, [mapa, centro])
  return null
}

// Cuando el punto llega de afuera (la búsqueda de la dirección), el mapa va hasta él
function SeguirPunto({ punto }) {
  const mapa = useMap()
  useEffect(() => {
    if (!punto) return
    const destino = [punto.lat, punto.lng]
    if (mapa.getZoom() < 15 || !mapa.getBounds().pad(-0.2).contains(destino)) mapa.setView(destino, 16)
  }, [mapa, punto])
  return null
}

/**
 * Punto del alojamiento en el formulario de publicación (opcional). `centro` es el de la comuna
 * elegida ([lat, lng]) y `punto` el marcado ({ lat, lng } o null).
 */
export default function SelectorUbicacion({ centro, punto, onCambio, error }) {
  const posicion = punto && [punto.lat, punto.lng]
  return (
    <div className="campo selector-ubicacion">
      <p className="selector-titulo" id="ubicacion-punto">Punto en el mapa</p>
      <p className="campo-ayuda" id="ubicacion-punto-ayuda">
        Toca el mapa o arrastra el marcador para ajustarlo. Así aparecerá tu alojamiento en el mapa.
      </p>
      <MapContainer center={posicion ?? centro ?? CENTRO_INICIAL} zoom={posicion || centro ? 14 : 11}
        className="mapa-lienzo mapa-chico" aria-labelledby="ubicacion-punto" aria-describedby="ubicacion-punto-ayuda">
        <TileLayer {...CAPA_MAPA} />
        <AlTocar onTocar={onCambio} />
        <SeguirComuna centro={centro} />
        <SeguirPunto punto={punto} />
        {posicion && (
          <Marker position={posicion} icon={iconoPin} draggable title="Punto del alojamiento"
            eventHandlers={{ dragend: (e) => onCambio(redondear(e.target.getLatLng())) }} />
        )}
      </MapContainer>
      {posicion ? (
        <p className="campo-ayuda">
          Este es el punto que verán los estudiantes.{' '}
          <button type="button" className="enlace-boton" onClick={() => onCambio(null)}>Quitar el punto</button>
        </p>
      ) : null}
      {error && <p className="campo-error" role="alert">{error}</p>}
    </div>
  )
}
