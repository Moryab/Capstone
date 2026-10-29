import { createContext, useContext, useLayoutEffect } from 'react'

export const TemaContext = createContext(null)

// Cada usuario tiene su propio tema en el navegador, así quien entra después no hereda el del
// anterior. index.html lee esta misma clave antes de cargar React para no mostrar un destello claro
export const claveTema = (usuarioId) => `rm_tema_${usuarioId}`

// Devuelve { tema: 'claro' | 'oscuro', cambiarTema(nuevo, origen?) }
export const useTema = () => useContext(TemaContext)

/**
 * Pone o quita la clase tema-oscuro en <html>. El tema elegido solo rige con sesión iniciada
 * (lo usa el marco); la landing, el acceso y el cuestionario inicial piden `forzarClaro` para
 * verse siempre en claro. Es de diseño para que el cambio quede listo antes de pintar.
 */
export function useAplicarTema(forzarClaro = false) {
  const { tema } = useTema()
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('tema-oscuro', !forzarClaro && tema === 'oscuro')
  }, [forzarClaro, tema])
}
