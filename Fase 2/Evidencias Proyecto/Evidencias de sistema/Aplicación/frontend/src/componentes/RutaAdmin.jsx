import { Navigate } from 'react-router-dom'
import { useSesion } from '../sesion/SesionContext.jsx'
import { CargaApp } from './CargaPagina.jsx'

// Páginas del panel de administración: solo para el rol administrador. El backend igual valida
// el rol en cada ruta (solo_admin), esto solo evita mostrar pantallas que no le corresponden
export default function RutaAdmin({ children }) {
  const { usuario, cargando } = useSesion()
  // Mientras se confirma la sesión: el armazón de la app (nunca una pantalla en blanco)
  if (cargando) return <CargaApp />
  if (!usuario) return <Navigate to="/login" replace />
  if (usuario.rol !== 'administrador') return <Navigate to="/" replace />
  return children
}
