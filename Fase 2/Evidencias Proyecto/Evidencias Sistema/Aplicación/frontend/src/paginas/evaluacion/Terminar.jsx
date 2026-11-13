import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api.js'
import Avatar from '../../componentes/Avatar.jsx'
import Confirmar from '../../componentes/Confirmar.jsx'
import { mayusculaInicial } from '../../inicio/utilidades.js'
import { formatearFecha } from '../../publicaciones.js'
import { useSesion } from '../../sesion/SesionContext.jsx'
import './evaluacion.css'
import IlustracionTerminar from './IlustracionTerminar.jsx'
import SelectorRazones, { aRazones, erroresRazones } from './SelectorRazones.jsx'

// Motivos del modelo de datos (matches.motivo_fin)
export const MOTIVOS_FIN = [
  { valor: 'incompatibilidad', texto: 'No funcionó la convivencia', ayuda: 'Nos cuentas qué pasó para recomendarte mejor' },
  { valor: 'termino_arriendo', texto: 'Terminó el arriendo', ayuda: 'El plazo acordado se cumplió' },
  { valor: 'cambio_ciudad', texto: 'Cambio de ciudad', ayuda: 'Uno de los dos se va de la ciudad' },
  { valor: 'fin_estudios', texto: 'Fin de los estudios', ayuda: 'Uno de los dos terminó de estudiar' },
  { valor: 'otro', texto: 'Otro motivo', ayuda: 'Puedes contarlo en el comentario' },
]
const MAX_COMENTARIO = 300

const Trazo = ({ children }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false">{children}</svg>
)
const ICONO_MOTIVO = {
  incompatibilidad: <Trazo><path d="M12 20s-7-4.4-8.7-8.8C2 7.8 4.2 5 7.3 5c2 0 3.4 1 4.7 2.6" /><path d="M12 20s7-4.4 8.7-8.8C22 7.8 19.8 5 16.7 5c-1.6 0-2.8.6-3.9 1.7L14 10l-3 2 2 3" /></Trazo>,
  termino_arriendo: <Trazo><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16M9 15l2 2 4-4" /></Trazo>,
  cambio_ciudad: <Trazo><path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z" /><circle cx="12" cy="11" r="2.2" /></Trazo>,
  fin_estudios: <Trazo><path d="M2 9l10-5 10 5-10 5z" /><path d="M6 11v5c3 2 9 2 12 0v-5M22 9v6" /></Trazo>,
  otro: <Trazo><circle cx="6" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="18" cy="12" r="1.3" /></Trazo>,
}
const Visto = () => <Trazo><path d="M5 12.5l4.5 4.5L19 7.5" /></Trazo>

// Una parte del formulario, numerada (mismo diseño que la evaluación)
function Seccion({ numero, titulo, descripcion, lista, ancho, children }) {
  return (
    <section className="ev-seccion" data-ancho={ancho ? 'todo' : 'medio'} data-lista={lista || undefined}
      aria-labelledby={`tc-titulo-${numero}`}>
      <header className="ev-seccion-cabeza">
        <span className="ev-numero" aria-hidden="true">{lista ? <Visto /> : numero}</span>
        <div>
          <h2 id={`tc-titulo-${numero}`}>{titulo}</h2>
          {descripcion && <p>{descripcion}</p>}
        </div>
      </header>
      {children}
    </section>
  )
}

