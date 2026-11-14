import L from 'leaflet'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Esqueleto } from './Esqueleto.jsx'
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { api } from '../api.js'
import { desdeURL, radioDe } from '../busqueda.js'
import { formatearPesos, textoDe, textoDistancia, TIPOS } from '../publicaciones.js'
import { IconoBirrete, IconoUbicacion } from './Iconos.jsx'
import { aLatLng, CAPA_MAPA, CENTRO_INICIAL, iconoSede, iconoTexto, svgTipo, TRAZOS_TIPO } from './mapaComun.js'

const precioCorto = (monto) => (monto >= 1_000_000 ? `$${(monto / 1_000_000).toFixed(1)}M` : `$${Math.round(monto / 1000)}k`)

// Íconos con texto en vez de la imagen de Leaflet: muestran el precio (o cuántos hay) sin abrir nada
// Cada burbuja lleva el ícono del tipo: casa (habitación) o edificio (departamento). Un grupo con
// ambos tipos no lleva ícono, solo cuántos son
const iconoGrupo = (pubs) => {
  const grupo = pubs.length > 1
  const tipos = new Set(pubs.map((p) => p.tipo))
  const icono = tipos.size === 1 ? svgTipo(pubs[0].tipo) : ''
  return iconoTexto(
    `<span class="mapa-burbuja${grupo ? ' grupo' : ''}">${icono}<span>${grupo ? `${pubs.length} alojamientos` : precioCorto(pubs[0].costo_mensual)}</span></span>`,
  )
}

