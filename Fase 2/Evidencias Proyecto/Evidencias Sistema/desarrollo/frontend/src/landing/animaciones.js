import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLayoutEffect } from 'react'

gsap.registerPlugin(ScrollTrigger)

export { gsap, ScrollTrigger }

// `animar`: el usuario no pidió reducir el movimiento.
// `escritorio`: además hay espacio para secciones fijas (pinned) y scroll horizontal
const CONDICIONES = {
  animar: '(prefers-reduced-motion: no-preference)',
  escritorio: '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
}

export const prefiereSinMovimiento = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Crea las animaciones de una sección dentro de `ref` y las deshace al desmontar o cuando cambia
 * el tamaño de pantalla. Con "reducir movimiento" no se ejecuta: el contenido ya se ve en su
 * estado final porque todas las animaciones son `from` (parten de oculto y llegan a lo normal).
 * `crear` recibe { escritorio } y puede devolver una función de limpieza.
 */
export function useAnimacion(ref, crear) {
  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    mm.add(
      CONDICIONES,
      (contexto) => {
        if (!contexto.conditions.animar) return undefined
        return crear({ escritorio: contexto.conditions.escritorio })
      },
      ref,
    )
    return () => mm.revert()
    // `crear` se define en cada render, pero las animaciones solo se arman una vez
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])
}

// Entrada estándar: sube y aparece, escalonado, cuando el bloque entra en pantalla
export function aparecer(elementos, { disparador, retraso = 0, separacion = 0.12, desplazamiento = 40 } = {}) {
  return gsap.from(elementos, {
    y: desplazamiento,
    opacity: 0,
    duration: 0.9,
    ease: 'power3.out',
    stagger: separacion,
    delay: retraso,
    scrollTrigger: { trigger: disparador ?? elementos, start: 'top 82%', once: true },
  })
}

// Contador de 0 a su valor final (el número real ya está escrito en el HTML)
export function contar(elemento, { duracion = 1.6, disparador, retraso = 0 } = {}) {
  const final = Number(elemento.dataset.valor ?? elemento.textContent)
  const estado = { valor: 0 }
  return gsap.to(estado, {
    valor: final,
    duration: duracion,
    delay: retraso,
    ease: 'power2.out',
    onStart: () => { elemento.textContent = '0' },
    onUpdate: () => { elemento.textContent = Math.round(estado.valor) },
    scrollTrigger: disparador ? { trigger: disparador, start: 'top 80%', once: true } : undefined,
  })
}
