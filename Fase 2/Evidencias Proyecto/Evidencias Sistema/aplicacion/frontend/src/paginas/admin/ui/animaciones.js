import { useLayoutEffect, useRef } from 'react'
import { gsap, prefiereSinMovimiento } from '../../../landing/animaciones.js'

/*
 * Animaciones del panel de administración: cifras que cuentan, latidos e indicadores que se
 * deslizan. La transición entre pestañas (salida, siluetas y enfoque) está en transicion.js.
 * Con «reducir movimiento» no se ejecutan: el contenido queda directo en su estado final.
 */


/**
 * Llama a `fn` cuando el bloque que contiene a `el` termina de enfocarse en la transición de
 * entrada del admin (ver transicion.js). Si no hay transición en curso, la llama de inmediato.
 * Así las cifras, barras y líneas empiezan cuando su tarjeta ya es nítida, no mientras es silueta.
 * Devuelve una función para dejar de esperar.
 */
export function alEnfocar(el, fn) {
  const bloque = el?.closest('[data-animar]')
  const zona = el?.closest('[data-entrando]')
  if (!bloque || !zona || bloque.hasAttribute('data-enfocado')) {
    fn()
    return () => {}
  }
  const listo = () => bloque.hasAttribute('data-enfocado') || !zona.hasAttribute('data-entrando')
  const obs = new MutationObserver(() => {
    if (!listo()) return
    obs.disconnect()
    fn()
  })
  obs.observe(bloque, { attributes: true, attributeFilter: ['data-enfocado'] })
  obs.observe(zona, { attributes: true, attributeFilter: ['data-entrando'] })
  return () => obs.disconnect()
}

/**
 * Cifra que cuenta: la primera vez desde 0 y después desde el valor anterior (al cambiar un filtro).
 * React siempre deja el valor final en el texto; GSAP solo muestra los intermedios.
 */
export function useCifraAnimada(valor, formato = (n) => String(Math.round(n))) {
  const ref = useRef(null)
  const anterior = useRef(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (typeof valor !== 'number' || Number.isNaN(valor)) return undefined
    const desde = anterior.current
    anterior.current = valor
    if (!el || desde === valor || prefiereSinMovimiento()) return undefined
    const estado = { n: desde }
    el.textContent = formato(desde) // antes de pintar, para que no se vea un instante el valor final
    let tween = null
    // La primera vez cuenta cuando su tarjeta ya se enfocó (mientras es silueta queda en 0)
    const dejarDeEsperar = alEnfocar(el, () => {
      tween = gsap.to(estado, {
        n: valor,
        // Lo bastante largo para que se note el conteo; power2 frena menos al final que power3
        duration: Math.min(1.2, 0.8 + Math.abs(valor - desde) / 150),
        ease: 'power2.out',
        delay: 0.1,
        onUpdate: () => { el.textContent = formato(estado.n) },
        onComplete: () => { el.textContent = formato(valor) },
      })
    })
    return () => {
      dejarDeEsperar()
      // Cortada antes de terminar (o el doble montaje de StrictMode): se vuelve a contar desde el mismo punto
      if (!tween || tween.progress() < 1) anterior.current = desde
      tween?.kill()
      if (!tween || tween.progress() < 1) el.textContent = formato(valor)
    }
    // `formato` puede cambiar de identidad en cada render: solo importa el valor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor])
  return ref
}

/** Un latido corto cuando `valor` cambia (no al aparecer): para contadores y chips de estado */
export function useLatido(valor, { escala = 1.25 } = {}) {
  const ref = useRef(null)
  const previo = useRef(valor)
  useLayoutEffect(() => {
    if (previo.current === valor) return undefined
    previo.current = valor
    const el = ref.current
    if (!el || prefiereSinMovimiento()) return undefined
    const tween = gsap.fromTo(el, { scale: escala, opacity: 0.55 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2.2)', clearProps: 'transform,opacity' })
    return () => tween.kill()
  }, [valor, escala])
  return ref
}

/**
 * Indicador que se desliza bajo la opción elegida de un grupo de botones (pestañas o segmentos).
 * Lo crea dentro del contenedor y lo mueve con transform; `dependencia` es la opción elegida.
 * El contenedor debe tener position: relative (ver .a-indicador en admin.css).
 */
export function useIndicador(dependencia, selector = '[aria-pressed="true"]') {
  const ref = useRef(null)
  const yaPuesto = useRef(false)
  useLayoutEffect(() => {
    const grupo = ref.current
    if (!grupo) return undefined
    let indicador = grupo.querySelector(':scope > .a-indicador')
    if (!indicador) {
      indicador = document.createElement('span')
      indicador.className = 'a-indicador'
      indicador.setAttribute('aria-hidden', 'true')
      grupo.prepend(indicador)
      grupo.dataset.indicador = ''
    }
    const colocar = (animar) => {
      const elegido = grupo.querySelector(selector)
      if (!elegido) {
        indicador.style.opacity = '0'
        return
      }
      indicador.dataset.tipo = elegido.dataset.tipo ?? ''
      indicador.style.transition = animar && !prefiereSinMovimiento() ? '' : 'none'
      indicador.style.opacity = '1'
      // El ancho se fija aparte (no con scaleX) para que los bordes redondeados no se deformen
      indicador.style.width = `${elegido.offsetWidth}px`
      indicador.style.height = `${elegido.offsetHeight}px`
      indicador.style.transform = `translate(${elegido.offsetLeft}px, ${elegido.offsetTop}px)`
    }
    colocar(yaPuesto.current)
    yaPuesto.current = true
    const obs = new ResizeObserver(() => colocar(false))
    obs.observe(grupo)
    return () => obs.disconnect()
  }, [dependencia, selector])
  return ref
}
