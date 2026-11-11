import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api.js'
import Confirmar from '../../componentes/Confirmar.jsx'
import { mayusculaInicial } from '../../inicio/utilidades.js'
import { formatearFecha } from '../../publicaciones.js'
import { useSesion } from '../../sesion/SesionContext.jsx'
import './evaluacion.css'
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

// Terminar una convivencia: el buscador queda libre para un nuevo match y, si no funcionó, sus
// razones ajustan las próximas recomendaciones (HU-19)
export default function Terminar() {
  const { matchId } = useParams()
  const { recargarUsuario } = useSesion()
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

  let contenido
  if (terminada) {
    contenido = (
      <section className="evaluacion-enviada">
        <p className="exito" role="status">{terminada}.</p>
        {esBuscador && seguirBuscando ? (
          <p>RoomMatch ya está buscando nuevos alojamientos para ti, con lo que aprendimos de esta convivencia.</p>
        ) : esBuscador ? (
          <p>Cuando quieras otro lugar, activa «Estoy buscando alojamiento» en tus propuestas.</p>
        ) : (
          <p>El cupo volvió a tu alojamiento, así que RoomMatch puede proponérselo a otros estudiantes.</p>
        )}
        <Link to="/propuestas" className="boton">Ir a mis propuestas</Link>
      </section>
    )
  } else if (datos.estado !== 'confirmado') {
    contenido = (
      <section className="evaluacion-espera">
        <h2>Esta convivencia ya terminó</h2>
        {datos.fecha_fin && <p>Terminó el {formatearFecha(datos.fecha_fin)}.</p>}
        <Link to="/propuestas" className="boton secundario">Volver a mis propuestas</Link>
      </section>
    )
  } else {
    contenido = (
      <form className="evaluacion-form" onSubmit={validar} noValidate>
        <fieldset aria-describedby={errores.motivo ? 'error-motivo' : undefined}>
          <legend>¿Por qué termina la convivencia?</legend>
          <div className="terminar-motivos">
            {MOTIVOS_FIN.map((m) => (
              <label key={m.valor} className={`evaluacion-opcion${motivo === m.valor ? ' elegida' : ''}`}>
                <input type="radio" name="motivo" checked={motivo === m.valor}
                  onChange={() => {
                    setMotivo(m.valor)
                    setErrores({})
                  }} />
                <span><strong>{m.texto}</strong><small>{m.ayuda}</small></span>
              </label>
            ))}
          </div>
          {errores.motivo && <p id="error-motivo" className="campo-error">{errores.motivo}</p>}
        </fieldset>

        {/* HU-19: si no funcionó, sus razones mejoran las próximas recomendaciones */}
        {pedirRazones && (
          <SelectorRazones elegidas={elegidas} setElegidas={setElegidas} detalle={detalle} setDetalle={setDetalle}
            errores={errores} alCambiar={() => setErrores({})} />
        )}
        {motivo === 'incompatibilidad' && datos.razones_indicadas && (
          <p className="campo-ayuda">Ya nos contaste qué no funcionó; lo usaremos para tus próximas recomendaciones.</p>
        )}

        <div className="campo">
          <label htmlFor="comentario-fin">Comentario (opcional)</label>
          <textarea id="comentario-fin" rows={3} maxLength={MAX_COMENTARIO} value={comentario}
            onChange={(e) => setComentario(e.target.value)} />
          <p className="campo-ayuda">{comentario.length} de {MAX_COMENTARIO} caracteres</p>
        </div>

        {esBuscador && (
          <label className="casilla">
            <input type="checkbox" checked={seguirBuscando} onChange={(e) => setSeguirBuscando(e.target.checked)} />
            Quiero que RoomMatch me proponga otros alojamientos
          </label>
        )}

        {mensaje && <p className="alerta" role="alert">{mensaje}</p>}
        <button type="submit" className="boton peligro">Terminar convivencia</button>
      </form>
    )
  }

  return (
    <main className="pagina-evaluacion">
      <Link to="/propuestas" className="volver">← Volver a mis propuestas</Link>
      <header className="evaluacion-cabecera">
        <div>
          <p className="publicacion-meta">Tu convivencia en «{datos.publicacion.titulo}»</p>
          <h1>Terminar la convivencia con {nombreOtro}</h1>
          <p className="subtitulo">Comenzó el {formatearFecha(datos.fecha_inicio)}.</p>
        </div>
      </header>
      {contenido}

      <Confirmar abierto={confirmando} titulo="¿Terminar la convivencia?"
        mensaje={`Le avisaremos a ${nombreOtro} y el cupo volverá al alojamiento. Esta acción no se puede deshacer.`}
        textoConfirmar="Sí, terminar" textoOcupado="Terminando…" ocupado={enviando}
        onConfirmar={terminar} onCancelar={() => setConfirmando(false)} />
    </main>
  )
}
