import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api } from '../../api.js'
import { IconoLogo } from '../../componentes/Logo.jsx'
import { useSesion } from '../../sesion/SesionContext.jsx'
import { useAplicarTema } from '../../tema/contexto.js'
import FormComprobante from './FormComprobante.jsx'
import './verificacion.css'

/**
 * Paso obligatorio del registro: RoomMatch es solo para estudiantes. Va antes del cuestionario y no
 * se puede saltar; mientras la cuenta no haya enviado un documento, RutaProtegida la trae de vuelta.
 * Flujo: registro → este paso → cuestionario → rol → inicio.
 */
export default function PasoVerificacion() {
  const { usuario, recargarUsuario, cerrarSesion } = useSesion()
  useAplicarTema(true) // igual que el cuestionario: siempre en claro
  const navegar = useNavigate()
  const [instituciones, setInstituciones] = useState(null)
  const [verificacion, setVerificacion] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api('/catalogos/perfil'), api('/verificacion')])
      .then(([catalogo, verificacionApi]) => {
        setInstituciones(catalogo.instituciones)
        setVerificacion(verificacionApi)
      })
      .catch((err) => setError(err.message))
  }, [])

  // Quien ya envió su documento no vuelve a este paso; sigue con el flujo
  if (usuario.verificacion_estado !== 'no_verificado') return <Navigate to="/" replace />

  const alEnviar = async () => {
    await recargarUsuario()
    navegar('/', { replace: true })
  }

  return (
    // Mismo fondo de ondas y tarjeta de vidrio que «Verifica tu correo»
    <div className="v-paso v-paso-ondas">
      <header className="v-paso-cabecera">
        <span className="v-paso-marca"><IconoLogo tamano={36} /> RoomMatch</span>
        <button type="button" className="v-paso-salir" onClick={cerrarSesion}>Cerrar sesión</button>
      </header>
      <main className="tarjeta pagina-form">
        <p className="v-paso-etiqueta">Ya casi terminas</p>
        <h1>Confirma que eres estudiante</h1>
        <p className="subtitulo">
          RoomMatch es exclusiva para estudiantes. Si te registraste con el correo de tu institución te
          verificamos al instante; si no, sube un documento que lo acredite y un administrador lo revisará.
        </p>
        <p className="v-paso-nota">
          Mientras revisamos un documento podrás completar tu perfil y ver alojamientos. Te avisaremos cuando tu cuenta esté verificada.
        </p>
        {error && <p className="alerta" role="alert">{error}</p>}
        {(!instituciones || !verificacion) && !error && <p className="cargando">Cargando…</p>}
        {instituciones && verificacion && (
          <FormComprobante instituciones={instituciones} alEnviar={alEnviar} textoEnviar="Enviar y continuar"
            textoCorreo="Verificar y continuar"
            correoInstitucional={verificacion.puede_verificar_correo
              ? { correo: usuario.correo, institucion: verificacion.institucion_correo }
              : null} />
        )}
      </main>
    </div>
  )
}
