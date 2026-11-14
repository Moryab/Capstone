import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { contar, gsap, prefiereSinMovimiento, useAnimacion } from '../landing/animaciones.js'
import Cabecera from './Cabecera.jsx'
import './perfil.css'

/**
 * Entrada de las secciones al bajar: cada `.p2-anima` recibe el atributo `data-visible` al entrar en
 * pantalla (la transición es de CSS, solo opacity y transform). Es un atributo y no una clase porque
 * React reescribe className al volver a dibujar y la sección quedaría oculta otra vez. También toma las que aparecen después,
 * como la compatibilidad, que llega aparte. Los contadores (`[data-valor]`) suben desde 0 con GSAP.
 */
function useEntrada(ref, repetida) {
  useEffect(() => {
    const raiz = ref.current
    if (!raiz) return undefined
    // Un perfil que ya se vio en esta sesión aparece completo, sin volver a animar cada sección
    const quieto = repetida || prefiereSinMovimiento() || !('IntersectionObserver' in window)
    const animarCifras = (el) => {
      if (quieto) return
      el.querySelectorAll('[data-valor]').forEach((n) => contar(n, { duracion: 1.3 }))
    }
    const observador = quieto ? null : new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return
        e.target.dataset.visible = ''
        animarCifras(e.target)
        observador.unobserve(e.target)
      })
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 })
    // Cada ejecución lleva su propia lista (React puede montar el efecto dos veces en desarrollo)
    const vistos = new WeakSet()
    const tomar = () => raiz.querySelectorAll('.p2-anima:not([data-visible])').forEach((el) => {
      if (vistos.has(el)) return
      vistos.add(el)
      if (quieto) el.dataset.visible = ''
      else observador.observe(el)
    })
    tomar()
    const cambios = new MutationObserver(tomar)
    cambios.observe(raiz, { childList: true, subtree: true })
    return () => {
      cambios.disconnect()
      observador?.disconnect()
    }
  }, [ref, repetida])
}

// Perfiles que ya se mostraron en esta sesión: al volver a ellos no se repite la entrada
const perfilesVistos = new Set()

/**
 * Armazón del perfil, común al propio, al de otro estudiante y a la vista previa: cabecera con la
 * portada a todo el ancho, aviso opcional y dos columnas (la lateral queda fija al bajar).
 */
export default function PaginaPerfil({ perfil, modo, sobreAvatar, acciones, aviso, principal, lateral, pie }) {
  const ref = useRef(null)
  // Se decide una vez por montaje: ¿este perfil ya se había visto? (luego queda marcado)
  const [repetida] = useState(() => perfilesVistos.has(perfil.id))
  useEffect(() => {
    perfilesVistos.add(perfil.id)
  }, [perfil.id])
  useEntrada(ref, repetida)

  // Al cambiar de persona se vuelve arriba
  useLayoutEffect(() => {
    window.scrollTo({ top: 0 })
  }, [perfil.id])

  // Parallax suave de la portada y entrada de la cabecera
  useAnimacion(ref, () => {
    const q = gsap.utils.selector(ref)
    gsap.to(q('.p2-portada-imagen'), {
      yPercent: 16, ease: 'none',
      scrollTrigger: { trigger: q('.p2-cabecera')[0], start: 'top top', end: 'bottom top', scrub: true },
    })
    // Entrada corta de la cabecera, solo la primera vez que se ve este perfil
    if (repetida) return
    gsap.from(q('.p2-avatar-zona'), { scale: 0.94, opacity: 0, duration: 0.3, ease: 'power2.out' })
    gsap.from(q('.p2-identidad > *, .p2-acciones'), { y: 8, opacity: 0, duration: 0.28, stagger: 0.04, delay: 0.06, ease: 'power2.out' })
  })

  return (
    <article ref={ref} className={`p2 modo-${modo}`}>
      <Cabecera perfil={perfil} sobreAvatar={sobreAvatar} acciones={acciones} />
      {aviso}
      <div className="p2-cuerpo">
        <div className="p2-principal">{principal}</div>
        <aside className="p2-lateral" aria-label="Resumen">{lateral}</aside>
      </div>
      {pie}
    </article>
  )
}
