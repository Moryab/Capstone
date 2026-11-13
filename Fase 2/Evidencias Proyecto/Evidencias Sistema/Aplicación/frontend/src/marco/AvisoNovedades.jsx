import { useEffect, useRef, useState } from 'react'
import { guardarSesion, leerSesion } from '../almacenamiento.js'
import './avisoNovedades.css'

const DURACION_MS = 9000
const CLAVE = 'roommatch_novedad_vista' // el último aviso ya anunciado en esta sesión del navegador

const Campana = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9" /><path d="M10 20a2.2 2.2 0 0 0 4 0" />
  </svg>
)
const Cerrar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" /></svg>
)

/**
 * Aviso pequeño en la esquina cuando hay novedades: al entrar a la plataforma o cuando llega un aviso
 * nuevo mientras se navega. Dice cuántos avisos hay sin leer y muestra el más reciente; «Ver avisos»
 * abre el panel de la campana, donde se leen completos y cada uno lleva a donde pasó.
 * No se repite por el mismo aviso al cambiar de página (se recuerda en sessionStorage).
 */
export default function AvisoNovedades({ noLeidas, ultimo, abrirAvisos, panelAbierto }) {
  const [visible, setVisible] = useState(null) // el aviso que se está anunciando
  const temporizador = useRef(null)
  const pausado = useRef(false)

  const cerrar = () => {
    clearTimeout(temporizador.current)
    setVisible(null)
  }
  const programar = () => {
    clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => !pausado.current && setVisible(null), DURACION_MS)
  }

  // Hay un aviso sin leer que aún no se anunció: se muestra (y queda recordado)
  useEffect(() => {
    if (!ultimo || panelAbierto || leerSesion(CLAVE, null) === ultimo.id) return undefined
    const mostrar = setTimeout(() => {
      guardarSesion(CLAVE, ultimo.id) // anunciado: no se repite al cambiar de página
      setVisible(ultimo)
      programar()
    }, 600) // un instante después de entrar, para que se note que llegó
    return () => clearTimeout(mostrar)
  }, [ultimo?.id, panelAbierto])

  // Al abrir el panel de avisos ya no hace falta
  useEffect(() => {
    if (panelAbierto) cerrar()
  }, [panelAbierto])

  useEffect(() => () => clearTimeout(temporizador.current), [])

  if (!visible) return null
  const otros = Math.max(0, noLeidas - 1)
  return (
    <div className="an" role="status" aria-live="polite"
      onPointerEnter={() => { pausado.current = true }}
      onPointerLeave={() => { pausado.current = false; programar() }}
      onFocus={() => { pausado.current = true }}>
      <span className="an-icono"><Campana /></span>
      <div className="an-texto">
        <p className="an-cuenta">{noLeidas === 1 ? 'Tienes 1 aviso nuevo' : `Tienes ${noLeidas} avisos nuevos`}</p>
        <p className="an-titulo">{visible.titulo}</p>
        <p className="an-mensaje">{visible.mensaje}</p>
        <div className="an-acciones">
          <button type="button" className="an-ver" onClick={() => { cerrar(); abrirAvisos() }}>
            {otros > 0 ? `Ver los ${noLeidas} avisos` : 'Ver aviso'}
          </button>
        </div>
      </div>
      <button type="button" className="an-cerrar" onClick={cerrar} aria-label="Cerrar este aviso"><Cerrar /></button>
      <span className="an-tiempo" aria-hidden="true" style={{ animationDuration: `${DURACION_MS}ms` }} />
    </div>
  )
}
