import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import { guardarMemoria, leerMemoria } from '../datos/memoria.js'
import { usePrimeraVez } from '../datos/visitas.js'
import { useAvisoBreve } from '../componentes/AvisoBreve.jsx'
import Buscador from '../componentes/Buscador.jsx'
import Campo from '../componentes/Campo.jsx'
import IlustracionHabitacion from '../componentes/IlustracionHabitacion.jsx'
import { IconoCamara, IconoPersona, IconoUbicacion } from '../componentes/Iconos.jsx'
import '../componentes/mapa.css'
import {
  aPreferencias, aURL, desdePreferencias, desdeURL, EXTRAS_FILTRO, FILTROS_VACIOS, hayFiltros,
  OPCIONES_REGLA, RADIOS_KM, radioDe, REGLAS_FILTRO, sinPreferencias, soloCosto, validarCosto, ZONAS,
} from '../busqueda.js'
import { formatearPesos, GENEROS_PREFERIDOS, textoDe, textoDistancia, TIPOS } from '../publicaciones.js'
import './alojamientos.css'

const TIPOS_FILTRO = [{ valor: '', texto: 'Habitación o departamento' }, ...TIPOS]
const TIPOS_RAPIDOS = [{ valor: '', texto: 'Todos' }, ...TIPOS]

// El mapa (Leaflet) se descarga solo cuando se elige esa vista
const MapaAlojamientos = lazy(() => import('../componentes/MapaAlojamientos.jsx'))

const Svg = ({ children, tamano = 16 }) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
)
const IconoFiltros = () => <Svg tamano={18}><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></Svg>
const IconoCerrar = () => <Svg tamano={18}><path d="M6 6l12 12M18 6L6 18" /></Svg>
const IconoX = () => <Svg tamano={13}><path d="M7 7l10 10M17 7L7 17" /></Svg>
const IconoCama = () => <Svg><path d="M3 6v13M3 15h18M21 19v-6a2 2 0 0 0-2-2h-8v4" /><rect x="5.5" y="10" width="3.5" height="3" rx="1" /></Svg>
const IconoDucha = () => <Svg><path d="M4 20V8a4 4 0 0 1 8 0" /><path d="M9 11h6" /><path d="M10 14v1M12 15v1M14 14v1M11 18v1M13 18v1" /></Svg>
const IconoAuto = () => <Svg><path d="M5 16V12l2-5h10l2 5v4" /><path d="M3 16h18v2H3z" /><circle cx="8" cy="13" r="0.6" /><circle cx="16" cy="13" r="0.6" /></Svg>
const IconoLista = () => <Svg><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></Svg>
const IconoMapa = () => <Svg><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></Svg>

// Lista desplegable con una opción «da lo mismo» con valor vacío (Campo la deja deshabilitada)
function Selector({ etiqueta, nombre, value, onChange, opciones }) {
  return (
    <div className="campo">
      <label htmlFor={nombre}>{etiqueta}</label>
      <select id={nombre} name={nombre} value={value} onChange={onChange}>
        {opciones.map(({ valor, texto }) => <option key={valor} value={valor}>{texto}</option>)}
      </select>
    </div>
  )
}

/**
 * Botones de opción única con una píldora que se desliza a la elegida. Todas las opciones tienen el
 * mismo ancho, así la píldora solo se mueve y nada cambia de tamaño.
 */
function Segmentos({ etiqueta, opciones, valor, alCambiar }) {
  const indice = Math.max(0, opciones.findIndex((o) => o.valor === valor))
  return (
    <div className="al-segmentos" role="group" aria-label={etiqueta} style={{ '--n': opciones.length, '--i': indice }}>
      <span className="al-segmentos-pildora" aria-hidden="true" />
      {opciones.map((o) => (
        <button key={o.valor} type="button" aria-pressed={o.valor === valor} onClick={() => alCambiar(o.valor)}>
          {o.icono}{o.texto}
        </button>
      ))}
    </div>
  )
}

