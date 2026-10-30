import { useEffect } from 'react'

const sinMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Entrada suave del perfil: cada elemento con la clase `pv-anima` dentro de `ref` aparece (clase
 * `pv-visible`) cuando entra en pantalla. Con «reducir movimiento» o sin IntersectionObserver se
 * muestra todo de inmediato. Solo cambia opacity y transform (ver index.css).
 */
export function useAparecer(ref, dependencia) {
  useEffect(() => {
    const raiz = ref.current
    if (!raiz) return undefined
    const elementos = [...raiz.querySelectorAll('.pv-anima:not(.pv-visible)')]
    if (sinMovimiento() || !('IntersectionObserver' in window)) {
      elementos.forEach((el) => el.classList.add('pv-visible'))
      return undefined
    }
    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return
        entrada.target.classList.add('pv-visible')
        observador.unobserve(entrada.target)
      })
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 })
    elementos.forEach((el) => observador.observe(el))
    return () => observador.disconnect()
  }, [ref, dependencia])
}