// Miniatura de un alojamiento sin fotos en la ventana del marcador: su tipo dibujado sobre un degradado
function MiniaturaSinFoto({ tipo }) {
  return (
    <span className={`mapa-sin-foto tipo-${tipo}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {(TRAZOS_TIPO[tipo] ?? TRAZOS_TIPO.habitacion).map((d) => <path key={d} d={d} />)}
      </svg>
    </span>
  )
}

// Qué tan cerca está cada punto de la ubicación real (lo calcula la API)
const PRECISION = {
  comuna: 'Centro de la comuna',
  exacta: 'Ubicación exacta',
}

// Encuadra el mapa cada vez que cambian los filtros: con «Cerca de mi sede», en el círculo del radio
// elegido (lo filtrado está adentro); sin él, en todos los puntos y la sede
// Márgenes del encuadre: arriba, el alto de las burbujas y del alfiler de la sede (se dibujan sobre su
// punto); abajo, la leyenda. Así ningún marcador queda cortado ni tapado
const MARGEN_ARRIBA = [56, 72]
const MARGEN_ABAJO = [56, 76]

function Encuadre({ puntos, sede, radioKm }) {
  const mapa = useMap()
  useEffect(() => {
    const encuadrar = () => {
      mapa.invalidateSize() // el contenedor pudo cambiar de ancho después de crearse el mapa
      if (sede && radioKm) {
        mapa.fitBounds(L.latLng(sede).toBounds(radioKm * 2000), { paddingTopLeft: [24, 24], paddingBottomRight: [24, 24] })
      } else if (puntos.length === 1) {
        mapa.setView(puntos[0], 14)
      } else if (puntos.length > 1) {
        mapa.fitBounds(puntos, { paddingTopLeft: MARGEN_ARRIBA, paddingBottomRight: MARGEN_ABAJO, maxZoom: 15 })
      }
    }
    encuadrar()
    // Si el mapa cambia de tamaño (aparece la franja de la sede, la barra de desplazamiento o se gira el
    // celular), se vuelve a encuadrar con el tamaño real
    let cuadro = 0
    const observador = new ResizeObserver(() => {
      cancelAnimationFrame(cuadro)
      cuadro = requestAnimationFrame(encuadrar)
    })
    observador.observe(mapa.getContainer())
    return () => {
      observador.disconnect()
      cancelAnimationFrame(cuadro)
    }
  }, [mapa, puntos, sede, radioKm])
  return null
}

// «Ver mi sede»: cada vez que cambia `pedido`, el mapa vuela hasta la sede
function IrASede({ sede, pedido }) {
  const mapa = useMap()
  useEffect(() => {
    if (pedido && sede) mapa.flyTo(sede, 15, { duration: 0.6 })
  }, [mapa, sede, pedido])
  return null
}

/**
 * Mapa de alojamientos: los mismos resultados que el listado (mismos filtros, en `consulta`), con la
 * sede del perfil y la distancia a ella. Cada publicación aparece en el punto que marcó; las que no
 * marcaron punto, en el centro de su comuna, y como varias lo comparten, al tocarlo se listan todas.
 */
// Ícono de información de los avisos bajo el mapa
const IconoInfo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 7.5h0" /></svg>
)

export default function MapaAlojamientos({ consulta, desde, alActivarCerca }) {
  const [resultado, setResultado] = useState({ consulta: null, datos: null, error: '' })
  const [irASede, setIrASede] = useState(0)

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

  // Publicaciones agrupadas por punto: las que están en el centro de una misma comuna quedan juntas
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

  const sede = datos?.sede
  // Las mismas coordenadas en cada render (si no, el encuadre se repetiría al tocar un marcador)
  const posicionSede = useMemo(() => (sede ? aLatLng(sede.coordenadas) : null), [sede])
  // Con «Cerca de mi sede», el radio elegido: el círculo y el encuadre lo siguen
  const filtros = desdeURL(new URLSearchParams(consulta ?? ''))
  const radioKm = filtros.cerca_institucion && sede ? radioDe(filtros) : null
  const total = datos?.total ?? 0
  // Para la franja: si hay algún filtro aplicado (sin contar la página) y el alojamiento más cercano
  const conFiltros = [...new URLSearchParams(consulta ?? '').keys()].some((clave) => clave !== 'pagina')
  const distancias = (datos?.puntos ?? []).map((p) => p.distancia_km).filter((km) => km != null)
  const masCercano = distancias.length ? Math.min(...distancias) : null

  return (
    <div className="mapa-alojamientos">
      {/* La sede desde la que se busca: institución, sede y dirección, con un atajo para ir a ella */}
      {sede && (
        <section className="mapa-sede-ficha" aria-label="Tu sede en el mapa">
          <span className="mapa-sede-icono" aria-hidden="true"><IconoBirrete /></span>
          <div className="mapa-sede-texto">
            <p className="mapa-sede-rotulo">Buscando cerca de tu sede</p>
            <p className="mapa-sede-nombre">{sede.institucion_nombre ?? sede.institucion} · {sede.nombre}</p>
            <p className="mapa-sede-direccion">
              <IconoUbicacion />
              {sede.direccion
                ? `${sede.direccion}, ${sede.comuna}`
                : `${sede.comuna}: dirección por confirmar, se muestra el centro de la comuna`}
            </p>
          </div>
          <div className="mapa-sede-lado">
            {datos && (
              <p className="mapa-sede-cuenta">
                <strong>{total}</strong> {total === 1 ? 'alojamiento' : 'alojamientos'}
                {radioKm ? ` a ${radioKm} km o menos` : conFiltros ? ' con tus filtros' : ' en el mapa'}
                {masCercano != null && total > 0 && (
                  <> · {total === 1 ? 'está a' : 'el más cercano a'} <strong>{masCercano.toLocaleString('es-CL')} km</strong></>
                )}
              </p>
            )}
            <button type="button" className="mapa-sede-boton" onClick={() => setIrASede((n) => n + 1)}>
              Ver mi sede
            </button>
          </div>
        </section>
      )}

      <div className="mapa-marco">
        <MapContainer center={CENTRO_INICIAL} zoom={12} zoomSnap={0.25} scrollWheelZoom className="mapa-lienzo">
          <TileLayer {...CAPA_MAPA} />
          <Encuadre puntos={encuadre} sede={posicionSede} radioKm={radioKm} />
          <IrASede sede={posicionSede} pedido={irASede} />
          {posicionSede && (
            <>
              {/* Con «Cerca de mi sede»: el radio elegido. Todo lo que muestra el filtro queda adentro */}
              {radioKm && (
                <Circle center={posicionSede} radius={radioKm * 1000} interactive={false}
                  pathOptions={{ color: '#0f766e', weight: 1.5, dashArray: '6 6', fillColor: '#3fd1b8', fillOpacity: 0.08 }} />
              )}
              <Marker position={posicionSede} icon={iconoSede} title={`Tu sede: ${sede.institucion} ${sede.nombre}`}
                zIndexOffset={1000}>
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
          {grupos.map((pubs) => (
            <Marker key={pubs[0].coordenadas.join(',')} position={aLatLng(pubs[0].coordenadas)} icon={iconoGrupo(pubs)}
              title={pubs.length > 1 ? `${pubs.length} alojamientos en ${pubs[0].comuna}` : pubs[0].titulo}>
              <Popup maxWidth={300}>
                <p className="mapa-popup-titulo">
                  {pubs.length > 1 ? pubs[0].comuna : `${pubs[0].comuna}, ${pubs[0].sector}`}
                  {pubs[0].distancia_km != null && <span> · {textoDistancia(pubs[0].distancia_km).toLowerCase()}</span>}
                  <span className="mapa-precision">{PRECISION[pubs[0].precision]}</span>
                </p>
                <ul className="mapa-popup-lista">
                  {pubs.map((p) => (
                    <li key={p.id}>
                      {p.foto_url ? <img src={p.foto_url} alt="" /> : <MiniaturaSinFoto tipo={p.tipo} />}
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

        {/* Leyenda sobre el mapa */}
        <ul className="mapa-leyenda" aria-label="Qué significa cada marcador">
          <li><span className="ley-icono" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svgTipo('habitacion') }} /> Habitación</li>
          <li><span className="ley-icono" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svgTipo('departamento') }} /> Departamento</li>
          {sede && <li><span className="ley-sede" aria-hidden="true" /> Tu sede</li>}
          {radioKm && <li><span className="ley-radio" aria-hidden="true" /> A {radioKm} km de tu sede</li>}
          <li><span className="ley-grupo" aria-hidden="true" /> Varios en un punto</li>
        </ul>
      </div>

      {/* Cómo leer el mapa y, sin «Cerca de mi sede», un atajo para activarlo */}
      <div className="mapa-aviso" role="note">
        <span className="mapa-aviso-icono"><IconoInfo /></span>
        <p className="mapa-aviso-texto">
          {!datos && <><Esqueleto ancho="72%" /><span className="visualmente-oculto">Cargando el mapa</span></>}
          {datos && datos.mostrados < datos.total && <strong>Se muestran los {datos.mostrados} más recientes de {datos.total}. </strong>}
          {datos && 'Cada alojamiento aparece en su dirección o, si no marcó su punto, en el centro de su comuna.'}
          {datos && !sede && <> <Link to="/perfil/editar">Indica tu institución y sede</Link> para verla en el mapa y saber qué queda cerca.</>}
        </p>
        {datos && sede && !radioKm && alActivarCerca && (
          <button type="button" className="mapa-aviso-boton" onClick={alActivarCerca}>Ver solo cerca de mi sede</button>
        )}
      </div>
    </div>
  )
}
