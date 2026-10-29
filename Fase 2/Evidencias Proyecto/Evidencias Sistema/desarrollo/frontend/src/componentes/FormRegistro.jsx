import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { GENEROS } from '../perfil.js'
import { useSesion } from '../sesion/SesionContext.jsx'
import Campo from './Campo.jsx'

const VACIO = {
  rut: '', nombre: '', ap_paterno: '', ap_materno: '', fecha_nac: '', genero: '',
  correo: '', telefono: '', password: '', confirmacion: '',
}

// HU-01: registro de estudiante
export default function FormRegistro() {
  const navegar = useNavigate()
  const { iniciarSesion } = useSesion()
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
      await api('/auth/registro', { metodo: 'POST', datos })
      // El formulario sigue montado tras deslizar al login, así que se limpia
      setDatos(VACIO)
      // Registro → cuestionario de convivencia (obligatorio) → inicio: se entra de inmediato.
      // Si el inicio de sesión automático fallara, queda el camino de siempre por el login
      try {
        await iniciarSesion(datos.correo, datos.password)
        navegar('/cuestionario', { replace: true })
      } catch {
        navegar('/login', { state: { registrado: datos.correo } })
      }
    } catch (err) {
      // 422 datos inválidos (CA-01.3) y 409 correo o RUT en uso (CA-01.2) traen errores por campo
      setErrores(err.errores ?? {})
      setMensaje(err.errores ? 'Revisa los campos marcados' : err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="form-acceso" onSubmit={enviar} noValidate>
      <h2>Crea tu cuenta</h2>
      <p className="subtitulo">Encuentra alojamiento y roomie según tu estilo de convivencia</p>

      <div className="fila">
        <Campo etiqueta="Nombre" nombre="nombre" value={datos.nombre} onChange={cambiar}
          error={errores.nombre} autoComplete="given-name" maxLength={60} required />
        <Campo etiqueta="RUT" nombre="rut" value={datos.rut} onChange={cambiar}
          error={errores.rut} placeholder="12.345.678-9" maxLength={12} required />
      </div>
      <div className="fila">
        <Campo etiqueta="Apellido paterno" nombre="ap_paterno" value={datos.ap_paterno}
          onChange={cambiar} error={errores.ap_paterno} autoComplete="family-name" maxLength={60}
          required />
        <Campo etiqueta="Apellido materno" nombre="ap_materno" value={datos.ap_materno}
          onChange={cambiar} error={errores.ap_materno} maxLength={60} required />
      </div>
      <div className="fila">
        <Campo etiqueta="Fecha de nacimiento" nombre="fecha_nac" type="date" value={datos.fecha_nac}
          onChange={cambiar} error={errores.fecha_nac} autoComplete="bday" required />
        <Campo etiqueta="Género" nombre="genero" value={datos.genero} onChange={cambiar}
          error={errores.genero} opciones={GENEROS} required />
      </div>
      <div className="fila">
        <Campo etiqueta="Correo" nombre="correo" id="reg-correo" type="email" value={datos.correo}
          onChange={cambiar} error={errores.correo} autoComplete="email" required />
        <Campo etiqueta="Teléfono" nombre="telefono" type="tel" value={datos.telefono}
          onChange={cambiar} error={errores.telefono} placeholder="9 1234 5678"
          autoComplete="tel" required />
      </div>
      <div className="fila">
        <Campo etiqueta="Contraseña" nombre="password" id="reg-password" type="password"
          value={datos.password} onChange={cambiar} error={errores.password}
          autoComplete="new-password" required />
        <Campo etiqueta="Confirmar contraseña" nombre="confirmacion" type="password"
          value={datos.confirmacion} onChange={cambiar} error={errores.confirmacion}
          autoComplete="new-password" required />
      </div>
      <p className="ayuda">Mínimo 8 caracteres, combinando letras y números.</p>

      {mensaje && <p className="alerta" role="alert">{mensaje}</p>}

      <button type="submit" className="boton" disabled={enviando}>
        {enviando ? 'Creando cuenta…' : 'Registrarme'}
      </button>

      <p className="pie solo-movil">
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </form>
  )
}
