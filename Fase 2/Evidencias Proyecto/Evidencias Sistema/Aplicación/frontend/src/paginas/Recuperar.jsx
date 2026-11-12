import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import Campo from '../componentes/Campo.jsx'
import { IconoLogo } from '../componentes/Logo.jsx'
import { useSesion } from '../sesion/SesionContext.jsx'
import { useAplicarTema } from '../tema/contexto.js'
import './verificacion/verificacion.css'

/**
 * «¿Olvidaste tu contraseña?», en dos pasos:
 * 1. Escribe su correo y le llega un código (la respuesta es la misma aunque el correo no exista).
 * 2. Escribe el código y su contraseña nueva. Al terminar vuelve al login con el correo precargado.
 */
export default function Recuperar() {
  const { usuario } = useSesion()
  useAplicarTema(true) // como el login: siempre en claro
  const navegar = useNavigate()
  const { state } = useLocation()
  const [paso, setPaso] = useState('correo')
  const [datos, setDatos] = useState({ correo: state?.correo ?? '', codigo: '', password: '', confirmacion: '' })
  const [errores, setErrores] = useState({})
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
  const [enviando, setEnviando] = useState(false)
  const [espera, setEspera] = useState(0)

  // Cuenta regresiva para poder pedir otro código
  useEffect(() => {
    if (espera <= 0) return undefined
    const reloj = setTimeout(() => setEspera((s) => s - 1), 1000)
    return () => clearTimeout(reloj)
  }, [espera])

  if (usuario) return <Navigate to="/" replace />

  const cambiar = (e) => {
    const { name, value } = e.target
    setDatos({ ...datos, [name]: name === 'codigo' ? value.replace(/\D/g, '').slice(0, 6) : value })
    setErrores({ ...errores, [name]: undefined })
  }

  const pedirCodigo = async (e) => {
    e?.preventDefault()
    setEnviando(true)
    setMensaje({ tipo: '', texto: '' })
    try {
      const respuesta = await api('/auth/recuperar', { metodo: 'POST', datos: { correo: datos.correo } })
      setPaso('codigo')
      setEspera(respuesta.reenviar_en)
      setDatos((d) => ({ ...d, codigo: '' }))
      setMensaje({ tipo: 'exito', texto: respuesta.mensaje })
    } catch (err) {
      setErrores(err.errores ?? {})
      setMensaje({ tipo: 'alerta', texto: err.errores ? 'Revisa el correo' : err.message })
    } finally {
      setEnviando(false)
    }
  }

  const cambiarPassword = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setMensaje({ tipo: '', texto: '' })
    try {
      await api('/auth/recuperar/confirmar', { metodo: 'POST', datos })
      navegar('/login', { replace: true, state: { passwordCambiada: datos.correo } })
    } catch (err) {
      setErrores(err.errores ?? {})
      setMensaje({ tipo: 'alerta', texto: err.errores ? (err.errores.codigo ?? 'Revisa los campos marcados') : err.message })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="v-paso">
      <header className="v-paso-cabecera">
        <span className="v-paso-marca"><IconoLogo tamano={36} /> RoomMatch</span>
        <Link className="v-paso-salir" to="/login">Volver al inicio de sesión</Link>
      </header>
      <main className="tarjeta pagina-form">
        <h1>¿Olvidaste tu contraseña?</h1>

        {paso === 'correo' ? (
          <form onSubmit={pedirCodigo} noValidate>
            <p className="subtitulo">
              Escribe el correo de tu cuenta y te enviaremos un código para crear una contraseña nueva.
            </p>
            <Campo etiqueta="Correo" nombre="correo" type="email" value={datos.correo} onChange={cambiar}
              error={errores.correo} autoComplete="email" autoFocus required />
            {mensaje.texto && <p className={mensaje.tipo} role="alert">{mensaje.texto}</p>}
            <div className="acciones">
              <button type="submit" className="boton" disabled={enviando || !datos.correo}>
                {enviando ? 'Enviando…' : 'Enviar código'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={cambiarPassword} noValidate>
            <p className="subtitulo">
              Escribe el código que llegó a <strong className="v-correo-destino">{datos.correo}</strong> y
              tu contraseña nueva.
            </p>
            <p className="v-paso-nota">Si no lo ves, revisa la carpeta de spam. El código vence en 15 minutos.</p>
            <Campo etiqueta="Código" nombre="codigo" value={datos.codigo} onChange={cambiar}
              error={errores.codigo} inputMode="numeric" autoComplete="one-time-code" placeholder="123456"
              maxLength={6} className="v-codigo" autoFocus required />
            <Campo etiqueta="Contraseña nueva" nombre="password" type="password" value={datos.password}
              onChange={cambiar} error={errores.password} autoComplete="new-password"
              ayuda="Al menos 8 caracteres, con letras y números" required />
            <Campo etiqueta="Confirmar contraseña nueva" nombre="confirmacion" type="password"
              value={datos.confirmacion} onChange={cambiar} error={errores.confirmacion}
              autoComplete="new-password" required />
            {mensaje.texto && <p className={mensaje.tipo} role={mensaje.tipo === 'alerta' ? 'alert' : 'status'}>{mensaje.texto}</p>}
            <div className="acciones">
              <button type="submit" className="boton"
                disabled={enviando || datos.codigo.length !== 6 || !datos.password || !datos.confirmacion}>
                {enviando ? 'Guardando…' : 'Cambiar contraseña'}
              </button>
            </div>
            <div className="v-correo-opciones">
              <button type="button" className="boton secundario" onClick={() => pedirCodigo()} disabled={espera > 0}>
                {espera > 0 ? `Reenviar código en ${espera} s` : 'Reenviar código'}
              </button>
              <button type="button" className="boton secundario"
                onClick={() => { setPaso('correo'); setMensaje({ tipo: '', texto: '' }) }}>
                Usar otro correo
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
