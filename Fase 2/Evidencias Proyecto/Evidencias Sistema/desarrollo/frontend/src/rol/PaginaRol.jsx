import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { IconoLogo } from '../componentes/Logo.jsx'
import '../inicio/inicio.css'
import { borradorDe, PreguntaPresupuesto, PreguntaUbicacion } from '../inicio/preguntasBusqueda.jsx'
import { useSesion } from '../sesion/SesionContext.jsx'
import { useAplicarTema } from '../tema/contexto.js'
import { NOMBRES_ROL } from './CambioRol.jsx'
import { IconoBuscador, IconoOferente } from './iconos.jsx'
import './rol.css'

const OPCIONES = [
  {
    modo: 'buscador',
    Icono: IconoBuscador,
    texto: 'Te proponemos alojamientos publicados por estudiantes compatibles contigo.',
  },
  {
    modo: 'oferente',
    Icono: IconoOferente,
    texto: 'Publica tu habitación o departamento y te proponemos estudiantes compatibles que buscan.',
  },
]

const Check = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
)

/**
 * «¿Qué te trae a RoomMatch?»: después del cuestionario de hábitos, el estudiante elige su rol
 * (modos.py en la API). Buscador → presupuesto y comuna, y se activa la búsqueda. Oferente →
 * publicar su alojamiento. Quien ya tiene rol no vuelve a esta pantalla.
 */
export default function PaginaRol() {
  const { usuario, recargarUsuario, cerrarSesion } = useSesion()
  useAplicarTema()
  const navegar = useNavigate()
  // Solo se revisa al entrar: después de guardar el rol, el paso de preferencias sigue aquí
  const [yaTeniaRol] = useState(Boolean(usuario.modo))
  const [paso, setPaso] = useState('elegir')
  const [elegido, setElegido] = useState(usuario.modo ?? null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [preferencias, setPreferencias] = useState(null)
  const [borrador, setBorrador] = useState(() => borradorDe(null))
  const [comunas, setComunas] = useState([])
  const [institucion, setInstitucion] = useState(null)
  const titulo = useRef(null)

  useEffect(() => {
    document.body.classList.add('pagina-inicio')
    return () => document.body.classList.remove('pagina-inicio')
  }, [])

  // Al cambiar de paso, el foco va al título nuevo (el lector lo anuncia)
  useEffect(() => {
    titulo.current?.focus({ preventScroll: true })
  }, [paso])

  if (yaTeniaRol) return <Navigate to="/" replace />

  const nombre = usuario.nombre.charAt(0).toUpperCase() + usuario.nombre.slice(1)

  const continuar = async () => {
    setEnviando(true)
    setError('')
    try {
      await api('/perfil/modo', { metodo: 'PUT', datos: { modo: elegido } })
      if (elegido === 'oferente') {
        await recargarUsuario()
        navegar('/publicaciones/nueva', { replace: true, state: { desdeBienvenida: true } })
        return
      }
      const [p, catalogo, filtros] = await Promise.all([
        api('/perfil/preferencias-busqueda').catch(() => null),
        api('/catalogos/publicacion').catch(() => ({ comunas: [] })),
        api('/publicaciones/filtros').catch(() => ({ institucion: null })),
      ])
      setPreferencias(p)
      setBorrador(borradorDe(p))
      setComunas(catalogo.comunas)
      setInstitucion(filtros.institucion)
      setPaso('preferencias')
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  // Guarda presupuesto y comuna (si eligió algo) y activa la búsqueda: las primeras propuestas
  // ya usan esas preferencias
  const empezar = async (conPreferencias) => {
    setEnviando(true)
    setError('')
    try {
      if (conPreferencias) {
        await api('/perfil/preferencias-busqueda', {
          metodo: 'PUT', datos: { ...borradorDe(null), ...preferencias, ...borrador },
        })
      }
      await api('/matches/busqueda', { metodo: 'PUT', datos: { buscando: true } })
      await recargarUsuario()
      navegar('/', { replace: true })
    } catch (err) {
      setError(err.errores ? Object.values(err.errores)[0] : err.message)
      setEnviando(false)
    }
  }

  return (
    <div className="i-tokens r-pagina">
      <header className="r-cabecera">
        <span className="r-marca"><IconoLogo tamano={34} /><span>Room<span>Match</span></span></span>
        <button type="button" className="r-salir" onClick={cerrarSesion}>Cerrar sesión</button>
      </header>

      {paso === 'elegir' ? (
        <main key="elegir" className="r-contenido">
          <p className="r-etiqueta">Último paso, {nombre}</p>
          <h1 ref={titulo} tabIndex={-1}>¿Qué te trae a RoomMatch?</h1>
          <p className="r-bajada">Elige uno. Así te mostramos solo lo que te sirve.</p>

          <div className="r-opciones" role="group" aria-label="Qué te trae a RoomMatch">
            {OPCIONES.map(({ modo, Icono, texto }) => (
              <button key={modo} type="button" className="r-opcion" aria-pressed={elegido === modo}
                onClick={() => { setElegido(modo); setError('') }}>
                <span className="r-opcion-ilustracion"><Icono tamano={64} /></span>
                <span className="r-opcion-titulo">{NOMBRES_ROL[modo]}</span>
                <span className="r-opcion-texto">{texto}</span>
                <span className="r-opcion-check" aria-hidden="true"><Check /></span>
              </button>
            ))}
          </div>

          <p className="r-nota">Puedes cambiarlo desde el inicio mientras no tengas un match activo.</p>
          {error && <p className="r-error" role="alert">{error}</p>}
          <button type="button" className="r-boton grande" onClick={continuar} disabled={!elegido || enviando}>
            {enviando ? 'Guardando…' : 'Continuar'}
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </main>
      ) : (
        <main key="preferencias" className="r-contenido">
          <button type="button" className="r-volver" onClick={() => setPaso('elegir')} disabled={enviando}>
            ← Cambiar mi elección
          </button>
          <p className="r-etiqueta">{NOMBRES_ROL.buscador}</p>
          <h1 ref={titulo} tabIndex={-1}>¿Cuánto puedes pagar y dónde?</h1>
          <p className="r-bajada">
            Te propondremos solo alojamientos que calcen. Puedes ajustarlo cuando quieras desde el inicio.
          </p>

          <form className="i-preguntas r-preguntas" onSubmit={(e) => { e.preventDefault(); empezar(true) }}>
            <PreguntaPresupuesto borrador={borrador} cambiar={(c) => setBorrador({ ...borrador, ...c })} />
            <PreguntaUbicacion borrador={borrador} cambiar={(c) => setBorrador({ ...borrador, ...c })}
              comunas={comunas} institucion={institucion} />
            {error && <p className="r-error" role="alert">{error}</p>}
            <div className="r-acciones">
              <button type="submit" className="r-boton grande" disabled={enviando}>
                {enviando ? 'Activando tu búsqueda…' : 'Empezar a buscar'}
              </button>
              <button type="button" className="r-boton-texto" onClick={() => empezar(false)} disabled={enviando}>
                Omitir por ahora
              </button>
            </div>
          </form>
        </main>
      )}
    </div>
  )
}
