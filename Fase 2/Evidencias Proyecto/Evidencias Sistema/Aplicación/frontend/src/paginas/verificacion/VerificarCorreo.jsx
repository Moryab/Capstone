import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api } from '../../api.js'
import Campo from '../../componentes/Campo.jsx'
import { IconoLogo } from '../../componentes/Logo.jsx'
import { useSesion } from '../../sesion/SesionContext.jsx'
import { useAplicarTema } from '../../tema/contexto.js'
import './verificacion.css'

/**
 * Primer paso obligatorio después del registro (y después de cambiar el correo en el perfil): escribir
 * el código de 6 dígitos que llegó al correo. Hasta hacerlo, la API no deja usar nada más.
 * Flujo: registro → este paso → cuestionario → confirma que eres estudiante → rol → inicio.
 */
export default function VerificarCorreo() {
  const { usuario, recargarUsuario, cerrarSesion } = useSesion()
  useAplicarTema(true) // igual que los otros pasos: siempre en claro
  const navegar = useNavigate()
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [espera, setEspera] = useState(0)
  const [cambiando, setCambiando] = useState(false)
  const [correoNuevo, setCorreoNuevo] = useState('')
  const [errorCorreo, setErrorCorreo] = useState('')

  useEffect(() => {
    api('/auth/correo').then((estado) => setEspera(estado.reenviar_en)).catch(() => {})
  }, [])

  // Cuenta regresiva para poder pedir otro código
  useEffect(() => {
    if (espera <= 0) return undefined
    const reloj = setTimeout(() => setEspera((s) => s - 1), 1000)
    return () => clearTimeout(reloj)
  }, [espera])

  if (usuario.correo_verificado) return <Navigate to="/" replace />

  const verificar = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setError('')
    setAviso('')
    try {
      await api('/auth/correo/verificar', { metodo: 'POST', datos: { codigo } })
      await recargarUsuario()
      navegar('/', { replace: true })
    } catch (err) {
      setError(err.errores?.codigo ?? err.message)
    } finally {
      setEnviando(false)
    }
  }

  const reenviar = async () => {
    setError('')
    setAviso('')
    try {
      const respuesta = await api('/auth/correo/reenviar', { metodo: 'POST' })
      setAviso(respuesta.mensaje)
      setEspera(respuesta.reenviar_en)
      setCodigo('')
    } catch (err) {
      setError(err.message)
    }
  }

  const cambiarCorreo = async (e) => {
    e.preventDefault()
    setErrorCorreo('')
    setError('')
    setAviso('')
    try {
      const respuesta = await api('/auth/correo', { metodo: 'PUT', datos: { correo: correoNuevo } })
      await recargarUsuario()
      setAviso(respuesta.mensaje)
      setEspera(respuesta.reenviar_en)
      setCambiando(false)
      setCodigo('')
    } catch (err) {
      setErrorCorreo(err.errores?.correo ?? err.message)
    }
  }

  return (
    <div className="v-paso">
      <header className="v-paso-cabecera">
        <span className="v-paso-marca"><IconoLogo tamano={36} /> RoomMatch</span>
        <button type="button" className="v-paso-salir" onClick={cerrarSesion}>Cerrar sesión</button>
      </header>
      <main className="tarjeta pagina-form">
        <p className="v-paso-etiqueta">Un paso más</p>
        <h1>Verifica tu correo</h1>
        <p className="subtitulo">
          Te enviamos un código de 6 dígitos a <strong className="v-correo-destino">{usuario.correo}</strong>.
          Escríbelo aquí para confirmar que el correo es tuyo.
        </p>
        <p className="v-paso-nota">Si no lo ves, revisa la carpeta de spam o correo no deseado. El código vence en 15 minutos.</p>

        <form onSubmit={verificar} noValidate>
          <Campo etiqueta="Código" nombre="codigo" value={codigo} error={error || undefined}
            onChange={(e) => { setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
            inputMode="numeric" autoComplete="one-time-code" placeholder="123456" maxLength={6}
            className="v-codigo" autoFocus required />
          {aviso && <p className="exito" role="status">{aviso}</p>}
          <div className="acciones">
            <button type="submit" className="boton" disabled={enviando || codigo.length !== 6}>
              {enviando ? 'Verificando…' : 'Verificar y continuar'}
            </button>
          </div>
        </form>

        <div className="v-correo-opciones">
          <button type="button" className="boton secundario" onClick={reenviar} disabled={espera > 0}>
            {espera > 0 ? `Reenviar código en ${espera} s` : 'Reenviar código'}
          </button>
          <button type="button" className="boton secundario" onClick={() => setCambiando((c) => !c)}>
            ¿Te equivocaste de correo?
          </button>
        </div>

        {cambiando && (
          <form className="v-correo-cambio" onSubmit={cambiarCorreo} noValidate>
            <Campo etiqueta="Correo correcto" nombre="correo_nuevo" type="email" value={correoNuevo}
              onChange={(e) => { setCorreoNuevo(e.target.value); setErrorCorreo('') }}
              error={errorCorreo || undefined} autoComplete="email" required />
            <div className="acciones">
              <button type="submit" className="boton" disabled={!correoNuevo || espera > 0}>
                {espera > 0 ? `Podrás cambiarlo en ${espera} s` : 'Cambiar y enviar código'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
