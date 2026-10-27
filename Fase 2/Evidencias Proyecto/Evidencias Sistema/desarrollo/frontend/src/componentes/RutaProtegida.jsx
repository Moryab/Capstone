import { Navigate } from 'react-router-dom'
import { useSesion } from '../sesion/SesionContext.jsx'

export default function RutaProtegida({ children }) {
  const { usuario, cargando } = useSesion()
  if (cargando) return <p className="cargando">Cargando…</p>
  if (!usuario) return <Navigate to="/login" replace />
  return children
}
