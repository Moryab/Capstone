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
  const [error, setError] = useState('')

  useEffect(() => {
    api('/catalogos/perfil')
      .then((catalogo) => setInstituciones(catalogo.instituciones))
      .catch((err) => setError(err.message))
  }, [])

  // Quien ya envió su documento no vuelve a este paso; sigue con el flujo
  if (usuario.verificacion_estado !== 'no_verificado') return <Navigate to="/" replace />

  const alEnviar = async () => {
    await recargarUsuario()
    navegar('/cuestionario', { replace: true })
  }

  return (
    <div className="v-paso">
      <header className="v-paso-cabecera">
        <span className="v-paso-marca"><IconoLogo tamano={36} /> RoomMatch</span>
        <button type="button" className="v-paso-salir" onClick={cerrarSesion}>Cerrar sesión</button>
      </header>
      <main className="tarjeta pagina-form">
        <p className="v-paso-etiqueta">Último paso</p>
        <h1>Confirma que eres estudiante</h1>
        <p className="subtitulo">
          RoomMatch es exclusiva para estudiantes. Sube un documento que lo acredite y un administrador lo revisará.
        </p>
        <p className="v-paso-nota">
          Mientras lo revisamos podrás completar tu perfil y ver alojamientos. Te avisaremos cuando tu cuenta esté verificada.
        </p>
        {error && <p className="alerta" role="alert">{error}</p>}
        {!instituciones && !error && <p className="cargando">Cargando…</p>}
        {instituciones && (
          <FormComprobante instituciones={instituciones} alEnviar={alEnviar} textoEnviar="Enviar y continuar" />
        )}
      </main>
    </div>
  )
}
