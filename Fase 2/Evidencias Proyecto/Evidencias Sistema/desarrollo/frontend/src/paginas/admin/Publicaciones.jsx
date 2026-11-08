import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../api.js'
import Avatar from '../../componentes/Avatar.jsx'
import { formatearPesos, textoDe, TIPOS } from '../../publicaciones.js'
import { ESTADOS_PUBLICACION, textoPublicacion } from './datos.js'
import Paginacion from './Paginacion.jsx'
import './reportes.css'
import Buscador from './ui/Buscador.jsx'
import {
  BarraFiltros, ChipEstado, EncabezadoAdmin, EstadoVacio, ICONOS_ESTADO, ImagenSuave, PaginaAdmin, TarjetaKpi,
} from './ui/componentes.jsx'
import { CampoDesplegable } from './ui/Desplegable.jsx'
import { fecha, nombrePropio, partesNombre } from './ui/formato.js'

const IconoBandera = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
  </svg>
)
const IconoCasa = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 11l8-6.5 8 6.5V20H4z" /><path d="M10 20v-5h4v5" />
  </svg>
)
const IconoRevisar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5M8.5 11h5M11 8.5v5" />
  </svg>
)

// Sin fotos: una habitación dibujada con los colores de la marca
const SinFoto = () => (
  <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="320" height="200" fill="#e2ecef" />
    <rect y="150" width="320" height="50" fill="#cfdde2" />
    <rect x="196" y="46" width="78" height="62" rx="4" fill="#fff" />
    <rect x="40" y="112" width="120" height="40" rx="8" fill="#477c8b" />
    <rect x="40" y="96" width="34" height="26" rx="6" fill="#91b3b9" />
    <rect x="180" y="118" width="52" height="34" rx="4" fill="#245568" />
  </svg>
)

// Filtros rápidos del resumen
const RAPIDOS = [
  { clave: 'total', etiqueta: 'Publicaciones', filtro: {}, icono: <IconoCasa />, tono: 'acento' },
  { clave: 'activas', etiqueta: 'Visibles', filtro: { estado: 'activa' }, icono: ICONOS_ESTADO.ojo, tono: 'ok' },
  { clave: 'con_reportes', etiqueta: 'Con reportes', filtro: { reportadas: 'true' }, icono: <IconoBandera />, tono: 'vino' },
  { clave: 'ocultas', etiqueta: 'Ocultas', filtro: { estado: 'suspendida' }, icono: ICONOS_ESTADO.oculto, tono: 'violeta' },
]

// Foto con fundido al cargar; sin foto, o si no carga, el dibujo de «sin foto» (nunca una imagen rota)
function FotoPublicacion({ url }) {
  const [fallo, setFallo] = useState(false)
  return url && !fallo ? <ImagenSuave src={url} loading="lazy" alFallar={() => setFallo(true)} /> : <SinFoto />
}

// Tarjetas de silueta mientras carga: mismo tamaño que las reales (sin spinner)
const SILUETAS = Array.from({ length: 6 }, (_, i) => i)
function TarjetaSilueta() {
  return (
    <li className="a-pub a-pub-silueta" aria-hidden="true">
      <div className="a-pub-foto" />
      <div className="a-pub-cuerpo">
        <span className="a-silueta-linea corta" />
        <span className="a-silueta-linea" />
        <span className="a-silueta-persona"><span /><span /></span>
      </div>
    </li>
  )
}

/**
 * Tarjeta de moderación: lo que se destaca es lo que hay que revisar (estado, reportes, quién
 * publica y cuándo), no el precio, que va al final y en pequeño.
 */
