import { NavLink, useLocation } from 'react-router-dom'

const PESTANAS = [
  { a: '/perfil', texto: 'Ver perfil' },
  { a: '/perfil/editar', texto: 'Editar perfil' },
  { a: '/perfil/cuestionario', texto: 'Hábitos' },
]

// Pestañas de «Mi perfil». El fondo verde se desliza hacia la pestaña elegida
export default function PestanasPerfil() {
  const { pathname } = useLocation()
  const clase = ({ isActive }) => `pestana${isActive ? ' activa' : ''}`
  const activa = Math.max(0, PESTANAS.findIndex(({ a }) => a === pathname))

  return (
    <nav className="pestanas" style={{ '--pestana': activa }} aria-label="Secciones de mi perfil">
      <span className="pestanas-indicador" aria-hidden="true" />
      {PESTANAS.map(({ a, texto }) => (
        <NavLink key={a} to={a} end className={clase}>{texto}</NavLink>
      ))}
    </nav>
  )
}
