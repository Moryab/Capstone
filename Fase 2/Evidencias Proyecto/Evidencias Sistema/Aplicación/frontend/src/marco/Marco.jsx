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
import AvisosAdmin from './AvisosAdmin.jsx'
import {
  esNuevo, filtrarAvisos, guardarPreferencias, guardarVisto, leerPreferencias, leerVisto, textoAviso,
} from './avisosAdmin.js'
import AvisoNovedades from './AvisoNovedades.jsx'
import Configuracion from './Configuracion.jsx'
import Navegacion from './Navegacion.jsx'
import { ResumenAdminProvider } from './ResumenAdmin.jsx'

const CLAVE_BARRA = 'rm_barra_contraida'
const REVISAR_AVISOS_MS = 60000 // cada cuánto se consulta si hay avisos nuevos
const REVISAR_MENSAJES_MS = 20000 // y si hay mensajes sin leer (la página de mensajes también lo pide al leer)

// Fondo ilustrado de algunas páginas (inicio/inicio.css, «Fondos de página»). Las demás usan el liso
const FONDOS = {
  '/': 'ciudad',
  '/mis-publicaciones': 'ciudad',
  '/publicaciones': 'ciudad', // publicar y editar un alojamiento
  '/mensajes': 'topografia', // también /mensajes/:id
  '/alojamientos': 'ciudad',
  // Perfil: el propio (todas sus pestañas), su vista pública y el de otros estudiantes
  '/perfil': 'ciudad',
  '/perfil-publico': 'ciudad',
  '/usuarios': 'ciudad',
  // Estudiantes conectados entre sí: donde se buscan roomies y se responden los match
  '/roomies': 'conexion',
  '/propuestas': 'conexion',
  '/evaluacion': 'conexion', // evaluar (y terminar) la convivencia
}
const fondoDe = (ruta) => FONDOS[ruta] ?? FONDOS[`/${ruta.split('/')[1]}`]

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
  const [ultimoAviso, setUltimoAviso] = useState(null) // el aviso sin leer más reciente (AvisoNovedades)
  const contenido = useRef(null)
  // Admin: al cambiar de pestaña, el contenido sale desenfocándose y el nuevo se enfoca (transicion.js)
  useTransicionAdmin(contenido, pathname, admin)

  // Admin: qué avisos quiere ver (Configuración) y cuándo abrió la campana por última vez
  const [preferencias, setPreferenciasEstado] = useState(() => leerPreferencias(usuario.id))
  const [visto, setVisto] = useState(() => leerVisto(usuario.id))
  const setPreferencias = (valor) => {
    setPreferenciasEstado(valor)
    guardarPreferencias(usuario.id, valor)
  }
  const marcarVisto = () => {
    const ahora = new Date().toISOString()
    setVisto(ahora)
    guardarVisto(usuario.id, ahora)
  }

  // Contador de la campana: al entrar, cada minuto y al leer avisos. El estudiante cuenta sus avisos
  // sin leer; el administrador, lo que espera revisión y llegó después de su última visita a la campana
  const [avisosAdmin, setAvisosAdmin] = useState(null)
  const revisarAvisos = useCallback(() => {
    if (admin) {
      api('/admin/avisos').then((r) => setAvisosAdmin(r.avisos)).catch(() => {})
      return
    }
    api('/notificaciones/resumen').then((r) => {
      setNoLeidas(r.no_leidas)
      setUltimoAviso(r.ultimo ?? null)
    }).catch(() => {})
  }, [admin])
  useEffect(() => {
    if (!admin || !avisosAdmin) return
    const nuevos = filtrarAvisos(avisosAdmin, preferencias).filter((a) => esNuevo(a, visto))
    setNoLeidas(nuevos.length)
    setUltimoAviso(nuevos[0] ? { id: nuevos[0].id, ...textoAviso(nuevos[0]) } : null)
  }, [admin, avisosAdmin, preferencias, visto])
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

      <div ref={contenido} id="contenido" className={`i-pagina${pathname === '/' ? ' es-inicio' : ''}`} tabIndex={-1}
        data-fondo={admin ? undefined : fondoDe(pathname)}>
        {/* La página de mensajes avisa al leer, para que el contador baje enseguida */}
        {children ?? <Outlet context={{ revisarMensajes }} />}
      </div>

      <Configuracion abierto={configAbierta} alCerrar={() => setConfigAbierta(false)}
        tema={tema} cambiarTema={cambiarTema} preferenciasAvisos={preferencias} cambiarPreferenciasAvisos={setPreferencias} />
      {admin ? (
        <AvisosAdmin abierto={avisosAbiertos} alCerrar={() => setAvisosAbiertos(false)} preferencias={preferencias}
          visto={visto} alVer={marcarVisto} abrirConfig={() => setConfigAbierta(true)} />
      ) : (
        <Avisos abierto={avisosAbiertos} alCerrar={() => setAvisosAbiertos(false)} alCambiar={revisarAvisos} />
      )}
      {/* Novedades: aviso pequeño en la esquina al entrar o cuando llega uno nuevo; lleva a la campana */}
      <AvisoNovedades noLeidas={noLeidas} ultimo={ultimoAviso} panelAbierto={avisosAbiertos}
        abrirAvisos={() => setAvisosAbiertos(true)} />
      </CambioRolProvider>
      </AvisoBreveProvider>
      </ResumenAdminProvider>
    </div>
  )
}
