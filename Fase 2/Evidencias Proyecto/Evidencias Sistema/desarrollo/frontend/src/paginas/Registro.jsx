import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import Campo from '../componentes/Campo.jsx'

const VACIO = { nombre: '', ap_paterno: '', correo: '', password: '', confirmacion: '' }

// HU-01: registro de estudiante
export default function Registro() {
  const navegar = useNavigate()
  const [datos, setDatos] = useState(VACIO)
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
      await api('/auth/registro', {
        metodo: 'POST',
        datos: { ...datos, ap_paterno: datos.ap_paterno.trim() || null },
      })
      navegar('/login', { state: { registrado: datos.correo } })
    } catch (err) {
      if (err.estado === 409) {
        setErrores({ correo: err.message }) // CA-01.2: correo ya registrado
      } else {
        setErrores(err.errores ?? {})
        setMensaje(err.errores ? 'Revisa los campos marcados' : err.message)
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="tarjeta">
      <h1>Crea tu cuenta</h1>
      <p className="subtitulo">Encuentra alojamiento y roomie según tu estilo de convivencia</p>

      <form onSubmit={enviar} noValidate>
        <div className="fila">
          <Campo etiqueta="Nombre" nombre="nombre" value={datos.nombre} onChange={cambiar}
            error={errores.nombre} autoComplete="given-name" maxLength={60} required />
          <Campo etiqueta="Apellido paterno (opcional)" nombre="ap_paterno" value={datos.ap_paterno}
            onChange={cambiar} error={errores.ap_paterno} autoComplete="family-name" maxLength={60} />
        </div>
        <Campo etiqueta="Correo" nombre="correo" type="email" value={datos.correo} onChange={cambiar}
          error={errores.correo} autoComplete="email" required />
        <Campo etiqueta="Contraseña" nombre="password" type="password" value={datos.password}
          onChange={cambiar} error={errores.password} autoComplete="new-password" required />
        <p className="ayuda">Mínimo 8 caracteres, combinando letras y números.</p>
        <Campo etiqueta="Confirmar contraseña" nombre="confirmacion" type="password"
          value={datos.confirmacion} onChange={cambiar} error={errores.confirmacion}
          autoComplete="new-password" required />

        {mensaje && <p className="alerta" role="alert">{mensaje}</p>}

        <button type="submit" disabled={enviando}>
          {enviando ? 'Creando cuenta…' : 'Registrarme'}
        </button>
      </form>

      <p className="pie">
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </main>
  )
}
