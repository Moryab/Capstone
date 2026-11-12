import { NavLink, useLocation } from 'react-router-dom'
import { useSesion } from '../sesion/SesionContext.jsx'
import './pestanasPerfil.css'

const PESTANAS = [
  // `corto`: el nombre en el celular, donde las cuatro pestañas comparten un ancho chico
  { a: '/perfil', texto: 'Ver perfil', corto: 'Perfil' },
  { a: '/perfil/editar', texto: 'Editar perfil', corto: 'Editar' },
  { a: '/perfil/cuestionario', texto: 'Hábitos', corto: 'Hábitos' },
  { a: '/perfil/verificacion', texto: 'Verificación', corto: 'Verificación', conEstado: true },
]
// Punto junto a «Verificación»: solo cuando fue rechazada, porque pide una acción (enviar otro
// comprobante). Los demás resultados ya se avisan con la notificación

// Pestañas de «Mi perfil». El fondo verde se desliza hacia la pestaña elegida
export default function PestanasPerfil() {
  const { pathname } = useLocation()
  const { usuario } = useSesion()
  const rechazada = usuario?.verificacion_estado === 'rechazado'
  const clase = ({ isActive }) => `pestana${isActive ? ' activa' : ''}`
  const activa = Math.max(0, PESTANAS.findIndex(({ a }) => a === pathname))

  return (
    <nav className="pestanas" style={{ '--pestana': activa, '--n': PESTANAS.length }} aria-label="Secciones de mi perfil">
      <span className="pestanas-indicador" aria-hidden="true" />
      {PESTANAS.map(({ a, texto, corto, conEstado }) => (
        <NavLink key={a} to={a} end className={clase} aria-label={texto}>
          <span className="pestana-largo" aria-hidden="true">{texto}</span>
          <span className="pestana-corto" aria-hidden="true">{corto}</span>
          {conEstado && rechazada && (
            <span className="pestana-estado" data-estado="rechazado">
              <span className="visualmente-oculto">: rechazada, envía otro comprobante</span>
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
