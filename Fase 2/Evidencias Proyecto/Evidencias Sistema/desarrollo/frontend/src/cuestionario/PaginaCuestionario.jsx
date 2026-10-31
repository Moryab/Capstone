import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { IconoLogo } from '../componentes/Logo.jsx'
import { lanzarConfeti } from '../inicio/confeti.js'
import { gsap, prefiereSinMovimiento } from '../landing/animaciones.js'
import { useSesion } from '../sesion/SesionContext.jsx'
import { useAplicarTema } from '../tema/contexto.js'
import { aEstado, aPerfil, CATEGORIAS, CORTOS, pasosHechos, primerPendiente, TOTAL } from './datos.js'
import Fondo from './Fondo.jsx'
import Flujo from './Flujo.jsx'
import { IlustracionOpcion, IlustracionPaso } from './ilustraciones.jsx'
import Resumen from './Resumen.jsx'
import './cuestionario.css'

// Una ilustración por categoría para la bienvenida
const MUESTRA = {
  horario_sueno: 'tarde', horario_estudio: 'noche', orden_limpieza: 'alto', ruido: 'bajo',
  visitas: 'ocasional', fumar: 'fuma', mascotas: 'tiene',
}

function Bienvenida({ nombre, respondidas, alEmpezar }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    if (prefiereSinMovimiento()) return undefined
    const contexto = gsap.context(() => {
      gsap.from('.c-bienvenida > *', { y: 24, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out' })
      gsap.from('.c-chip', { scale: 0.6, opacity: 0, duration: 0.45, stagger: 0.05, delay: 0.35, ease: 'back.out(2.2)' })
    }, ref)
    return () => contexto.revert()
  }, [])
  const retoma = respondidas > 0

  return (
    <main ref={ref} className="c-bienvenida" aria-labelledby="c-titulo-bienvenida">
      <p className="c-etiqueta">Hola, {nombre}</p>
      <h1 id="c-titulo-bienvenida">Conozcámonos para encontrar a tu roomie ideal</h1>
      <p className="c-bienvenida-texto">
        Son <strong>{TOTAL} preguntas rápidas</strong>, unos <strong>3 minutos</strong>. Primero tus estudios
        y de dónde eres; después, cómo te gusta vivir. Con eso calculamos qué tan compatible eres con
        otros estudiantes, así RoomMatch puede proponerte a quien mejor se acomoda a tu forma de vivir.
      </p>
      <ul className="c-chips" aria-label="Temas del cuestionario">
        <li className="c-chip"><IlustracionPaso tipo="estudios" />Estudios</li>
        <li className="c-chip"><IlustracionPaso tipo="origen" />Origen</li>
        {CATEGORIAS.map(({ clave }) => (
          <li key={clave} className="c-chip">
            <IlustracionOpcion categoria={clave} valor={MUESTRA[clave]} />
            {CORTOS[clave]}
          </li>
        ))}
      </ul>
      <p className="c-bienvenida-nota">Tu avance se guarda solo. Puedes cambiar tus respuestas cuando quieras desde tu perfil.</p>
      <button type="button" className="c-boton grande" onClick={alEmpezar}>
        {retoma ? `Continuar (pregunta ${Math.min(respondidas + 1, TOTAL)} de ${TOTAL})` : 'Empezar'}
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </button>
    </main>
  )
}

/**
 * Cuestionario obligatorio (HU-13) a pantalla completa: bienvenida → 7 preguntas → resumen.
 * Quien aún no lo completa llega aquí desde cualquier ruta (ver RutaProtegida) y retoma donde quedó.
 */
