import { Circle, MapContainer, Marker, TileLayer } from 'react-leaflet'
import { CAPA_OSM, ESTILO_ZONA, iconoPin, iconoTexto } from './mapaComun.js'

function explicacion({ zona, punto, comuna_nombre: comuna }, esPropia) {
  if (punto && esPropia) {
    return `El marcador es el punto exacto y solo lo ves tú. Los demás ven el círculo: una zona de unos ${zona.radio_m} m.`
  }
  if (punto) return 'El marcador es el punto exacto que marcó el oferente: solo lo ve administración. Los estudiantes ven el círculo.'
  if (zona.radio_m) return `Zona aproximada de unos ${zona.radio_m} m. La dirección exacta se coordina con el oferente.`
  if (esPropia) return `No marcaste el punto en el mapa, así que se muestra el centro de ${comuna}. Puedes marcarlo desde «Editar».`
  return `El oferente no marcó el punto en el mapa: se muestra el centro de ${comuna}.`
}

/** La ubicación en el detalle de una publicación: la zona que ven todos y, a quien puede, el punto exacto. */
export default function MapaUbicacion({ ubicacion, esPropia }) {
  const { zona, punto } = ubicacion
  const centroZona = [zona.lat, zona.lng]
  return (
    <div className="mapa-alojamientos">
      <MapContainer center={punto ? [punto.lat, punto.lng] : centroZona} zoom={zona.radio_m ? 15 : 13}
        scrollWheelZoom={false} className="mapa-lienzo mapa-chico">
        <TileLayer {...CAPA_OSM} />
        {zona.radio_m ? (
          <Circle center={centroZona} radius={zona.radio_m} pathOptions={ESTILO_ZONA} interactive={false} />
        ) : (
          <Marker position={centroZona} icon={iconoTexto('<span class="mapa-burbuja grupo">Centro de la comuna</span>')}
            interactive={false} />
        )}
        {punto && <Marker position={[punto.lat, punto.lng]} icon={iconoPin} title="Punto exacto" />}
      </MapContainer>
      <p className="mapa-nota">{explicacion(ubicacion, esPropia)}</p>
    </div>
  )
}
