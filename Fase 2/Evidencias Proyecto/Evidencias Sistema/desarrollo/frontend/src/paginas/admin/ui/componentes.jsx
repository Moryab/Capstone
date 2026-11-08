import { useState } from 'react'
import { mayusculaInicial } from '../../../inicio/utilidades.js'
import { useResumenAdmin } from '../../../marco/ResumenAdmin.jsx'
import { useSesion } from '../../../sesion/SesionContext.jsx'
import './admin.css'
import { useCifraAnimada, useLatido } from './animaciones.js'

/*
 * Piezas compartidas del panel de administración, para que las cinco páginas se vean iguales:
 * página a todo el ancho, encabezado, barra de filtros, tabla, chip de estado, estado vacío y
 * tarjeta KPI. Los colores salen de los tokens --a-* (admin.css), que también tienen tema oscuro.
 */

const Svg = ({ children, className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)
export const ICONOS_ESTADO = {
  check: <Svg><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>,
  reloj: <Svg><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>,
  vacio: <Svg><circle cx="12" cy="12" r="7.5" /></Svg>,
  x: <Svg><path d="M7 7l10 10M17 7L7 17" /></Svg>,
  prohibido: <Svg><circle cx="12" cy="12" r="8.5" /><path d="M6 6l12 12" /></Svg>,
  ojo: <Svg><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></Svg>,
  oculto: <Svg><path d="M3 3l18 18M10.6 5.6A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.2 6.9C3.8 8.6 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.6 0 3-.4 4.2-1" /></Svg>,
  pausa: <Svg><path d="M9 6.5v11M15 6.5v11" /></Svg>,
  lupa: <Svg><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></Svg>,
  lleno: <Svg><path d="M4 18h16M6 18V9l6-4 6 4v9" /><path d="M10 18v-5h4v5" /></Svg>,
}

/*
 * Tono e ícono de cada estado, por tipo. El texto lo pone quien usa el chip (sale de datos.js y
 * reportes.js), así el estado se lee siempre en palabras, no solo por el color
 */
const ESTADOS = {
  verificacion: {
    verificado: ['ok', 'check'],
    pendiente: ['espera', 'reloj'],
    no_verificado: ['neutro', 'vacio'],
    rechazado: ['error', 'x'],
    revocado: ['vino', 'prohibido'],
  },
  solicitud: {
    pendiente: ['espera', 'reloj'],
    en_revision: ['info', 'lupa'],
    aprobada: ['ok', 'check'],
    rechazada: ['error', 'x'],
  },
  reporte: {
    pendiente: ['espera', 'reloj'],
    en_revision: ['info', 'lupa'],
    resuelto: ['ok', 'check'],
    descartado: ['neutro', 'x'],
  },
  publicacion: {
    activa: ['ok', 'ojo'],
    completa: ['info', 'lleno'],
    pausada: ['espera', 'pausa'],
    suspendida: ['violeta', 'oculto'], // oculta por moderación
    eliminada: ['error', 'x'],
  },
}

/**
 * Chip de estado: color + ícono + texto. La cuenta (activa, suspendida…) usa otro estilo, un punto
 * de color, para no confundirse con la verificación cuando van en la misma fila.
 */
export function ChipEstado({ tipo, valor, children }) {
  // Si el estado cambia en pantalla (al aprobar, tomar un reporte…), el chip late una vez
  const ref = useLatido(valor, { escala: 0.85 })
  if (tipo === 'cuenta') {
    const tono = { activa: 'ok', suspendida: 'error', eliminada: 'neutro' }[valor] ?? 'neutro'
    return <span ref={ref} className="a-punto" data-tono={tono}><span aria-hidden="true" />{children}</span>
  }
  const [tono, icono] = ESTADOS[tipo]?.[valor] ?? ['neutro', 'vacio']
  return <span ref={ref} className="a-chip" data-tono={tono}>{ICONOS_ESTADO[icono]}{children}</span>
}

const ICONOS_ROL = {
  buscador: <Svg><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></Svg>,
  oferente: <Svg><path d="M4 11l8-6.5 8 6.5V20H4z" /><path d="M10 20v-5h4v5" /></Svg>,
}
/** Rol del estudiante: buscador (busca alojamiento) u oferente (lo ofrece), con ícono y texto */
export function EtiquetaRol({ modo }) {
  return (
    <span className="a-rol" data-modo={modo ?? 'ninguno'}>
      {ICONOS_ROL[modo]}{modo === 'buscador' ? 'Buscador' : modo === 'oferente' ? 'Oferente' : 'Sin elegir'}
    </span>
  )
}

// Contenedor de cada página del admin: usa todo el ancho que deja la barra lateral
// La entrada al cambiar de pestaña la hace el marco (transicion.js) con los bloques `data-animar`
export function PaginaAdmin({ children, className = '' }) {
  return <main className={`a-pagina ${className}`.trim()}>{children}</main>
}

const saludoSegunHora = () => {
  const hora = new Date().getHours()
  if (hora >= 5 && hora < 12) return 'Buenos días'
  if (hora >= 12 && hora < 20) return 'Buenas tardes'
  return 'Buenas noches'
}
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`

// «2 verificaciones y 1 reporte esperan revisión», desde el resumen de la barra lateral
export function textoPendientes(resumen) {
  if (!resumen) return 'Revisando lo pendiente…'
  const partes = [
    resumen.verificaciones_pendientes > 0 && plural(resumen.verificaciones_pendientes, 'verificación', 'verificaciones'),
    resumen.reportes_pendientes > 0 && plural(resumen.reportes_pendientes, 'reporte', 'reportes'),
  ].filter(Boolean)
  if (partes.length === 0) return 'No hay nada pendiente: todo está al día.'
  const total = resumen.verificaciones_pendientes + resumen.reportes_pendientes
  return `${partes.join(' y ')} ${total === 1 ? 'espera' : 'esperan'} revisión.`
}

/**
 * Encabezado de página. Con `saludo`, en vez del título muestra «Buenas tardes, Ana» y el resumen de
 * lo pendiente (el panel de inicio). `grupo` es la sección de la barra lateral (Moderación, Gestión…)
 */
export function EncabezadoAdmin({ grupo, titulo, descripcion, acciones, saludo = false, volver }) {
  const { usuario } = useSesion()
  const { resumen } = useResumenAdmin()
  return (
    <header className="a-encabezado" data-animar="titulo">
      <div className="a-encabezado-texto">
        {volver}
        {grupo && <p className="a-ojo">{grupo}</p>}
        <h1>{saludo ? `${saludoSegunHora()}, ${mayusculaInicial(usuario.nombre)}` : titulo}</h1>
        {saludo ? <p className="a-descripcion" aria-live="polite">{textoPendientes(resumen)}</p>
          : descripcion && <p className="a-descripcion">{descripcion}</p>}
      </div>
      {acciones && <div className="a-encabezado-acciones">{acciones}</div>}
    </header>
  )
}

/**
 * Barra de filtros: los controles van en `children`. `activos` son los filtros aplicados, que se
 * muestran como chips con «×» para quitarlos de a uno. La fila de chips está siempre (sin filtros
 * dice «Ninguno»): así, al aplicar el primero, la tabla de abajo no se desplaza.
 */
export function BarraFiltros({ children, activos = [], alLimpiar, etiqueta = 'Filtros', className = '', mostrarActivos = true }) {
  return (
    <section className={`a-filtros ${className}`.trim()} aria-label={etiqueta} data-animar="tarjeta">
      <div className="a-filtros-controles">{children}</div>
      {mostrarActivos && (
        <div className="a-filtros-activos">
          <span className="a-filtros-titulo">Filtros activos</span>
          {activos.length === 0 && <span className="a-filtros-ninguno">Ninguno</span>}
          <ul>
            {activos.map((f) => (
              <li key={f.clave}>
                <button type="button" className="a-filtro-chip" onClick={f.quitar} aria-label={`Quitar filtro ${f.texto}`}>
                  {f.texto} <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
          </ul>
          {activos.length > 1 && alLimpiar && (
            <button type="button" className="a-enlace" onClick={alLimpiar}>Limpiar todo</button>
          )}
        </div>
      )}
    </section>
  )
}

// Tabla con encabezado fijo al hacer scroll. `etiqueta` describe la tabla para el lector de pantalla
/**
 * `columnas`: ancho de cada columna ('20%', '150px' o null para «lo que sobre»). Con columnas fijas
 * la tabla no se reacomoda al filtrar o al cambiar de página: cada columna queda siempre en su lugar.
 */
export function TablaAdmin({ etiqueta, columnas, children }) {
  return (
    <div className="a-tabla-zona">
      <table className="a-tabla" aria-label={etiqueta} data-fija={columnas ? '' : undefined}>
        {columnas && <colgroup>{columnas.map((ancho, i) => <col key={i} style={ancho ? { width: ancho } : undefined} />)}</colgroup>}
        {children}
      </table>
    </div>
  )
}

const ILUSTRACIONES = {
  // Bandeja con un check: «todo al día»
  aldia: (
    <svg viewBox="0 0 120 96" aria-hidden="true">
      <ellipse cx="60" cy="86" rx="40" ry="5" className="a-ilu-sombra" />
      <rect x="22" y="30" width="76" height="50" rx="12" className="a-ilu-fondo" />
      <path d="M22 56h22l6 10h20l6-10h22" className="a-ilu-linea" />
      <circle cx="60" cy="28" r="16" className="a-ilu-acento" />
      <path d="M52.5 28.5l5 5 10-10.5" className="a-ilu-check" />
    </svg>
  ),
  // Lupa sobre una lista: «no hay coincidencias»
  buscar: (
    <svg viewBox="0 0 120 96" aria-hidden="true">
      <ellipse cx="60" cy="86" rx="40" ry="5" className="a-ilu-sombra" />
      <rect x="20" y="18" width="62" height="62" rx="12" className="a-ilu-fondo" />
      <path d="M32 36h36M32 48h28M32 60h20" className="a-ilu-linea" />
      <circle cx="78" cy="56" r="15" className="a-ilu-lente" />
      <path d="M89 67l10 10" className="a-ilu-mango" />
    </svg>
  ),
  // Gráfico sin barras: «sin datos en el período»
  grafico: (
    <svg viewBox="0 0 120 96" aria-hidden="true">
      <ellipse cx="60" cy="86" rx="40" ry="5" className="a-ilu-sombra" />
      <rect x="18" y="16" width="84" height="64" rx="12" className="a-ilu-fondo" />
      <path d="M32 66h56" className="a-ilu-linea" />
      <rect x="36" y="56" width="10" height="10" rx="3" className="a-ilu-barra" />
      <rect x="55" y="48" width="10" height="18" rx="3" className="a-ilu-barra" />
      <rect x="74" y="58" width="10" height="8" rx="3" className="a-ilu-barra" />
      <circle cx="88" cy="28" r="9" className="a-ilu-acento" />
      <path d="M88 24v5M88 32v.5" className="a-ilu-check" />
    </svg>
  ),
}

/** Estado vacío cuidado: ilustración suave, título, explicación y, si sirve, una acción */
export function EstadoVacio({ ilustracion = 'aldia', titulo, texto, accion, compacto = false }) {
  return (
    <div className={`a-vacio${compacto ? ' compacto' : ''}`} data-animar="tarjeta">
      <div className="a-vacio-ilustracion">{ILUSTRACIONES[ilustracion]}</div>
      <h2>{titulo}</h2>
      {texto && <p>{texto}</p>}
      {accion}
    </div>
  )
}

/**
 * Tarjeta KPI: cifra grande con etiqueta pequeña y, si hay, una variación («+12 %»). Con `alElegir`
 * funciona como filtro rápido (botón con estado presionado).
 */
const numeroCl = new Intl.NumberFormat('es-CL')

export function TarjetaKpi({ etiqueta, valor, detalle, variacion, icono, tono = 'acento', alElegir, elegida = false }) {
  const cifra = useCifraAnimada(valor, (n) => numeroCl.format(Math.round(n))) // cuenta hasta el valor, y entre valores al filtrar
  const cargando = typeof valor !== 'number' // mientras no llega, la tarjeta es silueta
  const contenido = (
    <>
      <span className="a-kpi-cabeza">
        {icono && <span className="a-kpi-icono" aria-hidden="true">{icono}</span>}
        <span className="a-kpi-etiqueta">{etiqueta}</span>
        {variacion && <span className="a-kpi-variacion" data-signo={variacion.startsWith('-') ? 'menos' : 'mas'}>{variacion}</span>}
      </span>
      <span ref={cifra} className="a-kpi-valor" data-valor={typeof valor === 'number' ? valor : undefined}>{cargando ? '0' : numeroCl.format(valor)}</span>
      {detalle && <span className="a-kpi-detalle">{detalle}</span>}
    </>
  )
  if (alElegir) {
    return (
      <button type="button" className="a-kpi" data-tono={tono} aria-pressed={elegida} onClick={alElegir}
        data-animar="tarjeta" data-cargando={cargando || undefined}>
        {contenido}
      </button>
    )
  }
  return <div className="a-kpi" data-tono={tono} data-animar="tarjeta" data-cargando={cargando || undefined}>{contenido}</div>
}

/**
 * Filas de silueta mientras la tabla carga: misma altura que las reales, así nada salta al llegar
 * los datos. La transición de entrada las muestra borrosas (es el estado de carga, sin spinner).
 */
export function FilasSilueta({ columnas, filas = 5 }) {
  return Array.from({ length: filas }, (_, f) => (
    <tr key={f} className="a-fila-silueta" aria-hidden="true">
      {Array.from({ length: columnas }, (_, c) => (
        <td key={c}>{c === 0 ? <span className="a-silueta-persona"><span /><span /></span> : <span className="a-silueta-linea" />}</td>
      ))}
    </tr>
  ))
}

/** Foto que aparece con un fundido cuando termina de cargar (nunca de golpe ni rota) */
export function ImagenSuave({ alt = '', className = '', alFallar, ...props }) {
  const [cargada, setCargada] = useState(false)
  return (
    <img {...props} alt={alt} className={`a-imagen-suave ${className}`.trim()} data-cargada={cargada || undefined}
      ref={(img) => { if (img?.complete && img.naturalWidth && !cargada) setCargada(true) }}
      onLoad={() => setCargada(true)} onError={alFallar} />
  )
}
