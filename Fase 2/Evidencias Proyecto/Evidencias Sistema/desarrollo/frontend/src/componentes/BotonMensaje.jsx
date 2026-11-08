import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { IconoMensajes } from '../inicio/iconos.jsx'
import { useSesion } from '../sesion/SesionContext.jsx'
import { estaVerificado } from '../sesion/verificacion.js'
import './botonMensaje.css'

/**
 * «Enviar mensaje»: abre (o retoma) la conversación con otro estudiante y lleva a /mensajes/:id.
 * Con `publicacion` ({ id, titulo, costo_mensual, comuna, foto_url }) el primer mensaje la adjunta.
 * Va en el detalle de un alojamiento ajeno y en el perfil de otro estudiante; nunca en lo propio.
 */
export default function BotonMensaje({ usuarioId, nombre, publicacion, texto = 'Enviar mensaje', className = 'boton' }) {
  const { usuario } = useSesion()
  const navegar = useNavigate()
  const [abriendo, setAbriendo] = useState(false)
  const [error, setError] = useState('')

  // Sin la cuenta verificada no se chatea (la API también lo exige)
  if (!estaVerificado(usuario)) {
    return (
      <p className="campo-ayuda boton-mensaje-ayuda">
        Podrás enviarle mensajes a {nombre} cuando <Link to="/verificacion">tu cuenta esté verificada</Link>.
      </p>
    )
  }

  const abrir = async () => {
    setAbriendo(true)
    setError('')
    try {
      const conv = await api('/conversaciones', { metodo: 'POST', datos: { usuario_id: usuarioId } })
      navegar(`/mensajes/${conv.id}`, { state: publicacion ? { publicacion } : undefined })
    } catch (err) {
      setError(err.message)
      setAbriendo(false)
    }
  }

  return (
    <>
      <button type="button" className={`${className} boton-mensaje`} onClick={abrir} disabled={abriendo}>
        <IconoMensajes /> {abriendo ? 'Abriendo…' : texto}
      </button>
      {error && <p className="campo-error" role="alert">{error}</p>}
    </>
  )
}
