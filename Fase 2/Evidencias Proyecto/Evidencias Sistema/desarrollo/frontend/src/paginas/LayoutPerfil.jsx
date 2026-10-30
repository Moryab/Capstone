import { Outlet, useLocation } from 'react-router-dom'
import PestanasPerfil from '../componentes/PestanasPerfil.jsx'
import { useFondoCiudad } from '../fondo.js'

const NOTAS = {
  '/perfil': 'Este es tu perfil. Con «Ver como me ven» revisas exactamente lo que ven los demás estudiantes.',
  '/perfil/editar': 'Los cambios que guardes se verán al tiro en tu perfil.',
  '/perfil/cuestionario': 'Los demás estudiantes ven tus respuestas y lo que marcaste como imprescindible.',
}

// Mientras carga una pestaña se reserva su espacio, para que la página no salte al aparecer
export function CargandoPerfil({ texto }) {
  // Con un error se muestra el texto; mientras carga, la forma del perfil (skeleton)
  if (texto) return <div className="perfil-cargando" role="status">{texto}</div>
  return (
    <div className="perfil-cargando pv-esqueleto" role="status" aria-label="Cargando tu perfil">
      <span className="pv-esq-portada" />
      <span className="pv-esq-avatar" />
      <span className="pv-esq-linea ancha" />
      <span className="pv-esq-linea" />
      <div className="pv-esq-cuerpo"><span /><span /></div>
    </div>
  )
}

// Marco común de «Mi perfil»: las pestañas, la nota y el fondo se quedan fijos y solo cambia
// el contenido de abajo, que entra con una transición suave
export default function LayoutPerfil() {
  const { pathname } = useLocation()
  useFondoCiudad()

  return (
    <div className="contenedor-perfil">
      <div className="perfil-barra">
        <PestanasPerfil />
        <p className="perfil-nota">{NOTAS[pathname]}</p>
      </div>
      {/* La key reinicia la animación de entrada en cada cambio de pestaña */}
      <div key={pathname} className="pestana-contenido">
        <Outlet />
      </div>
    </div>
  )
}
