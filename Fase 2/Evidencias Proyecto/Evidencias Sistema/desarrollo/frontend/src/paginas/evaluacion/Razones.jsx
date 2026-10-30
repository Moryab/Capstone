import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api.js'
import './evaluacion.css'
import SelectorRazones, { aRazones, erroresRazones, GRAVEDADES, RAZONES, textoDe } from './SelectorRazones.jsx'

// Razones ya registradas, con su gravedad
export function ResumenRazones({ razones }) {
  return (
    <ul className="razones-resumen">
      {razones.map((r) => (
        <li key={r.razon}>
          <strong>{textoDe(RAZONES, r.razon)}</strong> <span>{textoDe(GRAVEDADES, r.gravedad)}</span>
        </li>
      ))}
    </ul>
  )
}

// HU-19: qué no funcionó en la convivencia, para mejorar las próximas recomendaciones
export default function Razones() {
  const { matchId } = useParams()
  const [resultado, setResultado] = useState({ id: null, datos: null, error: '' })
  const [elegidas, setElegidas] = useState({}) // razón → gravedad
  const [detalle, setDetalle] = useState('')
  const [errores, setErrores] = useState({})
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [guardadas, setGuardadas] = useState(null)

  useEffect(() => {
    let vigente = true
    api(`/evaluaciones/${matchId}`)
      .then((datos) => vigente && setResultado({ id: matchId, datos, error: '' }))
      .catch((err) => vigente && setResultado({ id: matchId, datos: null, error: err.message }))
    return () => {
      vigente = false
    }
  }, [matchId])

  if (resultado.id !== matchId) return <p className="cargando">Cargando…</p>
  if (resultado.error) {
    return (
      <main className="tarjeta">
        <h1>{resultado.error}</h1>
        <Link to="/propuestas" className="boton">Ir a mis propuestas</Link>
      </main>
    )
  }

  const evaluacion = resultado.datos.mi_evaluacion
  const yaIndicadas = guardadas ?? (evaluacion?.razones?.length ? evaluacion.razones : null)

  const enviar = async (e) => {
    e.preventDefault()
    const faltan = erroresRazones(elegidas, detalle)
    if (faltan) {
      setErrores(faltan)
      return
    }
    setEnviando(true)
    setMensaje('')
    try {
      const r = await api(`/evaluaciones/${matchId}/razones`, { metodo: 'POST', datos: aRazones(elegidas, detalle) })
      setGuardadas(r.razones)
      setMensaje(r.mensaje)
    } catch (err) {
      setErrores(err.errores ?? {})
      setMensaje(err.errores ? '' : err.message)
    } finally {
      setEnviando(false)
    }
  }

  let contenido
  if (!evaluacion) {
    contenido = (
      <section className="evaluacion-espera">
        <h2>Primero evalúa la convivencia</h2>
        <p>Las razones se indican después de responder si la convivencia está funcionando.</p>
        <Link to={`/evaluacion/${matchId}`} className="boton">Evaluar convivencia</Link>
      </section>
    )
  } else if (evaluacion.funciona) {
    // CA-19.5
    contenido = (
      <section className="evaluacion-espera">
        <h2>Tu convivencia está funcionando</h2>
        <p>No hace falta indicar razones de incompatibilidad. ¡Qué bueno que vaya bien!</p>
        <Link to="/propuestas" className="boton secundario">Volver a mis propuestas</Link>
      </section>
    )
  } else if (yaIndicadas) {
    contenido = (
      <section className="evaluacion-enviada" aria-labelledby="titulo-razones-listas">
        <h2 id="titulo-razones-listas">Razones registradas</h2>
        <ResumenRazones razones={yaIndicadas} />
        <p>
          RoomMatch dará más peso a estas categorías en tus próximas compatibilidades y propuestas, para
          recomendarte personas con hábitos más parecidos a los tuyos en lo que más te importa.
        </p>
        <div className="evaluacion-acciones">
          {/* Si no funciona, puede terminarla y quedar libre para un nuevo match */}
          {resultado.datos.estado === 'confirmado' && (
            <Link to={`/evaluacion/${matchId}/terminar`} className="boton peligro-suave">Terminar la convivencia</Link>
          )}
          <Link to="/propuestas" className="boton secundario">Volver a mis propuestas</Link>
        </div>
      </section>
    )
  } else {
    contenido = (
      <form className="evaluacion-form" onSubmit={enviar} noValidate>
        <SelectorRazones elegidas={elegidas} setElegidas={setElegidas} detalle={detalle} setDetalle={setDetalle}
          errores={errores} alCambiar={() => setErrores({})} />
        <p className="campo-ayuda">
          Las razones solo las usa RoomMatch para ajustar tus recomendaciones; la otra persona no las ve.
        </p>
        {mensaje && <p className="alerta" role="alert">{mensaje}</p>}
        <button type="submit" className="boton" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Guardar razones'}
        </button>
      </form>
    )
  }

  return (
    <main className="pagina-evaluacion">
      <Link to={`/evaluacion/${matchId}`} className="volver">← Volver a la evaluación</Link>
      <header className="evaluacion-cabecera">
        <div>
          <p className="publicacion-meta">Tu convivencia en «{resultado.datos.publicacion.titulo}»</p>
          <h1>Lamentamos que no haya funcionado</h1>
          <p className="subtitulo">Cuéntanos qué pasó para recomendarte mejores opciones la próxima vez.</p>
        </div>
      </header>
      {guardadas && mensaje && <p className="exito" role="status">{mensaje}</p>}
      {contenido}
    </main>
  )
}