// Tarjeta del listado (CA-09.2). Todas miden lo mismo: la foto se recorta a 4:3 sea cual sea su
// tamaño, el título ocupa siempre dos líneas y los datos van en una sola fila
function TarjetaAlojamiento({ pub, desde, orden }) {
  const principal = pub.fotos.find((f) => f.es_principal) ?? pub.fotos[0]
  const { caracteristicas: c = {} } = pub
  const datos = [
    { clave: 'cupos', icono: <IconoPersona />, texto: `${pub.cupos_disponibles} ${pub.cupos_disponibles === 1 ? 'cupo' : 'cupos'}` },
    c.amoblado && { clave: 'amoblado', icono: <IconoCama />, texto: 'Amoblado' },
    c.banio_privado && { clave: 'banio', icono: <IconoDucha />, texto: 'Baño privado' },
    c.estacionamiento && { clave: 'auto', icono: <IconoAuto />, texto: 'Estacionamiento' },
  ].filter(Boolean)

  return (
    <li className="al-tarjeta" style={{ '--orden': Math.min(orden, 11) }}>
      <div className="al-foto">
        {principal
          ? <img src={principal.url} alt="" loading="lazy" decoding="async"
              ref={(img) => { if (img?.complete && img.naturalWidth) img.setAttribute('data-cargada', '') }}
              onLoad={(e) => e.currentTarget.setAttribute('data-cargada', '')}
              onError={(e) => e.currentTarget.setAttribute('data-cargada', '')} />
          : <IlustracionHabitacion className="al-sin-foto" />}
        <span className="al-insignias">
          <span className="al-insignia">{textoDe(TIPOS, pub.tipo)}</span>
          {pub.es_propia && <span className="al-insignia propia">Tu publicación</span>}
        </span>
        {pub.fotos.length > 1 && (
          <span className="al-fotos-n" title={`${pub.fotos.length} fotos`}><IconoCamara />{pub.fotos.length}</span>
        )}
        {pub.distancia_km != null && <span className="al-distancia">{textoDistancia(pub.distancia_km)}</span>}
      </div>

      <div className="al-cuerpo">
        <div className="al-precio-fila">
          <p className="al-precio">{formatearPesos(pub.costo_mensual)}<span> / mes</span></p>
          {pub.gastos.todos_incluidos && <span className="al-pastilla">Gastos incluidos</span>}
        </div>
        {/* El enlace cubre toda la tarjeta; `desde` permite volver al listado con los filtros */}
        <h3 className="al-titulo">
          <Link to={`/alojamientos/${pub.id}`} state={{ desde }} className="al-enlace">{pub.titulo}</Link>
        </h3>
        <p className="al-lugar"><IconoUbicacion /> <span>{pub.ubicacion.comuna_nombre}, {pub.ubicacion.sector}</span></p>
        <ul className="al-datos" aria-label="Características">
          {datos.map((d) => <li key={d.clave}>{d.icono}{d.texto}</li>)}
          {pub.genero_preferido !== 'indiferente' && (
            <li className="al-dato-genero">{textoDe(GENEROS_PREFERIDOS, pub.genero_preferido)}</li>
          )}
        </ul>
      </div>
    </li>
  )
}

// Mientras llega la primera respuesta: tarjetas silueta del mismo tamaño que las reales
function SiluetaTarjetas({ cantidad = 8 }) {
  return (
    <ul className="al-grilla" aria-hidden="true">
      {Array.from({ length: cantidad }, (_, i) => (
        <li key={i} className="al-tarjeta al-silueta">
          <div className="al-foto" />
          <div className="al-cuerpo">
            <span className="sil" style={{ width: '42%', height: 22 }} />
            <span className="sil" style={{ width: '88%' }} />
            <span className="sil" style={{ width: '64%' }} />
            <span className="sil" style={{ width: '50%', height: 12 }} />
            <span className="sil al-sil-datos" />
          </div>
        </li>
      ))}
    </ul>
  )
}

// Estado vacío: una casa con una lupa que la busca
function IlustracionBusqueda() {
  return (
    <svg className="al-ilustracion" viewBox="0 0 240 170" aria-hidden="true">
      <ellipse className="il-sombra" cx="118" cy="154" rx="90" ry="7" />
      <path className="il-casa" d="M48 152V92l52-38 52 38v60z" />
      <path className="il-techo" d="M36 98l64-48 64 48" />
      <rect className="il-puerta" x="88" y="114" width="24" height="38" rx="5" />
      <rect className="il-ventana" x="62" y="102" width="16" height="16" rx="3" />
      <rect className="il-ventana apagada" x="122" y="102" width="16" height="16" rx="3" />
      <g className="il-lupa">
        <circle className="il-lupa-vidrio" cx="174" cy="66" r="26" />
        <path className="il-lupa-mango" d="M193 86l22 22" />
        <path className="il-lupa-brillo" d="M162 54a16 16 0 0 1 12-5" />
      </g>
    </svg>
  )
}

