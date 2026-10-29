import { Link, Navigate } from 'react-router-dom'
import { esAdmin } from '../sesion/roles.js'
import { useSesion } from '../sesion/SesionContext.jsx'

// Exige sesión y, salvo en el propio cuestionario, el cuestionario de convivencia completo:
// quien no lo ha respondido vuelve a él desde cualquier ruta (HU-13 es obligatorio).
// Los administradores no buscan roomie, así que no se les pide el cuestionario.
// Con `soloAdmin`, quien no es administrador ve un aviso de acceso denegado (CA-22.5)
export default function RutaProtegida({ children, sinCuestionario = false, soloAdmin = false }) {
  const { usuario, cargando } = useSesion()
  if (cargando) return <p className="cargando">Cargando…</p>
  if (!usuario) return <Navigate to="/login" replace />
  if (!sinCuestionario && !esAdmin(usuario) && !usuario.cuestionario_completo) {
    return <Navigate to="/cuestionario" replace />
  }
  if (soloAdmin && !esAdmin(usuario)) {
    return (
      <main className="tarjeta">
        <h1>No tienes acceso</h1>
        <p className="subtitulo">Esta sección es solo para administradores de RoomMatch.</p>
        <Link to="/" className="boton">Volver al inicio</Link>
      </main>
    )
  }
  return children
}