function TarjetaPublicacion({ p, volver }) {
  const { nombre, apellido } = partesNombre(p.oferente ?? '')
  const editada = p.fecha_ultima_modificacion && p.fecha_ultima_modificacion !== p.fecha_publicacion
  return (
    <li className="a-pub" data-estado={p.estado} data-reportada={p.cantidad_reportes > 0 || undefined}>
      <div className="a-pub-foto">
        <FotoPublicacion url={p.foto_url} />
        <span className="a-pub-estado"><ChipEstado tipo="publicacion" valor={p.estado}>{textoPublicacion(p.estado)}</ChipEstado></span>
        {p.cantidad_reportes > 0 && (
          <span className="a-pub-reportes"><IconoBandera /> {p.cantidad_reportes} {p.cantidad_reportes === 1 ? 'reporte' : 'reportes'}</span>
        )}
      </div>
      <div className="a-pub-cuerpo">
        <p className="a-pub-meta">{[p.tipo && textoDe(TIPOS, p.tipo), p.comuna].filter(Boolean).join(' · ')}</p>
        <h2 className="a-pub-titulo">{p.titulo}</h2>
        <div className="a-pub-oferente">
          {p.oferente ? (
            <>
              <Avatar nombre={nombre} apellido={apellido} foto={p.oferente_foto} tamano={30} />
              <span>
                {p.oferente_id
                  ? <Link to={`/admin/usuarios/${p.oferente_id}`} state={{ volver }}>{nombrePropio(p.oferente)}</Link>
                  : nombrePropio(p.oferente)}
                <span className="a-tabla-sub">
                  Publicó el {fecha.format(new Date(p.fecha_publicacion))}
                  {editada && ` · editada el ${fecha.format(new Date(p.fecha_ultima_modificacion))}`}
                </span>
              </span>
            </>
          ) : <em className="a-tabla-sub">La cuenta del oferente ya no existe</em>}
        </div>
      </div>
      <div className="a-pub-pie">
        <span className="a-pub-precio">{formatearPesos(p.costo_mensual)} <small>/ mes</small></span>
        <Link to={`/admin/publicaciones/${p.id}`} state={{ volver }} className={`a-boton${p.cantidad_reportes > 0 ? ' primario' : ''}`}
          aria-label={`Revisar «${p.titulo}»`}>
          <IconoRevisar /> Revisar
        </Link>
      </div>
    </li>
  )
}

