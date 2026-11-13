import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api.js'
import Avatar from '../../componentes/Avatar.jsx'
import { mayusculaInicial } from '../../inicio/utilidades.js'
import { formatearFecha } from '../../publicaciones.js'
import { useSesion } from '../../sesion/SesionContext.jsx'
import './evaluacion.css'
import IlustracionEvaluacion from './IlustracionEvaluacion.jsx'
import { ResumenRazones } from './Razones.jsx'
import SelectorRazones, { aRazones, erroresRazones } from './SelectorRazones.jsx'

const MAX_COMENTARIO = 300
// De peor a mejor: cada nota con su color (rojo → teal)
const NOTAS = [
  { valor: 1, texto: 'Muy mala' },
  { valor: 2, texto: 'Mala' },
  { valor: 3, texto: 'Regular' },
  { valor: 4, texto: 'Buena' },
  { valor: 5, texto: 'Muy buena' },
]
const VACIO = { funciona: null, calificacion: null, comentario: '' }

const NINGUNO = 'Marca los hábitos con problemas o «Ningún problema»'

const Visto = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
)
const Cruz = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" /></svg>
)
const Candado = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
)

// Una parte del formulario, numerada. Al completarla, el número se vuelve un visto
function Seccion({ numero, titulo, descripcion, lista, children }) {
  return (
    <section className="ev-seccion" data-numero={numero} data-lista={lista || undefined} aria-labelledby={`ev-titulo-${numero}`}>
      <header className="ev-seccion-cabeza">
        <span className="ev-numero" aria-hidden="true">{lista ? <Visto /> : numero}</span>
        <div>
          <h2 id={`ev-titulo-${numero}`}>{titulo}</h2>
          {descripcion && <p>{descripcion}</p>}
        </div>
      </header>
      {children}
    </section>
  )
}

// Resumen de una evaluación ya enviada (CA-18.6: no se puede volver a evaluar)
function Enviada({ evaluacion, matchId, pedirRazones, activa, recien }) {
  const nota = NOTAS.find((n) => n.valor === evaluacion.calificacion)
  return (
    <section className={`ev-seccion ev-enviada${recien ? ' recien' : ''}`} aria-labelledby="titulo-enviada">
      <div className="ev-enviada-sello" aria-hidden="true"><Visto /></div>
      <h2 id="titulo-enviada">{recien ? '¡Gracias! Tu evaluación quedó guardada' : 'Ya evaluaste esta convivencia'}</h2>
      <div className="ev-enviada-datos">
        <div className={`ev-dato ${evaluacion.funciona ? 'bien' : 'mal'}`}>
          <span>¿Está funcionando?</span>
          <strong>{evaluacion.funciona ? <><Visto /> Sí, va bien</> : <><Cruz /> No está funcionando</>}</strong>
        </div>
        <div className="ev-dato" data-nota={evaluacion.calificacion}>
          <span>Nota</span>
          <strong><b>{evaluacion.calificacion}</b> de 5 · {nota?.texto}</strong>
        </div>
      </div>
      <div className="ev-enviada-habitos">
        <span>{evaluacion.funciona ? 'Hábitos con roces' : 'Hábitos con problemas'}</span>
        {evaluacion.razones.length ? <ResumenRazones razones={evaluacion.razones} /> : <p>Ninguno: se llevan bien en todo</p>}
        {evaluacion.razon_otra_detalle && <p className="evaluacion-detalle">Otra: {evaluacion.razon_otra_detalle}</p>}
      </div>
      {evaluacion.comentario && <blockquote className="ev-enviada-comentario">{evaluacion.comentario}</blockquote>}
      {/* Evaluaciones antiguas: las razones se pedían en un paso aparte (HU-19) */}
      {pedirRazones ? (
        <div className="evaluacion-razones">
          <p>Cuéntanos qué no funcionó: así RoomMatch te recomendará mejores opciones la próxima vez.</p>
          <Link to={`/evaluacion/${matchId}/razones`} className="boton">Indicar las razones</Link>
        </div>
      ) : (
        <div className="evaluacion-acciones">
          {/* Si no funciona, puede terminarla y quedar libre para un nuevo match */}
          {!evaluacion.funciona && activa && (
            <Link to={`/evaluacion/${matchId}/terminar`} className="boton peligro-suave">Terminar la convivencia</Link>
          )}
          <Link to="/propuestas" className="boton secundario">Volver a mis propuestas</Link>
        </div>
      )}
    </section>
  )
}

