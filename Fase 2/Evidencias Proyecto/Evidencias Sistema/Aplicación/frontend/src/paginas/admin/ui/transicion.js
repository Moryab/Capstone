import { useEffect, useLayoutEffect, useRef } from 'react'
import { gsap, prefiereSinMovimiento } from '../../../landing/animaciones.js'

/*
 * Transición entre pestañas del admin (Estadísticas, Reportes, Verificaciones, Usuarios,
 * Publicaciones). Se monta una sola vez en el marco (Marco.jsx); las páginas solo marcan sus bloques:
 *
 *   data-animar="titulo" | "tarjeta" | "tabla" | "grilla"   → bloque que se enfoca al entrar
 *   data-cargando                                           → aún sin datos: se queda como silueta
 *
 * 1. Salida (~160 ms): al hacer clic en el menú o al volver con «atrás», se copia lo que se ve y la
 *    copia se desvanece con un desenfoque leve sobre la página nueva. Se usa GSAP y no la View
 *    Transitions API porque la prop `viewTransition` de React Router solo existe con el router de
 *    datos (createBrowserRouter) y la app usa <BrowserRouter>.
 * 2. Siluetas: los bloques de la página nueva aparecen en su lugar final, borrosos y translúcidos
 *    (CSS: #contenido[data-entrando] [data-animar]…). Son el estado de carga: no hay spinner.
 * 3. Enfoque: cuando un bloque tiene sus datos se vuelve nítido (280 ms), en orden de lectura (de
 *    arriba abajo y de izquierda a derecha), con 35 ms entre uno y otro. El título va primero.
 * 4. Adentro: las filas visibles de tablas y grillas aparecen con un desplazamiento corto; cifras,
 *    barras y líneas empiezan solas al enfocarse su tarjeta (alEnfocar, en animaciones.js).
 *
 * Solo anima opacity, transform y filter, y al terminar no deja filter ni will-change aplicados.
 * Si se cambia de pestaña a mitad, todo se corta limpio. Al filtrar dentro de una página no se
 * repite: la entrada solo ocurre al cambiar de ruta.
 */

// Corta y sutil (tokens de movimiento: ~240–300 ms): la página nueva se enfoca sin hacer esperar
const ENFOQUE = { duracion: 0.28, separacion: 0.035, desenfoque: 6, opacidad: 0.5, escala: 0.99 }
const VENTANA_MS = 6000 // si algo nunca carga (error de red), a los 6 s deja de ser silueta
const CON_FILAS = { tabla: 'tbody tr', grilla: '.a-pub' }

// Orden de lectura: por filas (con tolerancia de 12 px) y dentro de cada fila de izquierda a derecha
function enOrden(elementos) {
  return elementos
    .map((el) => ({ el, caja: el.getBoundingClientRect() }))
    .sort((a, b) => (Math.abs(a.caja.top - b.caja.top) > 12 ? a.caja.top - b.caja.top : a.caja.left - b.caja.left))
    .map((x) => x.el)
}

const listo = (el) => !el.hasAttribute('data-cargando')

/*
 * «Atrás» y «adelante»: el listener se registra al cargar este módulo, antes que el de React
 * Router (que se registra al montar <BrowserRouter>). Así la copia de la página se hace antes de
 * que React la cambie; registrado después, a veces ya se copiaba la página nueva.
 */
let alVolverActual = null
if (typeof window !== 'undefined') window.addEventListener('popstate', () => alVolverActual?.(), true)

