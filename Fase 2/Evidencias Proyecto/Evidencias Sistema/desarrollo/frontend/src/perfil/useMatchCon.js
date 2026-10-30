import { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'

/**
 * Propuestas de match con esta persona, desde GET /api/matches (la plataforma las genera; aquí
 * solo se responden). Devuelve { estado, propuesta, recargar } con estado: 'cargando' |
 * 'confirmado' | 'abierta' | 'cerrada' | 'ninguna' | 'error'.
 */
export function useMatchCon(otroId) {
  const [resultado, setResultado] = useState({ estado: 'cargando', propuesta: null })
  const recargar = useCallback(() => {
    if (!otroId) return Promise.resolve()
    return api('/matches')
      .then((r) => {
        const con = (lista) => lista.find((m) => m.otro?.id === otroId)
        const confirmado = con(r.confirmados)
        const abierta = con(r.propuestas)
        const cerrada = con(r.historial)
        if (confirmado) setResultado({ estado: 'confirmado', propuesta: confirmado })
        else if (abierta) setResultado({ estado: 'abierta', propuesta: abierta })
        else if (cerrada) setResultado({ estado: 'cerrada', propuesta: cerrada })
        else setResultado({ estado: 'ninguna', propuesta: null })
      })
      .catch(() => setResultado({ estado: 'error', propuesta: null }))
  }, [otroId])
  useEffect(() => {
    recargar()
  }, [recargar])
  return { ...resultado, recargar }
}
