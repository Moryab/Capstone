import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api.js'
import Avatar from '../../componentes/Avatar.jsx'
import { mayusculaInicial } from '../../inicio/utilidades.js'
import { formatearFecha } from '../../publicaciones.js'
import './evaluacion.css'

const MAX_COMENTARIO = 300
const NOTAS = [
  { valor: 1, texto: 'Muy mala' },
  { valor: 2, texto: 'Mala' },
  { valor: 3, texto: 'Regular' },
  { valor: 4, texto: 'Buena' },
  { valor: 5, texto: 'Muy buena' },
]
const VACIO = { funciona: null, calificacion: null, comentario: '' }

// Resumen de una evaluación ya enviada (CA-18.6: no se puede volver a evaluar)
function Enviada({ evaluacion, matchId, pedirRazones }) {
  const nota = NOTAS.find((n) => n.valor === evaluacion.calificacion)
  return (
    <section className="evaluacion-enviada" aria-labelledby="titulo-enviada">
      <h2 id="titulo-enviada">Ya evaluaste esta convivencia</h2>
      <dl>
        <dt>¿Está funcionando?</dt>
        <dd>{evaluacion.funciona ? 'Sí' : 'No'}</dd>
        <dt>Calificación</dt>
        <dd>{evaluacion.calificacion} de 5 ({nota?.texto})</dd>
        {evaluacion.comentario && (
          <>
            <dt>Comentario</dt>
            <dd>{evaluacion.comentario}</dd>
          </>
        )}
      </dl>
      {/* CA-18.5: si no funciona, se piden las razones (HU-19) */}
      {pedirRazones ? (
        <div className="evaluacion-razones">
          <p>Cuéntanos qué no funcionó: así RoomMatch te recomendará mejores opciones la próxima vez.</p>
          <Link to={`/evaluacion/${matchId}/razones`} className="boton">Indicar las razones</Link>
        </div>
      ) : (
        <Link to="/propuestas" className="boton secundario">Volver a mis propuestas</Link>
      )}
    </section>
  )
}

// HU-18: evaluación de la convivencia al cumplirse un mes desde la confirmación del match
export default function Evaluacion() {
  const { matchId } = useParams()
  const [resultado, setResultado] = useState({ id: null, datos: null, error: '' })
  const [form, setForm] = useState(VACIO)
  const [errores, setErrores] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState('')

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

  const cambiar = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }))
    setErrores((e) => ({ ...e, [campo]: undefined }))
  }

  const enviar = async (e) => {
    e.preventDefault()
    // Mismos mensajes que el backend, sin esperar la respuesta
    const faltan = {}
    if (form.funciona === null) faltan.funciona = 'Este campo es obligatorio'
    if (form.calificacion === null) faltan.calificacion = 'Este campo es obligatorio'
    if (Object.keys(faltan).length) {
      setErrores(faltan)
      setMensaje('Revisa los campos marcados')
      return
    }
    setEnviando(true)
    setMensaje('')
    try {
      const r = await api(`/evaluaciones/${matchId}`, { metodo: 'POST', datos: form })
      setResultado((res) => ({
        ...res,
        datos: { ...res.datos, mi_evaluacion: r.evaluacion, evaluada: true, pedir_razones: r.pedir_razones },
      }))
      setMensaje(r.mensaje)
    } catch (err) {
      setErrores(err.errores ?? {})
      setMensaje(err.errores ? 'Revisa los campos marcados' : err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="pagina-evaluacion">
      <Link to="/propuestas" className="volver">← Volver</Link>

      <header className="evaluacion-cabecera">
        {otro && <Avatar nombre={otro.nombre} apellido={otro.ap_paterno} foto={otro.foto_url} tamano={56} />}
        <div>
          <p className="publicacion-meta">Tu convivencia en «{datos.publicacion.titulo}»</p>
          <h1>¿Cómo va la convivencia con {nombreOtro}?</h1>
          <p className="subtitulo">Comenzó el {formatearFecha(datos.fecha_inicio)}.</p>
        </div>
      </header>

      {mensaje && datos.mi_evaluacion && <p className="exito" role="status">{mensaje}</p>}

      {datos.mi_evaluacion ? (
        <Enviada evaluacion={datos.mi_evaluacion} matchId={matchId} pedirRazones={datos.pedir_razones} />
      ) : !datos.habilitada ? (
        // CA-18.2
        <section className="evaluacion-espera">
          <h2>Todavía es muy pronto</h2>
          <p>
            Podrás evaluar la convivencia desde el <strong>{formatearFecha(datos.fecha_habilitacion)}</strong>, cuando
            se cumpla un mes. Te avisaremos ese día.
          </p>
        </section>
      ) : (
        <form className="evaluacion-form" onSubmit={enviar} noValidate>
          {/* CA-18.3 */}
          <fieldset aria-describedby={errores.funciona ? 'error-funciona' : undefined}>
            <legend>¿La convivencia está funcionando?</legend>
            <div className="evaluacion-opciones">
              {[{ valor: true, texto: 'Sí, está funcionando' }, { valor: false, texto: 'No, no está funcionando' }].map((o) => (
                <label key={o.texto} className={`evaluacion-opcion${form.funciona === o.valor ? ' elegida' : ''}`}>
                  <input type="radio" name="funciona" checked={form.funciona === o.valor}
                    onChange={() => cambiar('funciona', o.valor)} />
                  {o.texto}
                </label>
              ))}
            </div>
            {errores.funciona && <p id="error-funciona" className="campo-error">{errores.funciona}</p>}
          </fieldset>

          <fieldset aria-describedby={errores.calificacion ? 'error-calificacion' : undefined}>
            <legend>¿Qué nota le pones a la convivencia?</legend>
            <div className="evaluacion-notas">
              {NOTAS.map((n) => (
                <label key={n.valor} className={`evaluacion-nota${form.calificacion === n.valor ? ' elegida' : ''}`}>
                  <input type="radio" name="calificacion" checked={form.calificacion === n.valor}
                    onChange={() => cambiar('calificacion', n.valor)} />
                  <strong>{n.valor}</strong>
                  <span>{n.texto}</span>
                </label>
              ))}
            </div>
            {errores.calificacion && <p id="error-calificacion" className="campo-error">{errores.calificacion}</p>}
          </fieldset>

          <div className="campo">
            <label htmlFor="comentario">Comentario (opcional)</label>
            <textarea id="comentario" rows={4} maxLength={MAX_COMENTARIO} value={form.comentario}
              onChange={(e) => cambiar('comentario', e.target.value)}
              placeholder="Lo que quieras contarnos sobre la convivencia" />
            <p className="campo-ayuda">{form.comentario.length} de {MAX_COMENTARIO} caracteres</p>
            {errores.comentario && <p className="campo-error">{errores.comentario}</p>}
          </div>

          <p className="campo-ayuda">
            {nombreOtro} no ve tu evaluación. La usamos para medir qué tan bien funcionan los match y mejorar
            las recomendaciones.
          </p>
          {mensaje && <p className="alerta" role="alert">{mensaje}</p>}
          <button type="submit" className="boton" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar evaluación'}
          </button>
        </form>
      )}
    </main>
  )
}
