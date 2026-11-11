import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../api.js'

const REVISAR_MS = 60000 // cada cuánto se vuelve a consultar lo pendiente

const ResumenContext = createContext({ resumen: null, recargarResumen: () => {} })
export const useResumenAdmin = () => useContext(ResumenContext)

/**
 * Lo que espera revisión en el panel de administración (GET /admin/resumen). Lo leen los
 * contadores de la barra lateral y el saludo del panel. Se actualiza al cambiar de página, cada
 * minuto y cuando una acción lo pide con `recargarResumen()` (por ejemplo, al aprobar una solicitud).
 */
export function ResumenAdminProvider({ activo, children }) {
  const [resumen, setResumen] = useState(null)
  const { pathname } = useLocation()

  const recargarResumen = useCallback(() => {
    if (!activo) return Promise.resolve()
    return api('/admin/resumen').then(setResumen).catch(() => {})
  }, [activo])

  useEffect(() => {
    recargarResumen()
  }, [recargarResumen, pathname])

  useEffect(() => {
    if (!activo) return undefined
    const intervalo = setInterval(recargarResumen, REVISAR_MS)
    return () => clearInterval(intervalo)
  }, [activo, recargarResumen])

  return <ResumenContext.Provider value={{ resumen, recargarResumen }}>{children}</ResumenContext.Provider>
}