// HU-18: evaluación de la convivencia al cumplirse un mes desde la confirmación del match
export default function Evaluacion() {
  const { matchId } = useParams()
  const { usuario } = useSesion()
  const [resultado, setResultado] = useState({ id: null, datos: null, error: '' })
  const [form, setForm] = useState(VACIO)
  const [habitos, setHabitos] = useState({}) // hábito → gravedad
  const [detalle, setDetalle] = useState('')
  const [sinProblemas, setSinProblemas] = useState(false)
  const [errores, setErrores] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [recien, setRecien] = useState(false)

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

  const { datos } = resultado
  const otro = datos.otro
  const nombreOtro = otro ? mayusculaInicial(otro.nombre) : 'tu roomie'
  const dias = Math.max(0, Math.floor((Date.now() - new Date(datos.fecha_inicio)) / 86_400_000))

  const cambiar = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }))
    setErrores((e) => ({ ...e, [campo]: undefined }))
    if (campo === 'funciona' && !valor) setSinProblemas(false) // si no funciona, algo hubo
  }
  const limpiarErroresHabitos = () => setErrores((e) => ({ ...e, razones: undefined, razon_otra_detalle: undefined }))
  // Marcar un hábito quita «Ningún problema», y al revés
  const elegirHabitos = (cambio) => {
    setHabitos(cambio)
    setSinProblemas(false)
  }
  const alternarSinProblemas = () => {
    setSinProblemas((v) => !v)
    setHabitos({})
    limpiarErroresHabitos()
  }

  // Mismos mensajes que el backend: si no funciona, al menos un hábito (CA-19.2); si funciona,
  // los hábitos con roces o «Ningún problema»
  const erroresHabitos = () => {
    if (form.funciona === false) return erroresRazones(habitos, detalle)
    if (!Object.keys(habitos).length && !sinProblemas) return { razones: NINGUNO }
    if (habitos.otra && !detalle.trim()) return { razon_otra_detalle: 'Cuéntanos cuál fue el otro problema' }
    return null
  }

  // Avance: qué partes ya están respondidas (el número de cada sección se vuelve un visto)
  const listo = {
    funciona: form.funciona !== null,
    nota: form.calificacion !== null,
    habitos: form.funciona !== null && !erroresHabitos(),
  }
  const hechas = Object.values(listo).filter(Boolean).length

  const enviar = async (e) => {
    e.preventDefault()
    // Mismos mensajes que el backend, sin esperar la respuesta
    const faltan = {}
    if (form.funciona === null) faltan.funciona = 'Elige una opción'
    if (form.calificacion === null) faltan.calificacion = 'Elige una nota'
    if (form.funciona !== null) Object.assign(faltan, erroresHabitos())
    if (Object.keys(faltan).length) {
      setErrores(faltan)
      setMensaje('Te falta responder lo marcado')
      return
    }
    setEnviando(true)
    setMensaje('')
    try {
      const datosEnvio = { ...form, ...aRazones(habitos, detalle), sin_problemas: Boolean(form.funciona && sinProblemas) }
      const r = await api(`/evaluaciones/${matchId}`, { metodo: 'POST', datos: datosEnvio })
      setResultado((res) => ({
        ...res,
        datos: { ...res.datos, mi_evaluacion: r.evaluacion, evaluada: true, pedir_razones: r.pedir_razones },
      }))
      setRecien(true)
      setMensaje(r.mensaje)
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    } catch (err) {
      setErrores(err.errores ?? {})
      setMensaje(err.errores ? 'Te falta responder lo marcado' : err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="ev">
      <Link to="/propuestas" className="volver">Volver</Link>

      <div className="ev-cuerpo">
        {/* A la izquierda (fija al bajar): con quién, desde cuándo y el avance */}
        <aside className="ev-lateral">
          <div className="ev-portada">
            <IlustracionEvaluacion className="ev-ilustracion" />
            <div className="ev-pareja" aria-hidden="true">
              <Avatar nombre={usuario.nombre} apellido={usuario.ap_paterno} foto={usuario.foto_url} tamano={52} />
              {otro && <Avatar nombre={otro.nombre} apellido={otro.ap_paterno} foto={otro.foto_url} tamano={52} />}
            </div>
            <p className="ev-etiqueta">Evaluación del primer mes</p>
            <h1>¿Cómo va la convivencia con {nombreOtro}?</h1>
            <p className="ev-lugar">En «{datos.publicacion.titulo}»</p>
            <dl className="ev-cifras">
              <div><dt>Juntos desde</dt><dd>{formatearFecha(datos.fecha_inicio)}</dd></div>
              <div><dt>Llevan</dt><dd>{dias} {dias === 1 ? 'día' : 'días'}</dd></div>
            </dl>
          </div>

          {!datos.mi_evaluacion && datos.habilitada && (
            <div className="ev-avance" aria-label="Tu avance">
              <div className="ev-avance-barra" aria-hidden="true"><span style={{ width: `${(hechas / 3) * 100}%` }} /></div>
              <p>{hechas === 3 ? 'Todo listo para enviar' : `${hechas} de 3 respuestas · toma 1 minuto`}</p>
            </div>
          )}
          <p className="ev-privado"><Candado /> {nombreOtro} no ve tu evaluación. La usamos para medir cómo funcionan los match y mejorar tus próximas recomendaciones.</p>
        </aside>

        <div className="ev-contenido">
          {datos.mi_evaluacion ? (
            <Enviada evaluacion={datos.mi_evaluacion} matchId={matchId} pedirRazones={datos.pedir_razones}
              activa={datos.estado === 'confirmado'} recien={recien} />
          ) : !datos.habilitada ? (
            // CA-18.2
            <section className="ev-seccion ev-espera">
              <h2>Todavía es muy pronto</h2>
              <p>
                Podrás evaluar la convivencia desde el <strong>{formatearFecha(datos.fecha_habilitacion)}</strong>, cuando
                se cumpla un mes. Te avisaremos ese día.
              </p>
            </section>
          ) : (
            <form className="ev-form" onSubmit={enviar} noValidate>
              {/* CA-18.3 */}
              <Seccion numero={1} titulo="¿La convivencia está funcionando?" lista={listo.funciona}
                descripcion="Tu primera impresión después de este mes.">
                <div className="ev-sino" role="radiogroup" aria-labelledby="ev-titulo-1"
                  aria-describedby={errores.funciona ? 'error-funciona' : undefined}>
                  {[
                    { valor: true, texto: 'Sí, vamos bien', ayuda: 'Nos acomodamos y funciona', clase: 'bien', Icono: Visto },
                    { valor: false, texto: 'No está funcionando', ayuda: 'Hay cosas que no resultan', clase: 'mal', Icono: Cruz },
                  ].map(({ valor, texto, ayuda, clase, Icono }) => (
                    <label key={texto} className={`ev-opcion ${clase}`} data-elegida={form.funciona === valor || undefined}>
                      <input type="radio" name="funciona" checked={form.funciona === valor} onChange={() => cambiar('funciona', valor)} />
                      <span className="ev-opcion-icono"><Icono /></span>
                      <span className="ev-opcion-texto"><strong>{texto}</strong><small>{ayuda}</small></span>
                    </label>
                  ))}
                </div>
                {errores.funciona && <p id="error-funciona" className="campo-error">{errores.funciona}</p>}
              </Seccion>

              <Seccion numero={2} titulo="Ponle nota a la convivencia" lista={listo.nota}
                descripcion="De 1 (muy mala) a 5 (muy buena).">
                <div className="ev-notas" role="radiogroup" aria-labelledby="ev-titulo-2"
                  aria-describedby={errores.calificacion ? 'error-calificacion' : undefined}>
                  {NOTAS.map((n) => (
                    <label key={n.valor} className="ev-nota" data-nota={n.valor}
                      data-elegida={form.calificacion === n.valor || undefined}
                      data-bajo={form.calificacion != null && n.valor < form.calificacion ? '' : undefined}>
                      <input type="radio" name="calificacion" checked={form.calificacion === n.valor}
                        onChange={() => cambiar('calificacion', n.valor)} />
                      <strong>{n.valor}</strong>
                      <span>{n.texto}</span>
                    </label>
                  ))}
                </div>
                {errores.calificacion && <p id="error-calificacion" className="campo-error">{errores.calificacion}</p>}
              </Seccion>

              {/* Hábitos con problemas: razones si no funciona (HU-19), roces si funciona */}
              <Seccion numero={3} lista={listo.habitos}
                titulo={form.funciona === false ? '¿Con qué hábitos hubo problemas?' : '¿Hubo roces con algún hábito?'}
                descripcion={form.funciona === null
                  ? 'Responde primero si la convivencia funciona.'
                  : form.funciona
                    ? 'Aunque funcione, cuéntanos si algo costó. Marca cada hábito y qué tan grave fue.'
                    : 'Marca uno o más y qué tan grave fue cada uno.'}>
                {form.funciona !== null ? (
                  <div className="evaluacion-habitos">
                    <SelectorRazones elegidas={habitos} setElegidas={elegirHabitos} detalle={detalle} setDetalle={setDetalle}
                      errores={errores} alCambiar={limpiarErroresHabitos} leyenda="Hábitos" sinLeyenda
                      etiquetaOtra="¿Cuál fue el otro problema?"
                      antes={form.funciona && (
                        <label className="ev-ninguno" data-elegida={sinProblemas || undefined}>
                          <input type="checkbox" checked={sinProblemas} onChange={alternarSinProblemas} />
                          <span className="ev-opcion-icono"><Visto /></span>
                          <span className="ev-opcion-texto"><strong>Ningún problema</strong><small>Nos llevamos bien en todo</small></span>
                        </label>
                      )} />
                  </div>
                ) : <div className="ev-bloqueada" aria-hidden="true" />}
              </Seccion>

              <Seccion numero={4} titulo="¿Algo más que contarnos?" descripcion="Opcional. Lo que quieras sobre la convivencia.">
                <div className="campo">
                  <label htmlFor="comentario" className="visualmente-oculto">Comentario (opcional)</label>
                  <textarea id="comentario" rows={2} maxLength={MAX_COMENTARIO} value={form.comentario}
                    onChange={(e) => cambiar('comentario', e.target.value)}
                    placeholder={`Por ejemplo: con ${nombreOtro} nos organizamos bien con el aseo.`} />
                  <p className="campo-ayuda">{form.comentario.length} de {MAX_COMENTARIO} caracteres</p>
                  {errores.comentario && <p className="campo-error">{errores.comentario}</p>}
                </div>
              </Seccion>

              <div className="ev-enviar" data-listo={hechas === 3 || undefined}>
                <p role={mensaje ? 'alert' : 'status'} className={mensaje ? 'error' : undefined}>
                  {mensaje || (hechas === 3 ? 'Listo para enviar' : `Faltan ${3 - hechas} ${3 - hechas === 1 ? 'respuesta' : 'respuestas'}`)}
                </p>
                <button type="submit" className="boton" disabled={enviando}>
                  {enviando ? 'Enviando…' : 'Enviar evaluación'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
