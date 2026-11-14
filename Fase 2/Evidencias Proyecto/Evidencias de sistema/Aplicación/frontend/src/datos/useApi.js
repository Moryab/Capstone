import { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'
import { guardarMemoria, leerMemoria } from './memoria.js'

/**
 * Datos de una ruta GET de la API, con caché por sesión (memoria.js):
 * - Si la vista ya se visitó, devuelve lo guardado al instante (sin skeleton) y lo actualiza por detrás.
 * - Si cambia la ruta (otro usuario, otra publicación…), nunca devuelve los datos de la anterior.
 * - Una respuesta que llega tarde para una ruta que ya no está a la vista se descarta.
 * Con `ruta` nula no pide nada (por ejemplo, mientras falta un dato para armarla).
 *
 * Devuelve { datos, error, cargando, actualizar, recargar }. `cargando` es true solo si no hay nada que
 * mostrar todavía. `actualizar(valor | fn)` cambia lo que se ve y la caché (tras guardar algo).
 */
export function useApi(ruta) {
  const [estado, setEstado] = useState(() => ({ ruta, datos: leerMemoria(ruta), error: '' }))
  const [version, setVersion] = useState(0)

  // Cambió la ruta: se parte de lo guardado para la nueva (o de nada), nunca de lo anterior
  const vigente = estado.ruta === ruta ? estado : { ruta, datos: leerMemoria(ruta), error: '' }
  if (vigente !== estado) setEstado(vigente)

  useEffect(() => {
    if (!ruta) return undefined
    let activa = true
    api(ruta)
      .then((datos) => {
        if (!activa) return
        guardarMemoria(ruta, datos)
        setEstado((e) => (e.ruta === ruta ? { ruta, datos, error: '' } : e))
      })
      .catch((err) => activa && setEstado((e) => (e.ruta === ruta ? { ...e, error: err.message } : e)))
    return () => {
      activa = false
    }
  }, [ruta, version])

  const actualizar = useCallback((valor) => {
    setEstado((e) => {
      const datos = typeof valor === 'function' ? valor(e.datos) : valor
      guardarMemoria(e.ruta, datos)
      return { ...e, datos }
    })
  }, [])

  const recargar = useCallback(() => {
    setEstado((e) => ({ ...e, error: '' }))
    setVersion((v) => v + 1)
  }, [])

  const { datos, error } = vigente
  return { datos, error, cargando: datos === undefined && !error && Boolean(ruta), actualizar, recargar }
}
