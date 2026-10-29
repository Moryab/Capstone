import { Navigate } from 'react-router-dom'
import { useSesion } from '../sesion/SesionContext.jsx'

// Exige sesión y, salvo en el propio cuestionario, el cuestionario de convivencia completo:
// quien no lo ha respondido vuelve a él desde cualquier ruta (HU-13 es obligatorio)
export default function RutaProtegida({ children, sinCuestionario = false }) {
  const { usuario, cargando } = useSesion()
  if (cargando) return <p className="cargando">Cargando…</p>
  if (!usuario) return <Navigate to="/login" replace />
  if (!sinCuestionario && !usuario.cuestionario_completo) return <Navigate to="/cuestionario" replace />
  return children
}
