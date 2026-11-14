import { useCallback, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { guardarLocal, leerLocal } from '../almacenamiento.js'
import { useSesion } from '../sesion/SesionContext.jsx'
import { claveTema, TemaContext } from './contexto.js'

// Un usuario nuevo parte en claro; el oscuro se elige después en la configuración
const temaDe = (usuarioId) => (usuarioId ? leerLocal(claveTema(usuarioId), 'claro') : 'claro')

const sinMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Tema claro u oscuro elegido por cada usuario. Se recuerda en el navegador; cada página lo aplica
 * con useAplicarTema (clase tema-oscuro en <html>, estilos en tema-oscuro.css).
 * `cambiarTema(nuevo, origen)` revela la vista nueva en un círculo que crece desde `origen`
 * ({x, y} en la pantalla) cuando el navegador lo permite; si no, cambia al instante.
 */
export default function TemaProvider({ children }) {
  const { usuario } = useSesion()
  const usuarioId = usuario?.id
  const [tema, setTema] = useState(() => temaDe(usuarioId))
  // Al iniciar o cerrar sesión, o al cambiar de cuenta, se toma el tema del usuario que quedó
  const [temaDeId, setTemaDeId] = useState(usuarioId)
  if (temaDeId !== usuarioId) {
    setTemaDeId(usuarioId)
    setTema(temaDe(usuarioId))
  }

  const cambiarTema = useCallback((nuevo, origen) => {
    if (usuarioId) guardarLocal(claveTema(usuarioId), nuevo)
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
  }, [usuarioId])

  const valor = useMemo(() => ({ tema, cambiarTema }), [tema, cambiarTema])
  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>
}
