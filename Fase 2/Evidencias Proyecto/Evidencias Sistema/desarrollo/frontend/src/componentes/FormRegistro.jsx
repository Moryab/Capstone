import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { GENEROS } from '../perfil.js'
import { useSesion } from '../sesion/SesionContext.jsx'
import Campo from './Campo.jsx'

const VACIO = {
  rut: '', nombre: '', ap_paterno: '', ap_materno: '', fecha_nac: '', genero: '',
  correo: '', telefono: '', password: '', confirmacion: '',
}

// Correos personales más comunes: con ellos se recomienda usar el institucional
const PERSONALES = [
  'gmail.com', 'hotmail.com', 'hotmail.cl', 'outlook.com', 'outlook.cl', 'outlook.es', 'live.com',
  'live.cl', 'yahoo.com', 'yahoo.es', 'icloud.com', 'me.com', 'protonmail.com', 'proton.me',
]

/**
 * Indicación bajo el correo: con el correo institucional la cuenta se verifica al instante en el
 * paso «Confirma que eres estudiante»; con uno personal hay que subir un documento. Mismo criterio
 * que el backend: el dominio o un subdominio suyo (p. ej. «alumnos.ubiobio.cl»).
 */
function sugerenciaCorreo(correo, institucionales) {
  const dominio = correo.includes('@') ? correo.split('@').pop().trim().toLowerCase() : ''
  const institucional = institucionales.find((i) => dominio === i.dominio || dominio.endsWith(`.${i.dominio}`))
  if (institucional) {
    return { tipo: 'ok', texto: `✓ Correo de ${institucional.institucion}: verificaremos tu cuenta al instante.` }
  }
  if (PERSONALES.includes(dominio)) {
    return {
      tipo: 'aviso',
      texto: 'Con un correo personal tendrás que subir un documento y esperar a que lo revisemos. '
        + 'Si tienes correo de tu institución, úsalo y te verificamos al instante.',
    }
  }
  return { tipo: '', texto: 'Usa el correo de tu institución (por ejemplo @duocuc.cl o @udec.cl) y te verificamos al instante.' }
}

// HU-01: registro de estudiante
export default function FormRegistro() {
  const navegar = useNavigate()
  const { iniciarSesion } = useSesion()
  const [datos, setDatos] = useState(VACIO)
  const [errores, setErrores] = useState({})
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [institucionales, setInstitucionales] = useState(null)
  const cargandoDominios = useRef(false)

  const cargarDominios = () => {
    if (cargandoDominios.current) return
    cargandoDominios.current = true
    api('/catalogos/correos-institucionales')
      .then(setInstitucionales)
      .catch(() => {}) // el registro sigue igual; solo falta reconocer el correo institucional
      .finally(() => { cargandoDominios.current = false })
  }
  useEffect(cargarDominios, [])

  const sugerencia = sugerenciaCorreo(datos.correo, institucionales ?? [])

  const cambiar = (e) => {
    // Si la primera carga falló (p. ej. la API aún no partía), se reintenta al escribir el dominio
    if (e.target.name === 'correo' && e.target.value.includes('@') && !institucionales) cargarDominios()
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
      // Registro → documento de estudiante → cuestionario de convivencia → rol → inicio: se entra
      // de inmediato y cada paso obligatorio lleva al siguiente.
      // Si el inicio de sesión automático fallara, queda el camino de siempre por el login
      try {
        await iniciarSesion(datos.correo, datos.password)
        navegar('/confirma-estudiante', { replace: true })
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
          onChange={cambiar} error={errores.correo} autoComplete="email" required
          aria-describedby={['reg-correo-sugerencia', errores.correo && 'reg-correo-error'].filter(Boolean).join(' ')} />
        <Campo etiqueta="Teléfono" nombre="telefono" type="tel" value={datos.telefono}
          onChange={cambiar} error={errores.telefono} placeholder="9 1234 5678"
          autoComplete="tel" required />
      </div>
      {/* Fuera de la fila para que el correo y el teléfono sigan alineados */}
      <p id="reg-correo-sugerencia" className={`sugerencia-correo ${sugerencia.tipo}`} aria-live="polite">
        {sugerencia.texto}
      </p>
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