// Terminar una convivencia: el buscador queda libre para un nuevo match y, si no funcionó, sus
// razones ajustan las próximas recomendaciones (HU-19)
export default function Terminar() {
  const { matchId } = useParams()
  const { usuario, recargarUsuario } = useSesion()
  const [resultado, setResultado] = useState({ id: null, datos: null, error: '' })
  const [motivo, setMotivo] = useState('')
  const [elegidas, setElegidas] = useState({})
  const [detalle, setDetalle] = useState('')
  const [comentario, setComentario] = useState('')
  const [seguirBuscando, setSeguirBuscando] = useState(true)
  const [errores, setErrores] = useState({})
  const [mensaje, setMensaje] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [terminada, setTerminada] = useState(null)

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
  const nombreOtro = datos.otro ? mayusculaInicial(datos.otro.nombre) : 'tu roomie'
  const esBuscador = datos.rol === 'buscador'
  const pedirRazones = motivo === 'incompatibilidad' && !datos.razones_indicadas

  const validar = (e) => {
    e.preventDefault()
    const faltan = !motivo ? { motivo: 'Elige el motivo' } : pedirRazones ? erroresRazones(elegidas, detalle) : null
    setErrores(faltan ?? {})
    if (!faltan) setConfirmando(true)
  }

  const terminar = async () => {
    setEnviando(true)
    setMensaje('')
    try {
      const r = await api(`/matches/${matchId}/terminar`, {
        metodo: 'POST',
        datos: {
          motivo,
          ...(pedirRazones ? aRazones(elegidas, detalle) : {}),
          comentario,
          seguir_buscando: esBuscador && seguirBuscando,
        },
      })
      setTerminada(r.mensaje)
      await recargarUsuario()
    } catch (err) {
      setErrores(err.errores ?? {})
      setMensaje(err.errores ? 'Revisa los campos marcados' : err.message)
    } finally {
      setEnviando(false)
      setConfirmando(false)
    }
  }

  const dias = Math.max(0, Math.floor((Date.now() - new Date(datos.fecha_inicio)) / 86_400_000))
  const razonesListas = !pedirRazones || !erroresRazones(elegidas, detalle)
  const pasos = pedirRazones ? 2 : 1
  const hechos = (motivo ? 1 : 0) + (pedirRazones && motivo && razonesListas ? 1 : 0)
  const n = (base) => base + (pedirRazones ? 1 : 0) // la numeración corre si aparece «qué no funcionó»

  let contenido
  if (terminada) {
    contenido = (
      <section className="ev-seccion ev-enviada recien" aria-labelledby="titulo-terminada">
        <div className="ev-enviada-sello" aria-hidden="true"><Visto /></div>
        <h2 id="titulo-terminada">{terminada}</h2>
        <p className="ev-terminada-texto">
          {esBuscador && seguirBuscando
            ? 'RoomMatch ya está buscando nuevos alojamientos para ti, con lo que aprendimos de esta convivencia.'
            : esBuscador
              ? 'Cuando quieras otro lugar, activa «Estoy buscando alojamiento» en tus propuestas.'
              : 'El cupo volvió a tu alojamiento, así que RoomMatch puede proponérselo a otros estudiantes.'}
        </p>
        <Link to="/propuestas" className="boton">Ir a mis propuestas</Link>
      </section>
    )
  } else if (datos.estado !== 'confirmado') {
    contenido = (
      <section className="ev-seccion ev-espera">
        <h2>Esta convivencia ya terminó</h2>
        {datos.fecha_fin && <p>Terminó el {formatearFecha(datos.fecha_fin)}.</p>}
        <Link to="/propuestas" className="boton secundario">Volver a mis propuestas</Link>
      </section>
    )
  } else {
    contenido = (
      <form className="ev-form" onSubmit={validar} noValidate>
        <Seccion numero={1} ancho titulo="¿Por qué termina la convivencia?" lista={Boolean(motivo)}
          descripcion="Elige el motivo principal.">
          <div className="ev-motivos" role="radiogroup" aria-labelledby="tc-titulo-1"
            aria-describedby={errores.motivo ? 'error-motivo' : undefined}>
            {MOTIVOS_FIN.map((m) => (
              <label key={m.valor} className={`ev-motivo${m.valor === 'incompatibilidad' ? ' mal' : ''}`}
                data-elegida={motivo === m.valor || undefined}>
                <input type="radio" name="motivo" checked={motivo === m.valor}
                  onChange={() => {
                    setMotivo(m.valor)
                    setErrores({})
                  }} />
                <span className="ev-opcion-icono">{ICONO_MOTIVO[m.valor]}</span>
                <strong>{m.texto}</strong>
                <small>{m.ayuda}</small>
              </label>
            ))}
          </div>
          {errores.motivo && <p id="error-motivo" className="campo-error">{errores.motivo}</p>}
          {motivo === 'incompatibilidad' && datos.razones_indicadas && (
            <p className="ev-nota-info">Ya nos contaste qué no funcionó en tu evaluación: lo usaremos para tus próximas recomendaciones.</p>
          )}
        </Seccion>

        {/* HU-19: si no funcionó, sus razones mejoran las próximas recomendaciones */}
        {pedirRazones && (
          <Seccion numero={2} ancho titulo="¿Qué no funcionó?" lista={razonesListas}
            descripcion="Marca uno o más hábitos y qué tan grave fue cada uno. Así te recomendaremos mejor la próxima vez.">
            <div className="evaluacion-habitos">
              <SelectorRazones elegidas={elegidas} setElegidas={setElegidas} detalle={detalle} setDetalle={setDetalle}
                errores={errores} alCambiar={() => setErrores({})} leyenda="Hábitos con problemas" sinLeyenda />
            </div>
          </Seccion>
        )}

        <Seccion numero={n(2)} ancho={!esBuscador} titulo="¿Algo más que contarnos?" descripcion="Opcional.">
          <div className="campo">
            <label htmlFor="comentario-fin" className="visualmente-oculto">Comentario (opcional)</label>
            <textarea id="comentario-fin" rows={3} maxLength={MAX_COMENTARIO} value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Por ejemplo: terminamos bien, solo cambié de sede." />
            <p className="campo-ayuda">{comentario.length} de {MAX_COMENTARIO} caracteres</p>
          </div>
        </Seccion>

        {esBuscador && (
          <Seccion numero={n(3)} titulo="¿Y después?" descripcion="Tú decides si seguimos buscando por ti.">
            <label className="ev-ninguno ev-seguir" data-elegida={seguirBuscando || undefined}>
              <input type="checkbox" checked={seguirBuscando} onChange={(e) => setSeguirBuscando(e.target.checked)} />
              <span className="ev-opcion-icono"><Visto /></span>
              <span className="ev-opcion-texto">
                <strong>Quiero que me propongan otros alojamientos</strong>
                <small>{seguirBuscando ? 'Activaremos tu búsqueda apenas termine' : 'Podrás activarla después desde tus propuestas'}</small>
              </span>
            </label>
          </Seccion>
        )}

        <div className="ev-enviar ev-enviar-peligro" data-listo={hechos === pasos || undefined}>
          <p role={mensaje ? 'alert' : 'status'} className={mensaje ? 'error' : undefined}>
            {mensaje || (hechos === pasos
              ? `Al terminar, le avisaremos a ${nombreOtro} y el cupo volverá al alojamiento.`
              : 'Elige el motivo para continuar')}
          </p>
          <button type="submit" className="boton peligro">Terminar convivencia</button>
        </div>
      </form>
    )
  }

  return (
    <main className="ev">
      <Link to="/propuestas" className="volver">Volver a mis propuestas</Link>

      <div className="ev-cuerpo">
        {/* Franja: con quién, desde cuándo y qué pasa al terminar */}
        <aside className="ev-lateral">
          <div className="ev-portada">
            <IlustracionTerminar className="ev-ilustracion" />
            <div className="ev-pareja" aria-hidden="true">
              <Avatar nombre={usuario.nombre} apellido={usuario.ap_paterno} foto={usuario.foto_url} tamano={44} />
              {datos.otro && <Avatar nombre={datos.otro.nombre} apellido={datos.otro.ap_paterno} foto={datos.otro.foto_url} tamano={44} />}
            </div>
            <p className="ev-etiqueta tc-etiqueta">Terminar convivencia</p>
            <h1>Terminar la convivencia con {nombreOtro}</h1>
            <p className="ev-lugar">En «{datos.publicacion.titulo}»</p>
            <dl className="ev-cifras">
              <div><dt>Juntos desde</dt><dd>{formatearFecha(datos.fecha_inicio)}</dd></div>
              <div><dt>Duró</dt><dd>{dias} {dias === 1 ? 'día' : 'días'}</dd></div>
            </dl>
          </div>
          <ul className="ev-consecuencias" aria-label="Qué pasa al terminar">
            <li>Le avisaremos a {nombreOtro}.</li>
            <li>El cupo vuelve al alojamiento.</li>
            <li>{esBuscador ? 'Quedas libre para un nuevo match.' : `${nombreOtro} queda libre para un nuevo match.`}</li>
            <li>No se puede deshacer.</li>
          </ul>
        </aside>

        <div className="ev-contenido">{contenido}</div>
      </div>

      <Confirmar abierto={confirmando} titulo="¿Terminar la convivencia?"
        mensaje={`Le avisaremos a ${nombreOtro} y el cupo volverá al alojamiento. Esta acción no se puede deshacer.`}
        textoConfirmar="Sí, terminar" textoOcupado="Terminando…" ocupado={enviando}
        onConfirmar={terminar} onCancelar={() => setConfirmando(false)} />
    </main>
  )
}
