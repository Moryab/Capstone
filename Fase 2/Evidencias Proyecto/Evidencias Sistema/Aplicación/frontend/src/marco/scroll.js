import { useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/*
 * Dónde queda la vista al cambiar de página, en toda la app:
 * - Al entrar a una página (un enlace, el menú, una pestaña) se ve desde el inicio.
 * - Con «Atrás» o «Adelante» del navegador se vuelve a la posición en que se dejó esa página (por
 *   ejemplo, la lista de alojamientos después de abrir uno).
 * - Al cambiar solo filtros o la búsqueda (lo que va después del «?») la vista no se mueve.
 * Se recuerda por entrada del historial (location.key), solo mientras la pestaña está abierta.
 */
const posiciones = new Map()
let entradaActual = null

if (typeof window !== 'undefined') {
  // Se va guardando mientras se baja; al cambiar de página, entradaActual ya es la nueva
  window.addEventListener('scroll', () => {
    if (entradaActual) posiciones.set(entradaActual, window.scrollY)
  }, { passive: true })
}

/**
 * Úsalo una vez por árbol de páginas (en App y en el marco, antes de cualquier animación de entrada
 * que mida posiciones). Se puede llamar en más de un lugar: todos hacen lo mismo.
 */
export function useScrollPorPagina() {
  const { pathname, key } = useLocation()
  const tipo = useNavigationType()
  // Cada lugar que lo usa se salta su propia primera vez: al cargar la app (o al montarse el marco, que
  // ya lo resolvió App) no se mueve nada
  const montado = useRef(false)

  useLayoutEffect(() => {
    entradaActual = key
    if (!montado.current) {
      montado.current = true
      return
    }
    const guardada = tipo === 'POP' ? posiciones.get(key) : undefined
    window.scrollTo({ top: guardada ?? 0, left: 0, behavior: 'instant' })
    // Solo al cambiar de página: los filtros cambian la dirección después del «?», no el pathname
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])
}