/** Entrada de la página que hay dentro de `zona`. Devuelve la función que la corta. */
function entrar(zona) {
  const pagina = zona.querySelector(':scope > main')
  if (!pagina) return () => {}

  if (prefiereSinMovimiento()) {
    // Sin desenfoque ni movimiento: un fundido corto y los valores finales directo
    const tween = gsap.fromTo(pagina, { opacity: 0 }, { opacity: 1, duration: 0.15, clearProps: 'opacity' })
    return () => tween.progress(1).kill()
  }

  // Páginas sin bloques marcados (las fichas de detalle): cada parte de la página es un bloque
  const marcarHijos = () => [...pagina.children].forEach((h) => !h.hasAttribute('data-animar') && h.setAttribute('data-animar', 'bloque'))
  const sinMarcas = !pagina.querySelector('[data-animar]')
  if (sinMarcas) marcarHijos()

  zona.setAttribute('data-entrando', '')
  const enfocados = new WeakSet()
  const animaciones = []

  const filasVisibles = (bloque) => {
    const selector = CON_FILAS[bloque.dataset.animar]
    if (!selector) return
    const filas = [...bloque.querySelectorAll(selector)].filter((f) => f.getBoundingClientRect().top < window.innerHeight)
    if (!filas.length) return
    animaciones.push(gsap.fromTo(filas, { opacity: 0, y: 5, transition: 'none' }, {
      opacity: 1, y: 0, duration: 0.24, stagger: 0.025, delay: 0.06, ease: 'power2.out', clearProps: 'opacity,transform,transition',
      onComplete: revisarFin,
    }))
  }

  const enfocar = (bloques) => {
    enOrden(bloques).forEach((bloque, i) => {
      enfocados.add(bloque)
      animaciones.push(gsap.fromTo(bloque, {
        filter: `blur(${ENFOQUE.desenfoque}px)`, opacity: ENFOQUE.opacidad, scale: ENFOQUE.escala,
        transition: 'none', willChange: 'filter, opacity, transform',
      }, {
        filter: 'blur(0px)', opacity: 1, scale: 1,
        duration: ENFOQUE.duracion, delay: i * ENFOQUE.separacion, ease: 'power2.out',
        onStart: () => {
          bloque.setAttribute('data-enfocado', '') // desde aquí empiezan sus cifras, barras y líneas
          filasVisibles(bloque)
        },
        // Que no quede blur(0) ni will-change aplicados
        clearProps: 'filter,opacity,transform,transition,willChange',
        onComplete: revisarFin,
      }))
    })
  }

  // Los que ya tienen datos se enfocan; los demás siguen como silueta hasta que lleguen
  const revisar = () => {
    if (sinMarcas) marcarHijos()
    const nuevos = [...pagina.querySelectorAll('[data-animar]')].filter((b) => !enfocados.has(b) && listo(b))
    if (nuevos.length) enfocar(nuevos)
  }

  let terminado = false
  const terminar = () => {
    if (terminado) return
    terminado = true
    observador.disconnect()
    clearTimeout(limite)
    zona.removeAttribute('data-entrando')
  }
  function revisarFin() {
    const pendientes = [...pagina.querySelectorAll('[data-animar]')].some((b) => !enfocados.has(b) || !listo(b))
    const enCurso = animaciones.some((a) => a.progress() < 1) // (dentro de onComplete, isActive() aún es true)
    if (!pendientes && !enCurso) terminar()
  }

  // Corre antes de pintar (microtarea): un bloque que aparece nunca se ve un instante nítido
  const observador = new MutationObserver(revisar)
  observador.observe(pagina, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-cargando'] })
  const limite = setTimeout(terminar, VENTANA_MS)
  revisar()

  return () => {
    observador.disconnect()
    clearTimeout(limite)
    animaciones.forEach((a) => a.progress(1).kill())
    // Limpio para un nuevo intento (cambio rápido de pestaña o doble montaje de StrictMode)
    pagina.querySelectorAll('[data-enfocado]').forEach((b) => b.removeAttribute('data-enfocado'))
    if (sinMarcas) pagina.querySelectorAll('[data-animar="bloque"]').forEach((b) => b.removeAttribute('data-animar'))
    zona.removeAttribute('data-entrando')
  }
}

/**
 * Transición entre pestañas del admin, sobre el área de contenido `ref` (la barra lateral y la
 * superior no se animan). `activo`: solo para el administrador.
 */
export function useTransicionAdmin(ref, pathname, activo) {
  const rutaMostrada = useRef(pathname)
  const salida = useRef(null)

  // 1. Salida: la copia se hace antes de que React cambie la página (clic en captura y popstate)
  useEffect(() => {
    if (!activo) return undefined
    const zona = ref.current
    const quitarSalida = () => {
      if (!salida.current) return
      salida.current.tween.kill()
      salida.current.capa.remove()
      salida.current = null
    }
    const copiar = () => {
      quitarSalida()
      const pagina = zona.querySelector(':scope > main')
      if (!pagina) return
      const caja = pagina.getBoundingClientRect()
      const capa = document.createElement('div')
      capa.className = 'a-salida'
      capa.setAttribute('aria-hidden', 'true')
      capa.inert = true
      Object.assign(capa.style, { top: `${caja.top}px`, left: `${caja.left}px`, width: `${caja.width}px` })
      const copia = pagina.cloneNode(true)
      copia.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'))
      copia.removeAttribute('id')
      capa.append(copia)
      ;(zona.closest('.es-admin') ?? document.body).append(capa) // dentro del admin: mismos colores
      const reducir = prefiereSinMovimiento()
      const tween = gsap.to(capa, {
        opacity: 0,
        // Salida: ease-in (acelera al irse), más corta que la entrada
        ...(reducir ? { duration: 0.15 } : { filter: 'blur(4px)', duration: 0.16, ease: 'power1.in' }),
        onComplete: quitarSalida,
      })
      salida.current = { capa, tween }
    }
    const alClic = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const enlace = e.target.closest?.('a[href]')
      if (!enlace || !enlace.closest('.i-barra, .i-nav-movil')) return
      if (new URL(enlace.href).pathname !== window.location.pathname) copiar()
    }
    // «Atrás» o «adelante»: solo si cambia la pestaña (no al volver entre filtros de la misma)
    const alVolver = () => {
      if (window.location.pathname !== rutaMostrada.current) copiar()
    }
    document.addEventListener('click', alClic, true)
    alVolverActual = alVolver
    return () => {
      document.removeEventListener('click', alClic, true)
      if (alVolverActual === alVolver) alVolverActual = null
      quitarSalida()
    }
  }, [ref, activo])

  // 2 a 4. Entrada de la página nueva, al cambiar de ruta (también al cargar por primera vez)
  useLayoutEffect(() => {
    rutaMostrada.current = pathname
    if (!activo) return undefined
    return entrar(ref.current)
  }, [ref, pathname, activo])
}
