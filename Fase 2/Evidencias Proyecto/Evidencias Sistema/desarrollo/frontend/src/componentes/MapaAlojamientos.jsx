import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { api } from '../api.js'
import { formatearPesos, textoDe, TIPOS } from '../publicaciones.js'
import './mapa.css'

// Centro del Gran Concepción, para cuando todavía no hay puntos
const CENTRO_INICIAL = [-36.827, -73.0498]

// La API entrega [longitud, latitud] (GeoJSON); Leaflet usa [latitud, longitud]
const aLatLng = ([lng, lat]) => [lat, lng]

const precioCorto = (monto) => (monto >= 1_000_000 ? `$${(monto / 1_000_000).toFixed(1)}M` : `$${Math.round(monto / 1000)}k`)

// Íconos con texto en vez de la imagen de Leaflet: muestran el precio (o cuántos hay) sin abrir nada
const iconoGrupo = (pubs) => L.divIcon({
  className: 'mapa-marcador',
  html: `<span class="mapa-burbuja${pubs.length > 1 ? ' grupo' : ''}">${pubs.length > 1 ? `${pubs.length} alojamientos` : precioCorto(pubs[0].costo_mensual)}</span>`,
  iconSize: null,
  iconAnchor: [0, 0],
})
const iconoSede = L.divIcon({
  className: 'mapa-marcador',
  html: '<span class="mapa-sede" aria-hidden="true">Tu sede</span>',
  iconSize: null,
  iconAnchor: [0, 0],
})

// Encuadra el mapa para que se vean todos los puntos y la sede cada vez que cambian los resultados
function Encuadre({ puntos }) {
  const mapa = useMap()
  useEffect(() => {
    if (puntos.length === 1) mapa.setView(puntos[0], 13)
    else if (puntos.length > 1) mapa.fitBounds(puntos, { padding: [40, 40], maxZoom: 14 })
  }, [mapa, puntos])
  return null
}

/**
 * Mapa de alojamientos: los mismos resultados que el listado (mismos filtros, en `consulta`), con la
 * sede del perfil y la distancia a ella. Por ahora cada publicación se ubica en el centro de su
 * comuna, así que varias comparten marcador; al tocarlo se listan todas.
 */
export default function MapaAlojamientos({ consulta, desde }) {
  const [resultado, setResultado] = useState({ consulta: null, datos: null, error: '' })

  useEffect(() => {
    let vigente = true
    api(`/publicaciones/mapa${consulta ? `?${consulta}` : ''}`)
      .then((datos) => vigente && setResultado({ consulta, datos, error: '' }))
      .catch((err) => vigente && setResultado({ consulta, datos: null, error: err.message }))
    return () => {
      vigente = false
    }
  }, [consulta])

  const { datos, error } = resultado.consulta === consulta ? resultado : { datos: null, error: '' }

  // Publicaciones agrupadas por punto: las de una misma comuna quedan juntas
  const grupos = useMemo(() => {
    const porPunto = new Map()
    for (const p of datos?.puntos ?? []) {
      const clave = p.coordenadas.join(',')
      porPunto.set(clave, [...(porPunto.get(clave) ?? []), p])
    }
    return [...porPunto.values()]
  }, [datos])

  const encuadre = useMemo(() => [
    ...grupos.map((g) => aLatLng(g[0].coordenadas)),
    ...(datos?.sede ? [aLatLng(datos.sede.coordenadas)] : []),
  ], [grupos, datos])

  if (error) return <p className="alerta" role="alert">{error}</p>

  return (
    <div className="mapa-alojamientos">
      <MapContainer center={CENTRO_INICIAL} zoom={12} scrollWheelZoom className="mapa-lienzo">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Encuadre puntos={encuadre} />
        {datos?.sede && (
          <Marker position={aLatLng(datos.sede.coordenadas)} icon={iconoSede} title={`Tu sede: ${datos.sede.nombre}`}
            zIndexOffset={1000}>
            <Popup>
              <strong>{datos.sede.institucion}</strong>
              <br />
              {datos.sede.nombre}
            </Popup>
          </Marker>
        )}
        {grupos.map((pubs) => (
          <Marker key={pubs[0].coordenadas.join(',')} position={aLatLng(pubs[0].coordenadas)} icon={iconoGrupo(pubs)}
            title={pubs.length > 1 ? `${pubs.length} alojamientos en ${pubs[0].comuna}` : pubs[0].titulo}>
            <Popup maxWidth={300}>
              <p className="mapa-popup-titulo">
                {pubs[0].comuna}
                {pubs[0].distancia_km != null && <span> · a {pubs[0].distancia_km} km de tu sede</span>}
              </p>
              <ul className="mapa-popup-lista">
                {pubs.map((p) => (
                  <li key={p.id}>
                    {p.foto_url ? <img src={p.foto_url} alt="" /> : <span className="mapa-sin-foto" aria-hidden="true" />}
                    <div>
                      <Link to={`/alojamientos/${p.id}`} state={{ desde }}>{p.titulo}</Link>
                      <span>{textoDe(TIPOS, p.tipo)} · {formatearPesos(p.costo_mensual)} / mes</span>
                      {p.es_propia && <span className="mapa-propia">Tu publicación</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <p className="mapa-nota">
        {!datos && 'Cargando el mapa…'}
        {datos && datos.mostrados < datos.total && `Se muestran los ${datos.mostrados} más recientes de ${datos.total}. `}
        {datos && 'Las ubicaciones son aproximadas: cada alojamiento aparece en el centro de su comuna.'}
        {datos && !datos.sede && <> <Link to="/perfil/editar">Indica tu institución y sede</Link> para ver la distancia.</>}
      </p>
    </div>
  )
}