export default function PaginaCuestionario() {
  const { usuario, recargarUsuario, cerrarSesion } = useSesion()
  useAplicarTema(true) // recién registrado: siempre en claro; el tema se elige ya dentro de la app
  const navegar = useNavigate()
  // Se mira al entrar: al completarlo aquí no se debe redirigir antes de mostrar el resumen
  const [yaCompleto] = useState(usuario.cuestionario_completo)
  const [estado, setEstado] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [catalogo, setCatalogo] = useState(null)
  const [error, setError] = useState('')
  const [fase, setFase] = useState('bienvenida') // bienvenida | preguntas | final | editar
  const [claveFondo, setClaveFondo] = useState(null)
  const [editando, setEditando] = useState(0)
  const final = useRef(null)
  const confeti = useRef(null)

  useEffect(() => {
    document.body.classList.add('pagina-cuestionario-c')
    return () => document.body.classList.remove('pagina-cuestionario-c')
  }, [])

  useEffect(() => {
    if (yaCompleto) return
    Promise.all([api('/cuestionario'), api('/perfil'), api('/catalogos/perfil')])
      .then(([cuestionario, datosPerfil, opciones]) => {
        setPerfil(aPerfil(datosPerfil))
        setCatalogo(opciones)
        setEstado(aEstado(cuestionario))
      })
      .catch((err) => setError(err.message))
  }, [yaCompleto])

  // Celebración al llegar al resumen
  useLayoutEffect(() => {
    if (fase !== 'final') return undefined
    window.scrollTo({ top: 0 })
    final.current?.querySelector('h1')?.focus({ preventScroll: true })
    const t = setTimeout(() => lanzarConfeti(confeti.current), 250)
    if (prefiereSinMovimiento()) return () => clearTimeout(t)
    const contexto = gsap.context(() => {
      // El sello tiene su propia animación de CSS
      gsap.from('.c-final-cabecera > :not(.c-final-sello)', { y: 20, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out' })
      gsap.from('.c-resumen-item', { y: 16, opacity: 0, duration: 0.45, stagger: 0.05, delay: 0.3, ease: 'power2.out' })
    }, final)
    return () => {
      clearTimeout(t)
      contexto.revert()
    }
  }, [fase])

  // Autoguardado de cada respuesta. También se copia aquí, por si vuelve a la bienvenida y retoma
  const guardarAvance = useCallback((cambio) => {
    const { importancia, ...respuestas } = cambio
    setEstado((previo) => ({
      respuestas: { ...previo.respuestas, ...respuestas },
      importancia: { ...previo.importancia, ...importancia },
    }))
    return api('/cuestionario', { metodo: 'PATCH', datos: cambio })
  }, [])

  // Pasos 1 y 2: estudios u origen se guardan en el perfil
  const guardarPerfil = useCallback(async (tipo, datos) => {
    const campos = tipo === 'estudios'
      ? {
        institucion_id: datos.institucion_id,
        sede: datos.sede,
        carrera: datos.carrera.trim(),
        anio_ingreso: datos.anio_ingreso === '' ? null : Number(datos.anio_ingreso),
      }
      : { ciudad_origen: datos.ciudad_origen.trim(), region_origen: datos.region_origen, direccion: datos.direccion.trim() }
    await api(`/perfil/${tipo}`, { metodo: 'PUT', datos: campos })
    setPerfil((previo) => ({ ...previo, ...datos }))
  }, [])

  // La última respuesta completa el cuestionario: se guarda todo y se recalcula la compatibilidad
  const guardarTodo = useCallback(async (nuevo) => {
    setError('')
    try {
      await api('/cuestionario', { metodo: 'PUT', datos: { ...nuevo.respuestas, importancia: nuevo.importancia } })
      setEstado(nuevo)
      await recargarUsuario()
      setClaveFondo(null)
      setFase('final')
    } catch (err) {
      setError(err.errores ? Object.values(err.errores)[0] : err.message)
    }
  }, [recargarUsuario])

  if (yaCompleto) return <Navigate to="/perfil/cuestionario" replace />

  const respondidas = estado ? pasosHechos(estado.respuestas, perfil) : 0

  return (
    <div className="c-pagina">
      <Fondo clave={fase === 'preguntas' || fase === 'editar' ? claveFondo : null} />

      <header className="c-cabecera">
        <span className="c-marca"><IconoLogo tamano={36} /><span>Room<span>Match</span></span></span>
        <button type="button" className="c-salir" onClick={cerrarSesion}>Cerrar sesión</button>
      </header>

      {error && <p className="c-error" role="alert">{error}</p>}
      {!estado && !error && <p className="c-cargando" role="status">Cargando tu cuestionario…</p>}

      {estado && fase === 'bienvenida' && (
        <Bienvenida nombre={usuario.nombre.charAt(0).toUpperCase() + usuario.nombre.slice(1)}
          respondidas={respondidas} alEmpezar={() => setFase('preguntas')} />
      )}

      {estado && fase === 'preguntas' && (
        <Flujo estadoInicial={estado} indiceInicial={primerPendiente(estado.respuestas, perfil)}
          conPerfil perfilInicial={perfil} catalogo={catalogo} guardarPerfil={guardarPerfil}
          guardar={guardarAvance} alTerminar={guardarTodo} alCambiarIndice={setClaveFondo}
          alSalir={() => setFase('bienvenida')} textoTerminar="Terminar" />
      )}

      {estado && fase === 'editar' && (
        <Flujo key={editando} estadoInicial={estado} indiceInicial={editando} modo="una"
          alTerminar={guardarTodo} alCambiarIndice={setClaveFondo} alSalir={() => { setClaveFondo(null); setFase('final') }}
          textoTerminar="Guardar cambio" />
      )}

      {estado && fase === 'final' && (
        <main ref={final} className="c-final">
          <span ref={confeti} className="c-confeti-origen" aria-hidden="true" />
          <div className="c-final-cabecera">
            <span className="c-final-sello" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.6"
                strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            </span>
            <h1 tabIndex={-1}>¡Listo! Ya te conocemos mejor</h1>
            <p>Con esto calculamos tu compatibilidad con otros estudiantes. Revisa tus respuestas y cambia la que quieras.</p>
          </div>
          <Resumen estado={estado} alEditar={(i) => { setEditando(i); setFase('editar') }} />
          {/* Sin rol todavía, el inicio lleva a elegirlo («¿Qué te trae a RoomMatch?») */}
          <button type="button" className="c-boton grande" onClick={() => navegar('/', { replace: true })}>
            {usuario.modo ? 'Ir a mi inicio' : 'Continuar'}
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </main>
      )}
    </div>
  )
}
