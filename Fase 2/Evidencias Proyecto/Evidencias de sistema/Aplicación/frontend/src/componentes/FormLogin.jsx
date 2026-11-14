import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Campo from './Campo.jsx'
import { useSesion } from '../sesion/SesionContext.jsx'

// HU-02: inicio de sesión. `registrado` trae el correo recién registrado para precargarlo, y
// `passwordCambiada` el de quien acaba de crear una contraseña nueva («¿Olvidaste tu contraseña?»)
export default function FormLogin({ registrado, passwordCambiada }) {
  const { aviso, iniciarSesion } = useSesion()
  const navegar = useNavigate()

  const [datos, setDatos] = useState({ correo: registrado ?? passwordCambiada ?? '', password: '' })
  const [errores, setErrores] = useState({})
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)

  const cambiar = (e) => {
    setDatos({ ...datos, [e.target.name]: e.target.value })
    setErrores({ ...errores, [e.target.name]: undefined })
  }

  const enviar = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setMensaje('')
    try {
      await iniciarSesion(datos.correo, datos.password)
      navegar('/', { replace: true })
    } catch (err) {
      // 401 credenciales (CA-02.2), 403 cuenta suspendida (CA-02.3), 429 bloqueo por intentos
      setErrores(err.errores ?? {})
      setMensaje(err.errores ? 'Revisa los campos marcados' : err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="form-acceso" onSubmit={enviar} noValidate>
      <h2>Inicia sesión</h2>
      <p className="subtitulo">Bienvenido/a de vuelta a RoomMatch</p>

      {registrado && !mensaje && (
        <p className="exito" role="status">Cuenta creada. Ya puedes iniciar sesión.</p>
      )}
      {passwordCambiada && !mensaje && (
        <p className="exito" role="status">Tu contraseña cambió. Ingresa con la nueva.</p>
      )}
      {aviso && !registrado && !passwordCambiada && !mensaje && <p className="alerta" role="alert">{aviso}</p>}

      <Campo etiqueta="Correo" nombre="correo" type="email" value={datos.correo} onChange={cambiar}
        error={errores.correo} autoComplete="email" required />
      <Campo etiqueta="Contraseña" nombre="password" type="password" value={datos.password}
        onChange={cambiar} error={errores.password} autoComplete="current-password" required />
      <p className="olvide-password">
        <Link to="/recuperar" state={{ correo: datos.correo }}>¿Olvidaste tu contraseña?</Link>
      </p>

      {mensaje && <p className="alerta" role="alert">{mensaje}</p>}

      <button type="submit" className="boton" disabled={enviando}>
        {enviando ? 'Ingresando…' : 'Ingresar'}
      </button>

      {/* En pantallas chicas no hay panel deslizante, así que se cambia con este enlace */}
      <p className="pie solo-movil">
        ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
      </p>
    </form>
  )
}