// HU-09 a HU-12: «Alojamientos», el listado de publicaciones activas con su buscador y filtros
export default function Alojamientos() {
  const [params, setParams] = useSearchParams()
  const { pathname, search } = useLocation()
  const { avisar } = useAvisoBreve()
  // «vista=mapa» va en la dirección para volver igual desde un detalle, pero no es un filtro ni se
  // envía a la API. Ya no hay selector de orden: con «Cerca de mi sede» los resultados se
  // ordenan del más cercano al más lejano; sin él, del más reciente al más antiguo
  const enMapa = params.get('vista') === 'mapa'
  const buscarURL = params.get('buscar') ?? ''
  const filtrosURL = new URLSearchParams(params)
  filtrosURL.delete('vista')
  filtrosURL.delete('orden') // direcciones guardadas de antes, con el orden elegido a mano
  const claveFiltros = filtrosURL.toString()
  const aplicados = desdeURL(params)
  const consultaAPI = new URLSearchParams(filtrosURL)
  if (aplicados.cerca_institucion) consultaAPI.set('orden', 'cercania')
  const clave = consultaAPI.toString()

  const [opciones, setOpciones] = useState(null) // comunas con publicaciones e institución del perfil
  const [borrador, setBorrador] = useState(() => desdeURL(params))
  const [claveBorrador, setClaveBorrador] = useState(claveFiltros)
  const [errores, setErrores] = useState({})
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
  // Resultado de la búsqueda, guardado por su clave (los filtros en la URL). Una búsqueda ya hecha en la
  // sesión aparece al instante; una nueva nunca muestra los resultados de la anterior mientras carga
  const [resultado, setResultado] = useState({ clave: null, datos: null, error: '' })
  const [ocupado, setOcupado] = useState(false)
  const [panelAbierto, setPanelAbierto] = useState(false)
  const listado = useRef(null)
  const panel = useRef(null)

  // Si la dirección cambia (atrás/adelante del navegador), el panel muestra los filtros aplicados
  if (claveBorrador !== claveFiltros) {
    setClaveBorrador(claveFiltros)
    setBorrador(desdeURL(params))
  }

  useEffect(() => {
    const guardadas = leerMemoria('/publicaciones/filtros')
    if (guardadas) setOpciones(guardadas)
    api('/publicaciones/filtros')
      .then((o) => {
        guardarMemoria('/publicaciones/filtros', o)
        setOpciones(o)
      })
      .catch((err) => setMensaje({ tipo: 'alerta', texto: err.message }))
  }, [])

  useEffect(() => {
    let vigente = true // evita mostrar una respuesta vieja si se cambia de filtros rápido
    api(`/publicaciones?${clave}`)
      .then((datos) => {
        if (!vigente) return
        guardarMemoria(`/publicaciones?${clave}`, datos)
        setResultado({ clave, datos, error: '' })
      })
      .catch((err) => {
        if (!vigente) return
        setResultado({ clave, datos: null, error: err.message })
        if (err.errores) setErrores(err.errores)
      })
    return () => {
      vigente = false
    }
  }, [clave])

  // El panel de filtros es un <dialog>: maneja el foco, la tecla Escape y el fondo
  useEffect(() => {
    const d = panel.current
    if (panelAbierto && !d.open) d.showModal()
    if (!panelAbierto && d.open) d.close()
  }, [panelAbierto])

  const cambiar = (e) => {
    const { name, value, type, checked } = e.target
    const nuevo = { ...borrador, [name]: type === 'checkbox' ? checked : value }
    // «Cerca de mi sede» reemplaza la lista de comunas, que se oculta
    if (name === 'cerca_institucion' && checked) nuevo.comunas = []
    setBorrador(nuevo)
    setErrores({ ...errores, [name]: undefined })
  }

  const alternarComunas = (ids, marcar) => {
    const resto = borrador.comunas.filter((id) => !ids.includes(id))
    setBorrador({ ...borrador, comunas: marcar ? [...resto, ...ids] : resto })
  }

  // Aplica filtros (o cambia de página) manteniendo la búsqueda y la vista elegidas
  const ir = (filtros, { pagina = 1, buscar = buscarURL } = {}) => {
    const destino = aURL(filtros, pagina)
    if (buscar) destino.set('buscar', buscar)
    if (enMapa) destino.set('vista', 'mapa')
    setParams(destino)
    if (pagina > 1 || window.scrollY > (listado.current?.offsetTop ?? 0)) {
      listado.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }
  }

  const cambiarVista = (mapa) => {
    const nuevos = new URLSearchParams(params)
    if (mapa) {
      nuevos.set('vista', 'mapa')
      nuevos.delete('pagina') // el mapa muestra todos los resultados juntos
    } else {
      nuevos.delete('vista')
    }
    setParams(nuevos, { replace: true })
  }

  const aplicar = (e) => {
    e.preventDefault()
    setMensaje({ tipo: '', texto: '' })
    const encontrados = validarCosto(borrador)
    setErrores(encontrados)
    if (Object.keys(encontrados).length) return // CA-10.3: el filtro no se aplica
    ir(borrador)
    setPanelAbierto(false)
  }

  // CA-10.5: vuelve el listado completo (también sin la búsqueda escrita)
  const limpiar = () => {
    setBorrador(FILTROS_VACIOS)
    setErrores({})
    setMensaje({ tipo: '', texto: '' })
    ir(FILTROS_VACIOS, { buscar: '' })
    setPanelAbierto(false)
  }

  // Cerrar sin aplicar: el panel vuelve a los filtros que están aplicados
  const cerrarPanel = () => {
    setPanelAbierto(false)
    setBorrador(desdeURL(params))
    setErrores({})
  }

  const usarPreferencias = async () => {
    setOcupado(true)
    setMensaje({ tipo: '', texto: '' })
    try {
      const preferencias = await api('/perfil/preferencias-busqueda')
      if (sinPreferencias(preferencias)) {
        setMensaje({
          tipo: 'alerta',
          texto: 'Aún no guardas preferencias. Elige tus filtros y presiona «Guardar como mis preferencias».',
        })
        return
      }
      // CA-12.2: se completan los filtros, pero se busca recién al presionar «Ver alojamientos»
      const disponibles = new Set(opciones?.comunas.map((c) => c.id))
      const filtros = desdePreferencias(preferencias)
      setBorrador({ ...filtros, comunas: filtros.comunas.filter((id) => disponibles.has(id)) })
      setErrores({})
      setMensaje({ tipo: 'exito', texto: 'Cargamos tus preferencias. Ajústalas si quieres y presiona «Ver alojamientos».' })
    } catch (err) {
      setMensaje({ tipo: 'alerta', texto: err.message })
    } finally {
      setOcupado(false)
    }
  }

  const guardarPreferencias = async () => {
    const encontrados = validarCosto(borrador)
    setErrores(encontrados)
    if (Object.keys(encontrados).length) return
    setOcupado(true)
    try {
      await api('/perfil/preferencias-busqueda', { metodo: 'PUT', datos: aPreferencias(borrador) })
      setMensaje({ tipo: '', texto: '' })
      avisar('Guardamos estos filtros como tus preferencias')
    } catch (err) {
      setErrores(err.errores ?? {})
      setMensaje({ tipo: 'alerta', texto: err.message })
    } finally {
      setOcupado(false)
    }
  }

  const cargando = resultado.clave !== clave
  // Lo de esta búsqueda: su respuesta, o lo guardado de una vez anterior. Nunca lo de otra búsqueda
  const datos = cargando ? (leerMemoria(`/publicaciones?${clave}`) ?? null) : resultado.datos
  const conFiltros = hayFiltros(filtrosURL)
  const institucion = opciones?.institucion
  const zonas = ZONAS.map((zona) => ({
    ...zona,
    comunas: opciones?.comunas.filter((c) => c.sector === zona.valor) ?? [],
  })).filter((zona) => zona.comunas.length)
  const nombreComuna = (id) => opciones?.comunas.find((c) => c.id === id)?.nombre ?? 'Comuna'

  // Filtros aplicados como chips que se quitan de a uno (la búsqueda y el tipo tienen su control a la vista)
  const pesos = (v) => formatearPesos(Number(v))
  const chips = [
    (aplicados.costo_min || aplicados.costo_max) && {
      id: 'costo',
      texto: aplicados.costo_min && aplicados.costo_max ? `${pesos(aplicados.costo_min)} a ${pesos(aplicados.costo_max)}`
        : aplicados.costo_min ? `Desde ${pesos(aplicados.costo_min)}` : `Hasta ${pesos(aplicados.costo_max)}`,
      quitar: { costo_min: '', costo_max: '' },
    },
    aplicados.cerca_institucion && {
      id: 'cerca', texto: `A ${radioDe(aplicados)} km de ${institucion?.sigla ?? 'mi sede'}`, quitar: { cerca_institucion: false, radio_km: '' },
    },
    ...aplicados.comunas.map((id) => ({
      id: `comuna-${id}`, texto: nombreComuna(id), quitar: { comunas: aplicados.comunas.filter((c) => c !== id) },
    })),
    ...REGLAS_FILTRO.filter((r) => aplicados[r.clave]).map((r) => ({
      id: r.clave, texto: `${r.texto}: ${textoDe(OPCIONES_REGLA, aplicados[r.clave]).toLowerCase()}`, quitar: { [r.clave]: '' },
    })),
    ...EXTRAS_FILTRO.filter((x) => aplicados[x.clave]).map((x) => ({ id: x.clave, texto: x.texto, quitar: { [x.clave]: false } })),
  ].filter(Boolean)

  const total = datos?.total
  // La entrada de la página solo la primera vez que se abre en la sesión
  const primeraVez = usePrimeraVez('alojamientos')
  const textoTotal = total == null ? 'Buscando alojamientos…'
    : `${total === 1 ? '1 alojamiento' : `${total.toLocaleString('es-CL')} alojamientos`}${conFiltros ? ' con tu búsqueda' : ' disponibles'}`

  return (
    <main className="al-pagina" data-repetida={!primeraVez || undefined}>
      <header className="al-encabezado">
        <div>
          <h1>Alojamientos</h1>
          <p className="al-subtitulo" aria-live="polite">{textoTotal}</p>
        </div>
        <Segmentos etiqueta="Cómo ver los resultados" valor={enMapa ? 'mapa' : 'lista'}
          alCambiar={(v) => cambiarVista(v === 'mapa')}
          opciones={[{ valor: 'lista', texto: 'Lista', icono: <IconoLista /> }, { valor: 'mapa', texto: 'Mapa', icono: <IconoMapa /> }]} />
      </header>

      {/* Barra de búsqueda: texto libre, tipo y filtros, todo a la vista */}
      <section className="al-barra" aria-label="Buscar y filtrar">
        <div className="al-barra-buscar">
          <Buscador valor={buscarURL} etiqueta="Buscar alojamientos" placeholder="Busca por título, comuna o sector"
            alBuscar={(texto) => ir(aplicados, { buscar: texto })} />
        </div>
        <Segmentos etiqueta="Tipo de alojamiento" opciones={TIPOS_RAPIDOS} valor={aplicados.tipo_alojamiento}
          alCambiar={(v) => ir({ ...aplicados, tipo_alojamiento: v })} />
        <button type="button" className="al-boton-filtros" onClick={() => setPanelAbierto(true)} aria-haspopup="dialog">
          <IconoFiltros /> Filtros
          {chips.length > 0 && <span key={chips.length} className="al-contador" aria-label={`${chips.length} aplicados`}>{chips.length}</span>}
        </button>
      </section>

      {/* La fila de chips está siempre, aunque esté vacía: así el listado no salta al filtrar */}
      <div className="al-chips" aria-label="Filtros aplicados">
        {chips.length === 0 ? (
          <span className="al-chips-ninguno">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 7.5h0" />
            </svg>
            {opciones && !institucion
              ? <span><Link to="/perfil/editar">Indica tu institución y sede</Link> para ver los alojamientos cerca de tu sede.</span>
              : 'Sin filtros: estás viendo todos los alojamientos, los más recientes primero.'}
          </span>
        ) : (
          <>
            {chips.map((c) => (
              <button key={c.id} type="button" className="al-chip" onClick={() => ir({ ...aplicados, ...c.quitar })}
                aria-label={`Quitar filtro ${c.texto}`}>
                {c.texto} <IconoX />
              </button>
            ))}
            <button type="button" className="al-chips-limpiar" onClick={limpiar}>Limpiar todo</button>
          </>
        )}
      </div>

      <section ref={listado} className="al-resultados" aria-labelledby="titulo-resultados" aria-busy={cargando}>
        <h2 id="titulo-resultados" className="visualmente-oculto">Resultados</h2>

        {resultado.error && !cargando && <p className="alerta" role="alert">{resultado.error}</p>}
        {!datos && !(resultado.error && !cargando) && (
          <div className="esq-zona-bloque" role="status" aria-label="Buscando alojamientos">
            {enMapa ? <div className="al-mapa-silueta sil" /> : <SiluetaTarjetas />}
          </div>
        )}

        {datos && datos.total === 0 && (
          <div className="al-vacio">
            <IlustracionBusqueda />
            {!conFiltros ? (
              <><h3>No hay alojamientos disponibles por ahora</h3><p>Vuelve pronto: aparecen apenas alguien publica.</p></> // CA-09.4
            ) : soloCosto(filtrosURL) ? (
              <><h3>No encontramos alojamientos en ese rango</h3><p>Prueba ampliando el rango de precios.</p></> // CA-10.4
            ) : (
              <><h3>No encontramos alojamientos con esa búsqueda</h3><p>Prueba con otras palabras o quitando algún filtro.</p></> // CA-11.5 y CA-12.4
            )}
            {conFiltros && <button type="button" className="boton secundario" onClick={limpiar}>Limpiar filtros</button>}
          </div>
        )}

        {datos && datos.total > 0 && enMapa && (
          <div className="al-vista">
            <Suspense fallback={<div className="al-mapa-silueta sil" />}>
              <MapaAlojamientos consulta={claveFiltros} desde={pathname + search}
                alActivarCerca={() => ir({ ...aplicados, cerca_institucion: true, comunas: [] })} />
            </Suspense>
          </div>
        )}

        {datos && datos.total > 0 && !enMapa && (
          // La clave vuelve a montar la grilla con cada búsqueda: las tarjetas nuevas entran en cascada corta
          <ul key={clave} className="al-grilla">
            {datos.resultados.map((pub, i) => (
              <TarjetaAlojamiento key={pub.id} pub={pub} desde={pathname + search} orden={i} />
            ))}
          </ul>
        )}

        {datos && !enMapa && datos.paginas > 1 && (
          <nav className="al-paginacion" aria-label="Páginas de resultados">
            <button type="button" disabled={datos.pagina <= 1} onClick={() => ir(aplicados, { pagina: datos.pagina - 1 })}>
              Anterior
            </button>
            <span>Página <strong>{datos.pagina}</strong> de {datos.paginas}</span>
            <button type="button" disabled={datos.pagina >= datos.paginas} onClick={() => ir(aplicados, { pagina: datos.pagina + 1 })}>
              Siguiente
            </button>
          </nav>
        )}
      </section>

      {/* Panel lateral con todos los filtros (HU-10 a HU-12) */}
      <dialog ref={panel} className="al-panel" aria-labelledby="titulo-filtros"
        onCancel={(e) => { e.preventDefault(); cerrarPanel() }}
        onClick={(e) => e.target === e.currentTarget && cerrarPanel()}>
        <form className="al-panel-form" onSubmit={aplicar} noValidate>
          <header className="al-panel-cabeza">
            <h2 id="titulo-filtros">Filtros</h2>
            <button type="button" className="al-panel-cerrar" onClick={cerrarPanel} aria-label="Cerrar sin aplicar"><IconoCerrar /></button>
          </header>

          <div className="al-panel-cuerpo">
            <button type="button" className="al-preferencias" onClick={usarPreferencias} disabled={ocupado}>
              Usar mis preferencias guardadas
            </button>

            {/* HU-10 */}
            <fieldset>
              <legend>Costo mensual</legend>
              <div className="fila">
                <Campo etiqueta="Mínimo" nombre="costo_min" value={borrador.costo_min} onChange={cambiar}
                  error={errores.costo_min} inputMode="numeric" placeholder="0" />
                <Campo etiqueta="Máximo" nombre="costo_max" value={borrador.costo_max} onChange={cambiar}
                  error={errores.costo_max} inputMode="numeric" placeholder="Sin tope" />
              </div>
            </fieldset>

            {/* HU-11. CA-11.2: solo comunas que tienen publicaciones activas */}
            <fieldset>
              <legend>Ubicación</legend>
              <label className="casilla">
                <input type="checkbox" name="cerca_institucion" checked={borrador.cerca_institucion}
                  onChange={cambiar} disabled={!institucion} />
                Cerca de mi sede{institucion && ` (${institucion.sigla})`}
              </label>
              {errores.cerca_institucion && <p className="campo-error">{errores.cerca_institucion}</p>}
              {opciones && !institucion && (
                <p className="campo-ayuda"><Link to="/perfil/editar">Indica tu institución en tu perfil</Link> para usar esta opción.</p>
              )}
              {borrador.cerca_institucion && (
                <div className="al-radio">
                  <Segmentos etiqueta="Distancia máxima a tu sede" valor={radioDe(borrador)}
                    opciones={RADIOS_KM.map((km) => ({ valor: km, texto: `${km} km` }))}
                    alCambiar={(km) => setBorrador({ ...borrador, radio_km: String(km) })} />
                  <p className="campo-ayuda">
                    Alojamientos a {radioDe(borrador)} km o menos de tu sede, en línea recta. En el mapa es el círculo.
                  </p>
                </div>
              )}

              {!borrador.cerca_institucion && zonas.map((zona) => {
                const ids = zona.comunas.map((c) => c.id)
                const todas = ids.every((id) => borrador.comunas.includes(id))
                return (
                  <div key={zona.valor} className="al-zona">
                    <label className="casilla zona">
                      <input type="checkbox" checked={todas} onChange={(e) => alternarComunas(ids, e.target.checked)} />
                      {zona.texto}
                    </label>
                    <div className="al-comunas">
                      {zona.comunas.map((c) => (
                        <label key={c.id} className="al-comuna">
                          <input type="checkbox" checked={borrador.comunas.includes(c.id)}
                            onChange={(e) => alternarComunas([c.id], e.target.checked)} />
                          <span>{c.nombre} <small>{c.cantidad}</small></span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
              {errores.comunas && <p className="campo-error">{errores.comunas}</p>}
            </fieldset>

            {/* HU-12 */}
            <fieldset>
              <legend>Preferencias</legend>
              <Selector etiqueta="Tipo de alojamiento" nombre="tipo_alojamiento" value={borrador.tipo_alojamiento}
                onChange={cambiar} opciones={TIPOS_FILTRO} />
              <div className="al-reglas">
                {REGLAS_FILTRO.map(({ clave: regla, texto }) => (
                  <Selector key={regla} etiqueta={texto} nombre={regla} value={borrador[regla]} onChange={cambiar}
                    opciones={OPCIONES_REGLA} />
                ))}
              </div>
              <div className="al-comunas">
                {EXTRAS_FILTRO.map(({ clave: extra, texto }) => (
                  <label key={extra} className="al-comuna">
                    <input type="checkbox" name={extra} checked={borrador[extra]} onChange={cambiar} />
                    <span>{texto}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {mensaje.texto && (
              <p className={mensaje.tipo} role={mensaje.tipo === 'alerta' ? 'alert' : 'status'}>{mensaje.texto}</p>
            )}
            <button type="button" className="enlace-boton" onClick={guardarPreferencias} disabled={ocupado}>
              Guardar como mis preferencias
            </button>
          </div>

          <footer className="al-panel-pie">
            <button type="button" className="boton secundario" onClick={limpiar}>Limpiar</button>
            <button type="submit" className="boton">Ver alojamientos</button>
          </footer>
        </form>
      </dialog>
    </main>
  )
}
