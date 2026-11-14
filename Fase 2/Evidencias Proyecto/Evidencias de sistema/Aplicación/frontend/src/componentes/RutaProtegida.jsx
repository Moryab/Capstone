import { Navigate } from 'react-router-dom'
import { useSesion } from '../sesion/SesionContext.jsx'
import { CargaApp } from './CargaPagina.jsx'

// Exige sesión y los pasos obligatorios, en orden: primero verificar el correo con el código, luego
// el cuestionario de convivencia (HU-13), enviar el documento que acredita que es estudiante y
// después elegir su rol (buscador u oferente). Quien no ha hecho un paso vuelve a él desde cualquier
// ruta, salvo desde la página del propio paso (y desde las de los pasos anteriores, que lo indican con sin…)
export default function RutaProtegida({
  children, sinCorreo = false, sinVerificacion = false, sinCuestionario = false, sinRol = false,
}) {
  const { usuario, cargando } = useSesion()
  // Mientras se confirma la sesión: el armazón de la app (nunca una pantalla en blanco)
  if (cargando) return <CargaApp />
  if (!usuario) return <Navigate to="/login" replace />
  // El administrador no usa las páginas de estudiante: tiene su propio panel
  if (usuario.rol === 'administrador') return <Navigate to="/admin" replace />
  // Hasta poner el código que llegó a su correo, la API no le deja hacer nada más
  if (!sinCorreo && !usuario.correo_verificado) return <Navigate to="/verifica-correo" replace />
  if (!sinCuestionario && !usuario.cuestionario_completo) return <Navigate to="/cuestionario" replace />
  // Nunca envió su documento: la plataforma es solo para estudiantes
  if (!sinVerificacion && usuario.verificacion_estado === 'no_verificado') {
    return <Navigate to="/confirma-estudiante" replace />
  }
  if (!sinRol && !usuario.modo) return <Navigate to="/bienvenida" replace />
  return children
}
