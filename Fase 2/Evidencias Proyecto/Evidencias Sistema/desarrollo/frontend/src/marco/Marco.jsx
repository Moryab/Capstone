import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { guardarLocal, leerLocal } from '../almacenamiento.js'
import { api } from '../api.js'
import '../inicio/inicio.css'
import { AvisoBreveProvider } from '../componentes/AvisoBreve.jsx'
import '../paginas/admin/ui/admin.css'
import { useTransicionAdmin } from '../paginas/admin/ui/transicion.js'
import { CambioRolProvider } from '../rol/CambioRol.jsx'
import { useSesion } from '../sesion/SesionContext.jsx'
import { useAplicarTema, useTema } from '../tema/contexto.js'
import Avisos from './Avisos.jsx'
import Configuracion from './Configuracion.jsx'
import Navegacion from './Navegacion.jsx'
import { ResumenAdminProvider } from './ResumenAdmin.jsx'

const CLAVE_BARRA = 'rm_barra_contraida'
const REVISAR_AVISOS_MS = 60000 // cada cuánto se consulta si hay avisos nuevos

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
  const contenido = useRef(null)
  // Admin: al cambiar de pestaña, el contenido sale desenfocándose y el nuevo se enfoca (transicion.js)
  useTransicionAdmin(contenido, pathname, admin)

  // Contador de la campana: al entrar, cada minuto y al leer avisos
  const revisarAvisos = useCallback(() => {
    api('/notificaciones/resumen').then((r) => setNoLeidas(r.no_leidas)).catch(() => {})
  }, [])
  useEffect(() => {
    revisarAvisos()
    const intervalo = setInterval(revisarAvisos, REVISAR_AVISOS_MS)
    return () => clearInterval(intervalo)
  }, [revisarAvisos])

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
        abrirAvisos={() => setAvisosAbiertos(true)} noLeidas={noLeidas} pathname={pathname} />

      <div ref={contenido} id="contenido" className={`i-pagina${pathname === '/' ? ' es-inicio' : ''}`} tabIndex={-1}>
        {children ?? <Outlet />}
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
