import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from './animaciones.js'
import { useDesplazar } from './desplazar.js'

// Solo con mouse o trackpad y sin "reducir movimiento": en pantallas táctiles no tiene sentido
const PUNTERO_FINO = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'

/**
 * Separa un texto en palabras para revelarlas una por una. Cada palabra queda dentro de una
 * "ventana" (overflow oculto) y la animación la sube desde abajo. El texto sigue siendo texto
 * normal para lectores de pantalla y buscadores.
 */
export function Palabras({ texto }) {
  return texto.split(' ').map((palabra, i) => (
    <span key={i}>
      <span className="l-palabra"><span className="l-palabra-in">{palabra}</span></span>{' '}
    </span>
  ))
}

// Tarjeta que se inclina levemente en 3D siguiendo el mouse
export function Inclinable({ children, className = '', grados = 8 }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!window.matchMedia(PUNTERO_FINO).matches) return undefined
    gsap.set(el, { transformPerspective: 900 })
    const rotarX = gsap.quickTo(el, 'rotationX', { duration: 0.5, ease: 'power3.out' })
    const rotarY = gsap.quickTo(el, 'rotationY', { duration: 0.5, ease: 'power3.out' })

    const mover = (e) => {
      const caja = el.getBoundingClientRect()
      rotarY(((e.clientX - caja.left) / caja.width - 0.5) * grados)
      rotarX(-((e.clientY - caja.top) / caja.height - 0.5) * grados)
    }
    const salir = () => {
      rotarX(0)
      rotarY(0)
    }
    el.addEventListener('pointermove', mover)
    el.addEventListener('pointerleave', salir)
    return () => {
      el.removeEventListener('pointermove', mover)
      el.removeEventListener('pointerleave', salir)
    }
  }, [grados])

  return <div ref={ref} className={`l-inclinable ${className}`}>{children}</div>
}

// Botón (enlace) que se deja "atraer" por el cursor cuando pasa cerca
export function BotonMagnetico({ to, children, className = '' }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!window.matchMedia(PUNTERO_FINO).matches) return undefined
    const moverX = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' })
    const moverY = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' })

    const mover = (e) => {
      const caja = el.getBoundingClientRect()
      moverX((e.clientX - (caja.left + caja.width / 2)) * 0.35)
      moverY((e.clientY - (caja.top + caja.height / 2)) * 0.35)
    }
    const salir = () => gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)' })
    el.addEventListener('pointermove', mover)
    el.addEventListener('pointerleave', salir)
    return () => {
      el.removeEventListener('pointermove', mover)
      el.removeEventListener('pointerleave', salir)
    }
  }, [])

  return (
    // El margen invisible agranda la zona donde el botón empieza a seguir al cursor
    <span className="l-magnetico">
      <Link ref={ref} to={to} className={`l-boton ${className}`}>{children}</Link>
    </span>
  )
}

// Enlace a una sección de la misma página: funciona como ancla normal y usa el scroll suave
export function EnlaceSeccion({ id, children, className, alIr }) {
  const irA = useDesplazar()
  return (
    <a href={`#${id}`} className={className}
      onClick={(e) => {
        e.preventDefault()
        irA(id)
        alIr?.()
      }}>
      {children}
    </a>
  )
}

// Encabezado común de las secciones: etiqueta pequeña, título y bajada
export function Encabezado({ etiqueta, titulo, bajada, claro = false, id }) {
  return (
    <header className={`l-encabezado${claro ? ' claro' : ''}`}>
      <p className="l-etiqueta">{etiqueta}</p>
      <h2 id={id} className="l-titulo">{titulo}</h2>
      {bajada && <p className="l-bajada">{bajada}</p>}
    </header>
  )
}
