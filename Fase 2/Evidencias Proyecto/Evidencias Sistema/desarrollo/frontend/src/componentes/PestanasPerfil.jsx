import { NavLink, useLocation } from 'react-router-dom'

// Pestañas de «Mi perfil». El fondo verde se desliza hacia la pestaña elegida
export default function PestanasPerfil() {
  const { pathname } = useLocation()
  const clase = ({ isActive }) => `pestana${isActive ? ' activa' : ''}`

  return (
    <nav className={`pestanas${pathname === '/perfil/editar' ? ' en-segunda' : ''}`}
      aria-label="Secciones de mi perfil">
      <span className="pestanas-indicador" aria-hidden="true" />
      <NavLink to="/perfil" end className={clase}>Ver perfil</NavLink>
      <NavLink to="/perfil/editar" className={clase}>Editar perfil</NavLink>
    </nav>
  )
}
