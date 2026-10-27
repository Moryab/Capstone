import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Campo from '../componentes/Campo.jsx'
import { useSesion } from '../sesion/SesionContext.jsx'

// HU-02: inicio de sesión
export default function Login() {
  const { usuario, aviso, iniciarSesion } = useSesion()
  const navegar = useNavigate()
  const registrado = useLocation().state?.registrado

  const [datos, setDatos] = useState({ correo: registrado ?? '', password: '' })
  const [errores, setErrores] = useState({})
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (usuario) return <Navigate to="/" replace />

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
    <main className="tarjeta">
      <h1>Inicia sesión</h1>
      <p className="subtitulo">Bienvenido/a de vuelta a RoomMatch</p>

      {registrado && !mensaje && (
        <p className="exito" role="status">Cuenta creada. Ya puedes iniciar sesión.</p>
      )}
      {aviso && !registrado && !mensaje && <p className="alerta" role="alert">{aviso}</p>}

      <form onSubmit={enviar} noValidate>
        <Campo etiqueta="Correo" nombre="correo" type="email" value={datos.correo} onChange={cambiar}
          error={errores.correo} autoComplete="email" required />
        <Campo etiqueta="Contraseña" nombre="password" type="password" value={datos.password}
          onChange={cambiar} error={errores.password} autoComplete="current-password" required />

        {mensaje && <p className="alerta" role="alert">{mensaje}</p>}

        <button type="submit" disabled={enviando}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>

      <p className="pie">
        ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
      </p>
    </main>
  )
}
