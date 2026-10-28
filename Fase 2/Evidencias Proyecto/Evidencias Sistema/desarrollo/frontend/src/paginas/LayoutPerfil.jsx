import { Outlet, useLocation } from 'react-router-dom'
import PestanasPerfil from '../componentes/PestanasPerfil.jsx'
import { useFondoCiudad } from '../fondo.js'

const NOTAS = {
  '/perfil': 'Así ven tu perfil los demás estudiantes. Tu correo, teléfono, RUT y dirección no se muestran.',
  '/perfil/editar': 'Los cambios que guardes se verán al tiro en tu perfil.',
}

// Mientras carga una pestaña se reserva su espacio, para que la página no salte al aparecer
export function CargandoPerfil({ texto }) {
  return (
    <div className="perfil-cargando" role="status">
      {texto || 'Cargando tu perfil…'}
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
