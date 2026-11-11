import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Calendario from '../estadisticas/Calendario.jsx'
import '../estadisticas.css' // estilos del calendario

const ANCHO_CALENDARIO = 560
const corta = (texto) => {
  const [a, m, d] = texto.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** «1 oct 2026 – 8 nov 2026», o un solo día si desde y hasta coinciden */
export const textoRango = (desde, hasta) => {
  if (!desde) return ''
  return !hasta || hasta === desde ? corta(desde) : `${corta(desde)} – ${corta(hasta)}`
}

const Chevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 10l5 5 5-5" />
  </svg>
)

/**
 * Filtro por rango de fechas con el calendario del panel (atajos, mes y año para llegar rápido a
 * fechas antiguas, «Desde» y «Hasta»). `variante`: 'cabecera' (título de una columna, igual que
 * FiltroColumna, con un punto que no ocupa espacio al filtrar) o 'campo' (barra de filtros del celular).
 * El calendario flota sobre la página para que la tabla con scroll no lo recorte.
 */
export default function FiltroFecha({ etiqueta, desde, hasta, alAplicar, variante = 'cabecera' }) {
  const [ancla, setAncla] = useState(null)
  const boton = useRef(null)
  const zona = useRef(null)
  const idEtiqueta = useId()
  const filtrando = Boolean(desde)
  const resumen = filtrando ? textoRango(desde, hasta) : 'Todas las fechas'

  const abrir = () => {
    const caja = boton.current.getBoundingClientRect()
    setAncla({
      top: caja.bottom,
      left: Math.max(16, Math.min(caja.left, window.innerWidth - ANCHO_CALENDARIO - 16)),
      medido: false,
      // Fuera del título de la columna (no hereda sus estilos), pero dentro del admin (sus colores)
      destino: boton.current.closest('.es-admin') ?? document.body,
    })
  }

  // Antes de pintarlo se mide: si no cabe bajo el título, sube lo necesario para quedar entero en
  // la ventana (flota, así que no se podría llegar a «Aplicar» haciendo scroll)
  useLayoutEffect(() => {
    if (!ancla || ancla.medido || variante !== 'cabecera') return
    const ventana = zona.current?.querySelector('.c-ventana')
    const alto = ventana ? ventana.offsetHeight + 10 : 0
    const top = Math.max(16, Math.min(ancla.top, window.innerHeight - alto - 16))
    setAncla({ ...ancla, top, medido: true })
  }, [ancla, variante])
  const cerrar = () => {
    setAncla(null)
    boton.current?.focus()
  }

  // Si la página o la tabla se desplazan, el calendario quedaría desalineado: se cierra
  useEffect(() => {
    if (!ancla || variante !== 'cabecera') return undefined
    const alDesplazar = (e) => !e.target.closest?.('.c-ventana') && setAncla(null)
    window.addEventListener('scroll', alDesplazar, true)
    return () => window.removeEventListener('scroll', alDesplazar, true)
  }, [ancla, variante])

  const calendario = ancla && (
    <div ref={zona} className="a-fecha-ancla" style={variante === 'cabecera' ? { top: ancla.top, left: ancla.left } : undefined}>
      <Calendario desde={desde} hasta={hasta} alCancelar={cerrar} permitirVacio
        alAplicar={(d, h) => { setAncla(null); alAplicar(d, h); boton.current?.focus() }} />
    </div>
  )

  if (variante === 'campo') {
    return (
      <div className="a-campo a-fecha-campo">
        <span id={idEtiqueta} className="a-campo-etiqueta">{etiqueta}</span>
        <div className="a-desplegable a-desplegable-campo">
          <button ref={boton} type="button" className="a-desplegable-boton" data-abre-calendario aria-expanded={Boolean(ancla)}
            aria-labelledby={idEtiqueta} aria-describedby={`${idEtiqueta}-valor`} onClick={() => (ancla ? cerrar() : abrir())}>
            <span id={`${idEtiqueta}-valor`} className="a-desplegable-valor">{resumen}</span>
            <Chevron />
          </button>
        </div>
        {calendario}
      </div>
    )
  }

  return (
    <div className={`a-desplegable a-desplegable-cabecera${filtrando ? ' filtrando' : ''}`} data-abierto={ancla ? '' : undefined}>
      <button ref={boton} type="button" className="a-desplegable-boton" data-abre-calendario aria-expanded={Boolean(ancla)}
        aria-haspopup="dialog" aria-label={`Filtrar por ${etiqueta.toLowerCase()}: ${resumen}`}
        onClick={() => (ancla ? cerrar() : abrir())}>
        <span className="a-desplegable-valor"><span className="a-filtro-columna-nombre">{etiqueta}</span></span>
        <Chevron />
      </button>
      {calendario && createPortal(calendario, ancla.destino)}
    </div>
  )
}
