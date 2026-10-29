import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { guardarLocal, leerLocal } from '../almacenamiento.js'
import '../inicio/inicio.css'
import { useSesion } from '../sesion/SesionContext.jsx'
import { useTema } from '../tema/contexto.js'
import Configuracion from './Configuracion.jsx'
import Navegacion from './Navegacion.jsx'

const CLAVE_BARRA = 'rm_barra_contraida'

/**
 * Marco común de las páginas con sesión: barra lateral (o barra inferior en móvil) y el panel de
 * configuración. Envuelve al inicio (como `children`) y a las demás páginas (con <Outlet />).
 */
export default function Marco({ children }) {
  const { usuario, cerrarSesion } = useSesion()
  const { tema, cambiarTema } = useTema()
  const { pathname } = useLocation()
  const navegar = useNavigate()
  const [contraida, setContraidaEstado] = useState(() => leerLocal(CLAVE_BARRA, false))
  const [configAbierta, setConfigAbierta] = useState(false)

  const setContraida = (valor) => {
    setContraidaEstado(valor)
    guardarLocal(CLAVE_BARRA, valor)
  }

  // «Mis publicaciones» es una tarjeta del inicio: desde ahí se baja hasta ella; desde otra
  // página se va al inicio y el inicio hace la bajada al cargar
  const irAPublicaciones = () => {
    if (pathname !== '/') {
      navegar('/', { state: { ir: 'publicaciones' } })
      return
    }
    const destino = document.getElementById('i-publicaciones')
    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    destino?.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' })
    destino?.focus({ preventScroll: true })
  }

  return (
    <div className={`i-app${contraida ? ' barra-contraida' : ''}`}>
      <a href="#contenido" className="i-saltar">Saltar al contenido</a>
      <Navegacion usuario={usuario} cerrarSesion={cerrarSesion} irAPublicaciones={irAPublicaciones}
        contraida={contraida} setContraida={setContraida} abrirConfig={() => setConfigAbierta(true)}
        enInicio={pathname === '/'} />

      <div id="contenido" className={`i-pagina${pathname === '/' ? ' es-inicio' : ''}`} tabIndex={-1}>
        {children ?? <Outlet />}
      </div>

      <Configuracion abierto={configAbierta} alCerrar={() => setConfigAbierta(false)}
        tema={tema} cambiarTema={cambiarTema} />
    </div>
  )
}
