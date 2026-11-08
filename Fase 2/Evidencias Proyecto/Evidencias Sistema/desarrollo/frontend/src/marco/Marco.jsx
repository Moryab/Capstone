import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { guardarLocal, leerLocal } from '../almacenamiento.js'
import { api } from '../api.js'
import '../inicio/inicio.css'
import { AvisoBreveProvider } from '../componentes/AvisoBreve.jsx'
import '../paginas/admin/ui/admin.css'
import { CambioRolProvider } from '../rol/CambioRol.jsx'
import { useSesion } from '../sesion/SesionContext.jsx'
import { useAplicarTema, useTema } from '../tema/contexto.js'
import Avisos from './Avisos.jsx'
import Configuracion from './Configuracion.jsx'
import Navegacion from './Navegacion.jsx'
import { ResumenAdminProvider } from './ResumenAdmin.jsx'

const CLAVE_BARRA = 'rm_barra_contraida'
const REVISAR_AVISOS_MS = 60000 // cada cuánto se consulta si hay avisos nuevos
const REVISAR_MENSAJES_MS = 20000 // y si hay mensajes sin leer (la página de mensajes también lo pide al leer)

/**
 * Marco común de las páginas con sesión: barra lateral (o barra inferior en móvil) y el panel de
 * configuración. Envuelve al inicio (como `children`) y a las demás páginas (con <Outlet />).
 */
export default function Marco({ children }) {
  const { usuario, cerrarSesion } = useSesion()
  const { tema, cambiarTema } = useTema()
  useAplicarTema()
  const { pathname } = useLocation()
  const admin = usuario.rol === 'administrador'
  const [contraida, setContraidaEstado] = useState(() => leerLocal(CLAVE_BARRA, false))
  const [configAbierta, setConfigAbierta] = useState(false)
  const [avisosAbiertos, setAvisosAbiertos] = useState(false)
  const [noLeidas, setNoLeidas] = useState(0)

  // Contador de la campana: al entrar, cada minuto y al leer avisos
  const revisarAvisos = useCallback(() => {
    api('/notificaciones/resumen').then((r) => setNoLeidas(r.no_leidas)).catch(() => {})
  }, [])
  useEffect(() => {
    revisarAvisos()
    const intervalo = setInterval(revisarAvisos, REVISAR_AVISOS_MS)
    return () => clearInterval(intervalo)
  }, [revisarAvisos])

  // Contador de «Mensajes». El administrador no chatea
  const [mensajesSinLeer, setMensajesSinLeer] = useState(0)
  const revisarMensajes = useCallback(() => {
    if (document.hidden) return
    api('/conversaciones/no-leidas').then((r) => setMensajesSinLeer(r.no_leidas)).catch(() => {})
  }, [])
  useEffect(() => {
    if (admin) return undefined
    revisarMensajes()
    const intervalo = setInterval(revisarMensajes, REVISAR_MENSAJES_MS)
    return () => clearInterval(intervalo)
  }, [admin, revisarMensajes])

  const setContraida = (valor) => {
    setContraidaEstado(valor)
    guardarLocal(CLAVE_BARRA, valor)
  }

  return (
    // El admin lleva su propia identidad (barra oscura y tokens --a-*, ver paginas/admin/ui/admin.css)
    <div className={`i-app${contraida ? ' barra-contraida' : ''}${admin ? ' es-admin' : ''}`}>
      <ResumenAdminProvider activo={admin}>
      <AvisoBreveProvider>
      <CambioRolProvider>
      <a href="#contenido" className="i-saltar">Saltar al contenido</a>
      <Navegacion usuario={usuario} cerrarSesion={cerrarSesion} contraida={contraida} setContraida={setContraida} abrirConfig={() => setConfigAbierta(true)}
        abrirAvisos={() => setAvisosAbiertos(true)} noLeidas={noLeidas} mensajesSinLeer={mensajesSinLeer} pathname={pathname} />

      <div id="contenido" className={`i-pagina${pathname === '/' ? ' es-inicio' : ''}`} tabIndex={-1}>
        {/* La página de mensajes avisa al leer, para que el contador baje enseguida */}
        {children ?? <Outlet context={{ revisarMensajes }} />}
      </div>

      <Configuracion abierto={configAbierta} alCerrar={() => setConfigAbierta(false)}
        tema={tema} cambiarTema={cambiarTema} />
      <Avisos abierto={avisosAbiertos} alCerrar={() => setAvisosAbiertos(false)} alCambiar={revisarAvisos} />
      </CambioRolProvider>
      </AvisoBreveProvider>
      </ResumenAdminProvider>
    </div>
  )
}
