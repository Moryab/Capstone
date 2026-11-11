import { useEffect, useRef, useState } from 'react'
import Avatar from '../componentes/Avatar.jsx'
import { gsap, prefiereSinMovimiento } from '../landing/animaciones.js'
import { Palabras } from '../landing/componentes.jsx'
import EscenaHora from './EscenaHora.jsx'
import { IconoPausa, IconoReproducir } from './iconos.jsx'
import { FRASES, mayusculaInicial, SALUDOS } from './utilidades.js'

const PUNTERO_FINO = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'
const CADA_FRASE_MS = 5000

// Bienvenida a todo el ancho, con la escena del momento del día
export default function Hero({ usuario, momento }) {
  const ref = useRef(null)
  const [frase, setFrase] = useState(0)
  // Las frases rotan solas; se pueden pausar (y no rotan con «reducir movimiento»)
  const [pausado, setPausado] = useState(prefiereSinMovimiento)

  useEffect(() => {
    if (pausado) return undefined
    const intervalo = setInterval(() => setFrase((i) => (i + 1) % FRASES.length), CADA_FRASE_MS)
    return () => clearInterval(intervalo)
  }, [pausado])

  // Parallax: cada capa de la escena se desplaza según su profundidad y la posición del mouse
  useEffect(() => {
    const el = ref.current
    if (!window.matchMedia(PUNTERO_FINO).matches) return undefined
    const capas = [...el.querySelectorAll('[data-profundidad]')].map((capa) => ({
      profundidad: Number(capa.dataset.profundidad),
      x: gsap.quickTo(capa, 'x', { duration: 0.9, ease: 'power3.out' }),
      y: gsap.quickTo(capa, 'y', { duration: 0.9, ease: 'power3.out' }),
    }))
    const mover = (e) => {
      const caja = el.getBoundingClientRect()
      const dx = (e.clientX - caja.left) / caja.width - 0.5
      const dy = (e.clientY - caja.top) / caja.height - 0.5
      capas.forEach((c) => {
        c.x(-dx * c.profundidad)
        c.y(-dy * c.profundidad * 0.4)
      })
    }
    const salir = () => capas.forEach((c) => { c.x(0); c.y(0) })
    el.addEventListener('pointermove', mover)
    el.addEventListener('pointerleave', salir)
    return () => {
      el.removeEventListener('pointermove', mover)
      el.removeEventListener('pointerleave', salir)
    }
  }, [momento])

  const nombre = mayusculaInicial(usuario.nombre)

  return (
    <section ref={ref} className={`i-hero ${momento}`} aria-labelledby="i-saludo">
      <EscenaHora momento={momento} />
      <div className="i-hero-contenido">
        <Avatar nombre={usuario.nombre} apellido={usuario.ap_paterno} foto={usuario.foto_url}
          tamano={76} className="i-hero-avatar" />
        <h1 id="i-saludo" className="i-saludo">
          <Palabras texto={`${SALUDOS[momento]}, ${nombre}`} />
        </h1>
        <p className="i-correo">{usuario.correo}</p>

        <div className="i-frase-fila">
          {/* La key reinicia la animación de entrada de cada frase */}
          <p key={frase} className="i-frase">{FRASES[frase]}</p>
          <button type="button" className="i-frase-pausa" onClick={() => setPausado((p) => !p)}
            aria-pressed={pausado} aria-label={pausado ? 'Reanudar frases' : 'Pausar frases'}>
            {pausado ? <IconoReproducir /> : <IconoPausa />}
          </button>
        </div>
      </div>
    </section>
  )
}
