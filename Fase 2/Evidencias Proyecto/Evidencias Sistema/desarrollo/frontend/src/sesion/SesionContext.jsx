import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, borrarToken, configurarExpiracion, guardarToken, obtenerToken } from '../api.js'

const SesionContext = createContext(null)

export function SesionProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(Boolean(obtenerToken()))
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    configurarExpiracion(() => {
      setUsuario(null)
      setAviso('Tu sesión expiró. Inicia sesión nuevamente')
    })

    // Si hay un token guardado, se recupera la sesión al recargar la página
    if (!obtenerToken()) return
    api('/auth/me')
      .then(setUsuario)
      .catch(() => borrarToken())
      .finally(() => setCargando(false))
  }, [])

  const iniciarSesion = useCallback(async (correo, password) => {
    const { access_token } = await api('/auth/login', { metodo: 'POST', datos: { correo, password } })
    guardarToken(access_token)
    setUsuario(await api('/auth/me'))
    setAviso('')
  }, [])

  const cerrarSesion = useCallback(async () => {
    try {
      await api('/auth/logout', { metodo: 'POST' })
    } finally {
      borrarToken()
      setUsuario(null)
    }
  }, [])

  return (
    <SesionContext.Provider value={{ usuario, cargando, aviso, iniciarSesion, cerrarSesion }}>
      {children}
    </SesionContext.Provider>
  )
}

export const useSesion = () => useContext(SesionContext)
