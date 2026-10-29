import { useEffect, useId, useRef } from 'react'
import { gsap } from '../landing/animaciones.js'
import { Inclinable } from '../landing/componentes.jsx'

const PUNTERO_FINO = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'
const MEDIO_BRILLO = 160 // la mitad del ancho del brillo (ver .i-brillo en inicio.css)

/**
 * Tarjeta de la grilla: se inclina en 3D con el mouse (componente de la landing) y tiene un brillo
 * que sigue al cursor. El brillo se mueve con transform, así no obliga a repintar la tarjeta.
 */
export function Tarjeta({ className = '', cuerpo = '', children, etiqueta, id, oscura = false }) {
  const cuerpoRef = useRef(null)
  const brillo = useRef(null)

  useEffect(() => {
    const el = cuerpoRef.current
    if (!window.matchMedia(PUNTERO_FINO).matches) return undefined
    const moverX = gsap.quickTo(brillo.current, 'x', { duration: 0.35, ease: 'power3.out' })
    const moverY = gsap.quickTo(brillo.current, 'y', { duration: 0.35, ease: 'power3.out' })
    const mover = (e) => {
      const caja = el.getBoundingClientRect()
      moverX(e.clientX - caja.left - MEDIO_BRILLO)
      moverY(e.clientY - caja.top - MEDIO_BRILLO)
    }
    el.addEventListener('pointermove', mover)
    return () => el.removeEventListener('pointermove', mover)
  }, [])

  return (
    <Inclinable className={`i-tarjeta ${className}`} grados={4}>
      <section ref={cuerpoRef} id={id} aria-labelledby={etiqueta} tabIndex={id ? -1 : undefined}
        className={`i-tarjeta-cuerpo${oscura ? ' oscura' : ''} ${cuerpo}`}>
        {/* La capa recorta el brillo; la tarjeta no recorta, para que los tooltips no se corten */}
        <span className="i-brillo-capa" aria-hidden="true"><span ref={brillo} className="i-brillo" /></span>
        {children}
      </section>
    </Inclinable>
  )
}

// Botón «?» con una explicación breve. Se muestra al pasar el mouse o al enfocarlo con teclado
export function Ayuda({ texto, claro = false }) {
  const id = useId()
  return (
    <span className={`i-ayuda${claro ? ' claro' : ''}`}>
      <button type="button" className="i-ayuda-boton" aria-label="Más información" aria-describedby={id}>?</button>
      <span role="tooltip" id={id} className="i-ayuda-globo">{texto}</span>
    </span>
  )
}

// Bloque gris con brillo que reserva el espacio mientras llegan los datos
export function Esqueleto({ ancho = '100%', alto = 14, redondo = false, className = '' }) {
  return (
    <span className={`i-esqueleto${redondo ? ' redondo' : ''} ${className}`} aria-hidden="true"
      style={{ width: ancho, height: alto }} />
  )
}