// HU-29: «Publicaciones» del administrador. Las eliminadas también aparecen (CA-29.4). El buscador,
// los filtros, el orden y la página van en la dirección para que «volver» regrese al mismo listado
export default function Publicaciones() {
  const [parametros, setParametros] = useSearchParams()
  const consulta = parametros.toString()
  const [comunas, setComunas] = useState([])
  const [cargado, setCargado] = useState({ consulta: null, datos: null, error: '' })

  useEffect(() => {
    api('/catalogos/publicacion').then(({ comunas: lista }) => setComunas(lista)).catch(() => {})
  }, [])

  useEffect(() => {
    api(`/admin/publicaciones${consulta ? `?${consulta}` : ''}`)
      .then((datos) => setCargado({ consulta, datos, error: '' }))
      .catch((err) => setCargado({ consulta, datos: null, error: err.message }))
  }, [consulta])

  const { datos, error } = cargado
  const actualizando = cargado.consulta !== consulta

  // Cambiar el buscador o un filtro vuelve a la primera página
  const aplicar = (cambios) => {
    const nuevos = new URLSearchParams(parametros)
    nuevos.delete('pagina')
    Object.entries(cambios).forEach(([clave, valor]) => (valor ? nuevos.set(clave, valor) : nuevos.delete(clave)))
    setParametros(nuevos, { replace: true })
  }
  const irAPagina = (pagina) => {
    const nuevos = new URLSearchParams(parametros)
    if (pagina > 1) nuevos.set('pagina', String(pagina))
    else nuevos.delete('pagina')
    setParametros(nuevos)
  }

  const buscar = parametros.get('buscar') ?? ''
  const estado = parametros.get('estado') ?? ''
  const comuna = parametros.get('comuna') ?? ''
  const orden = parametros.get('orden') ?? ''
  const reportadas = parametros.get('reportadas') ?? ''
  const nombreComuna = comunas.find((c) => c.id === comuna)?.nombre
  const activos = [
    buscar && { clave: 'buscar', texto: `Búsqueda: «${buscar}»`, quitar: () => aplicar({ buscar: '' }) },
    estado && { clave: 'estado', texto: `Estado: ${textoPublicacion(estado)}`, quitar: () => aplicar({ estado: '' }) },
    comuna && { clave: 'comuna', texto: `Comuna: ${nombreComuna ?? '…'}`, quitar: () => aplicar({ comuna: '' }) },
    reportadas && { clave: 'reportadas', texto: 'Con reportes', quitar: () => aplicar({ reportadas: '' }) },
    orden && { clave: 'orden', texto: 'Orden: más reportes', quitar: () => aplicar({ orden: '' }) },
  ].filter(Boolean)
  const limpiar = () => aplicar({ buscar: '', estado: '', comuna: '', orden: '', reportadas: '' })
  const elegido = (r) => {
    const aplicados = { ...(estado && { estado }), ...(reportadas && { reportadas }) }
    return JSON.stringify(aplicados) === JSON.stringify(r.filtro)
  }
  const volver = `/admin/publicaciones?${consulta}`

  return (
    <PaginaAdmin>
      <EncabezadoAdmin grupo="Gestión" titulo="Publicaciones"
        descripcion="Supervisa los alojamientos publicados, incluidos los ocultos y eliminados." />

      <div className="a-kpis" role="group" aria-label="Filtros rápidos">
        {RAPIDOS.map((r) => (
          <TarjetaKpi key={r.clave} etiqueta={r.etiqueta} icono={r.icono} tono={r.tono}
            valor={datos?.resumen ? datos.resumen[r.clave] : '…'} elegida={elegido(r)}
            alElegir={() => aplicar({ estado: '', reportadas: '', ...r.filtro })} />
        ))}
      </div>

      <BarraFiltros etiqueta="Buscar y filtrar publicaciones" activos={activos} alLimpiar={limpiar}>
        <Buscador etiqueta="Título u oferente" valor={buscar} alBuscar={(v) => aplicar({ buscar: v })}
          placeholder="Buscar por título u oferente" />
        <CampoDesplegable etiqueta="Estado" valor={estado}
          alCambiar={(v) => aplicar({ estado: v })} opciones={[{ valor: '', texto: 'Todos' }, ...ESTADOS_PUBLICACION]} />
        <CampoDesplegable etiqueta="Comuna" valor={comuna} alCambiar={(v) => aplicar({ comuna: v })}
          opciones={[{ valor: '', texto: 'Todas' }, ...comunas.map(({ id, nombre }) => ({ valor: id, texto: nombre }))]} />
        <CampoDesplegable etiqueta="Ordenar por" valor={orden} alCambiar={(v) => aplicar({ orden: v })}
          opciones={[{ valor: '', texto: 'Más recientes' }, { valor: 'reportes', texto: 'Más reportes' }]} />
      </BarraFiltros>

      {error && <p className="alerta" role="alert">{error}</p>}

      {datos?.resultados.length === 0 && (
        activos.length
          ? <EstadoVacio ilustracion="buscar" titulo="Ninguna publicación coincide" texto="Prueba con otro título, estado o comuna."
              accion={<button type="button" className="a-boton" onClick={limpiar}>Quitar filtros</button>} />
          : <EstadoVacio ilustracion="buscar" titulo="Aún no hay publicaciones" texto="Cuando un estudiante publique un alojamiento, aparecerá aquí." />
      )}

      {/* Mientras carga, la grilla ya está en su lugar con tarjetas de silueta */}
      {!error && (!datos || datos.resultados.length > 0) && (
        <div className="a-listado" data-actualizando={actualizando || undefined} aria-busy={!datos || actualizando}
          data-animar="grilla" data-cargando={!datos || undefined}>
          <p className="a-conteo" role="status">
            {datos ? `${datos.total} ${datos.total === 1 ? 'publicación' : 'publicaciones'}${activos.length ? ' con estos filtros' : ''}` : 'Cargando publicaciones…'}
          </p>
          <ul className="a-pubs" aria-label="Publicaciones">
            {datos ? datos.resultados.map((p) => <TarjetaPublicacion key={p.id} p={p} volver={volver} />)
              : SILUETAS.map((i) => <TarjetaSilueta key={i} />)}
          </ul>
        </div>
      )}

      {datos && <Paginacion datos={datos} irAPagina={irAPagina} etiqueta="Páginas de publicaciones" />}
    </PaginaAdmin>
  )
}
