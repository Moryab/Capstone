import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { useCallback, useEffect, useRef } from 'react'
import { gsap, prefiereSinMovimiento, ScrollTrigger } from './animaciones.js'
import { DesplazarContext } from './desplazar.js'
import Alojamientos from './secciones/Alojamientos.jsx'
import Compatibilidad from './secciones/Compatibilidad.jsx'
import ComoFunciona from './secciones/ComoFunciona.jsx'
import CtaFinal from './secciones/CtaFinal.jsx'
import Footer from './secciones/Footer.jsx'
import Hero from './secciones/Hero.jsx'
import Navbar from './secciones/Navbar.jsx'
import PostMatch from './secciones/PostMatch.jsx'
import Preguntas from './secciones/Preguntas.jsx'
import QueEs from './secciones/QueEs.jsx'
import Seguridad from './secciones/Seguridad.jsx'
import './landing.css'

const ALTO_NAVBAR = 72

// Página principal para quien aún no inicia sesión. Se carga aparte (lazy) para que GSAP y Lenis
// no pesen en el resto de la app
export default function Landing() {
  const barraProgreso = useRef(null)
  const lenis = useRef(null)

  useEffect(() => {
    document.body.classList.add('pagina-landing')
    return () => document.body.classList.remove('pagina-landing')
  }, [])

  // Scroll suave con Lenis, sincronizado con ScrollTrigger. Con "reducir movimiento" no se usa
  useEffect(() => {
    if (prefiereSinMovimiento()) return undefined
    const instancia = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4) })
    lenis.current = instancia
    instancia.on('scroll', ScrollTrigger.update)
    const avanzar = (tiempo) => instancia.raf(tiempo * 1000)
    gsap.ticker.add(avanzar)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(avanzar)
      gsap.ticker.lagSmoothing(500, 33)
      instancia.destroy()
      lenis.current = null
    }
  }, [])

  // Barra de progreso de lectura (solo transform, una vez por cuadro)
  useEffect(() => {
    let cuadro = null
    const actualizar = () => {
      cuadro = null
      const maximo = document.documentElement.scrollHeight - window.innerHeight
      barraProgreso.current.style.transform = `scaleX(${maximo > 0 ? window.scrollY / maximo : 0})`
    }
    const alScroll = () => {
      if (!cuadro) cuadro = requestAnimationFrame(actualizar)
    }
    actualizar()
    window.addEventListener('scroll', alScroll, { passive: true })
    window.addEventListener('resize', alScroll)
    return () => {
      window.removeEventListener('scroll', alScroll)
      window.removeEventListener('resize', alScroll)
      cancelAnimationFrame(cuadro)
    }
  }, [])

  // Las fuentes cambian el alto del texto: se recalculan las posiciones cuando terminan de cargar
  useEffect(() => {
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
  }, [])

  const irA = useCallback((id) => {
    const destino = document.getElementById(id)
    if (!destino) return
    if (lenis.current) {
      lenis.current.scrollTo(destino, { offset: -ALTO_NAVBAR + 8 })
    } else {
      destino.scrollIntoView({ block: 'start' })
    }
    // Para teclado y lectores de pantalla, el foco pasa a la sección elegida
    destino.focus({ preventScroll: true })
    window.history.replaceState(null, '', `#${id}`)
  }, [])

  return (
    <DesplazarContext.Provider value={irA}>
      <div className="landing">
        <div className="l-progreso" aria-hidden="true"><span ref={barraProgreso} /></div>
        <a href="#contenido" className="l-saltar"
          onClick={(e) => {
            e.preventDefault()
            irA('que-es')
          }}>
          Saltar al contenido
        </a>
        <Navbar />
        <main id="contenido">
          <Hero />
          <QueEs />
          <ComoFunciona />
          <Compatibilidad />
          <Alojamientos />
          <PostMatch />
          <Seguridad />
          <Preguntas />
          <CtaFinal />
        </main>
        <Footer />
      </div>
    </DesplazarContext.Provider>
  )
}
