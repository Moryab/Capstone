import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import FormLogin from '../componentes/FormLogin.jsx'
import FormRegistro from '../componentes/FormRegistro.jsx'
import { useSesion } from '../sesion/SesionContext.jsx'

// Login y registro en una sola pantalla con panel deslizante ("double slider").
// La URL decide qué lado se ve: /login o /registro, así los enlaces y el botón atrás siguen funcionando
export default function Acceso() {
  const { usuario } = useSesion()
  const { pathname, state } = useLocation()
  const navegar = useNavigate()

  if (usuario) return <Navigate to="/" replace />

  const enRegistro = pathname === '/registro'
  const registrado = state?.registrado

  return (
    <main className={`acceso${enRegistro ? ' registro-activo' : ''}`}>
      {/* `inert` deja fuera del teclado y lectores de pantalla el formulario que está oculto */}
      <section className="panel-form panel-registro" inert={!enRegistro}>
        <FormRegistro />
      </section>

      <section className="panel-form panel-login" inert={enRegistro}>
        {/* La key reinicia el login para precargar el correo recién registrado */}
        <FormLogin key={registrado ?? 'login'} registrado={registrado} />
      </section>

      <div className="overlay-contenedor">
        <div className="overlay">
          <div className="overlay-panel overlay-izquierda" inert={!enRegistro}>
            <h2>¡Bienvenido/a de vuelta!</h2>
            <p>Si ya tienes cuenta, inicia sesión y sigue buscando tu roomie ideal.</p>
            <button type="button" className="boton fantasma" onClick={() => navegar('/login')}>
              Iniciar sesión
            </button>
          </div>
          <div className="overlay-panel overlay-derecha" inert={enRegistro}>
            <h2>¡Hola, futuro roomie!</h2>
            <p>Crea tu cuenta y encuentra alojamiento según tu estilo de convivencia.</p>
            <button type="button" className="boton fantasma" onClick={() => navegar('/registro')}>
              Registrarme
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
