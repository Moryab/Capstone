import { Link } from 'react-router-dom'
import { useSesion } from '../sesion/SesionContext.jsx'
import { estaVerificado } from '../sesion/verificacion.js'
import './avisoVerificacion.css'

// Lo que se le dice a la cuenta según el estado de su documento
const TEXTOS = {
  pendiente: {
    titulo: 'Estamos revisando tu documento.',
    texto: 'Te avisaremos cuando tu cuenta esté verificada.',
    enlace: 'Ver el estado de mi solicitud',
  },
  rechazado: {
    titulo: 'Tu documento fue rechazado.',
    texto: 'Revisa el motivo y envía otro para usar todas las funciones.',
    enlace: 'Ver el motivo y enviar otro',
  },
  revocado: {
    titulo: 'Tu verificación fue revocada.',
    texto: 'Envía un documento actualizado para usar todas las funciones.',
    enlace: 'Enviar un documento',
  },
}

/**
 * Aviso de acceso limitado mientras la cuenta no está verificada (no es un error: es un paso
 * pendiente). `detalle` explica qué se habilitará en esa página. Con la cuenta verificada no muestra nada.
 */
export default function AvisoVerificacion({ detalle, className = '' }) {
  const { usuario } = useSesion()
  if (estaVerificado(usuario)) return null
  const { titulo, texto, enlace } = TEXTOS[usuario.verificacion_estado] ?? TEXTOS.pendiente
  return (
    <div className={`aviso-verificacion ${className}`.trim()} role="status">
      <p>
        <strong>{titulo}</strong> {texto}
        {detalle && <> {detalle}</>}
      </p>
      <Link to="/perfil/verificacion">{enlace}</Link>
    </div>
  )
}
