import { useEffect, useState } from 'react'
import { api } from '../../../api.js'

/** Cifras de arriba de «Reportes» y «Verificaciones» (GET /admin/moderacion/resumen).
 *  Con `tipo` ('usuario' o 'publicacion'), las de reportes cuentan solo ese tipo. Mientras llegan
 *  las nuevas se mantienen las anteriores, así las tarjetas no parpadean al cambiar de pestaña. */
export function useResumenModeracion(tipo = '') {
  const [resumen, setResumen] = useState(null)
  useEffect(() => {
    api(`/admin/moderacion/resumen${tipo ? `?tipo=${tipo}` : ''}`).then(setResumen).catch(() => setResumen(false))
  }, [tipo])
  return resumen
}
