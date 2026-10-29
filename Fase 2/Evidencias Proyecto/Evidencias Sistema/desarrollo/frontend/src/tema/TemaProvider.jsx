import { useCallback, useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { guardarLocal, leerLocal } from '../almacenamiento.js'
import { CLAVE_TEMA, TemaContext } from './contexto.js'

// Sin preferencia guardada se usa la del dispositivo
const temaInicial = () =>
  leerLocal(CLAVE_TEMA, null) ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro')

const sinMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Tema claro u oscuro de toda la app. Se recuerda en el navegador y se aplica con la clase
 * tema-oscuro en <html> (estilos en tema-oscuro.css).
 * `cambiarTema(nuevo, origen)` revela la vista nueva en un círculo que crece desde `origen`
 * ({x, y} en la pantalla) cuando el navegador lo permite; si no, cambia al instante.
 */
export default function TemaProvider({ children }) {
  const [tema, setTema] = useState(temaInicial)

  useEffect(() => {
    document.documentElement.classList.toggle('tema-oscuro', tema === 'oscuro')
  }, [tema])

  const cambiarTema = useCallback((nuevo, origen) => {
    guardarLocal(CLAVE_TEMA, nuevo)
    const aplicar = () => flushSync(() => setTema(nuevo))
    if (!document.startViewTransition || sinMovimiento() || !origen) {
      aplicar()
      return
    }
    const { x, y } = origen
    const radio = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    const transicion = document.startViewTransition(aplicar)
    transicion.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radio}px at ${x}px ${y}px)`] },
        { duration: 650, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
      )
    }).catch(() => {})
  }, [])

  const valor = useMemo(() => ({ tema, cambiarTema }), [tema, cambiarTema])
  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>
}
