import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { CATEGORIAS, MAX_IMPRESCINDIBLES, NIVELES, tituloCategoria } from '../cuestionario.js'
import { useSesion } from '../sesion/SesionContext.jsx'
import { CargandoPerfil } from './LayoutPerfil.jsx'

// Respuestas vacías como '' para que los botones de opción partan sin marcar
const aFormulario = ({ respuestas, importancia }) => ({
  respuestas: Object.fromEntries(CATEGORIAS.map(({ clave }) => [clave, respuestas[clave] ?? ''])),
  importancia,
})

// HU-13: pestaña «Hábitos» de Mi perfil. La primera vez se responde y después se modifica (CA-13.5)
export default function Cuestionario() {
  const { recargarUsuario } = useSesion()
  const [datos, setDatos] = useState(null)
  const [completo, setCompleto] = useState(false)
  const [errores, setErrores] = useState({})
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    api('/cuestionario')
      .then((cuestionario) => {
        setDatos(aFormulario(cuestionario))
        setCompleto(cuestionario.completo)
      })
      .catch((err) => setMensaje({ tipo: 'alerta', texto: err.message }))
  }, [])

  if (!datos) return <CargandoPerfil texto={mensaje.texto} />

  const respondidas = CATEGORIAS.filter(({ clave }) => datos.respuestas[clave]).length
  const imprescindibles = Object.values(datos.importancia).filter((n) => n === 'imprescindible').length

  const responder = (clave, valor) => {
    setDatos({ ...datos, respuestas: { ...datos.respuestas, [clave]: valor } })
    setErrores({ ...errores, [clave]: undefined })
  }

  const priorizar = (clave, nivel) => {
    setDatos({ ...datos, importancia: { ...datos.importancia, [clave]: nivel } })
    setErrores({ ...errores, importancia: undefined, [`importancia.${clave}`]: undefined })
  }

  const enviar = async (e) => {
    e.preventDefault()
    setMensaje({ tipo: '', texto: '' })

    // CA-13.3: sin todas las respuestas no se guarda y se indica cuáles faltan. El backend vuelve a validar
    const faltantes = CATEGORIAS.filter(({ clave }) => !datos.respuestas[clave])
    if (faltantes.length) {
      setErrores(Object.fromEntries(faltantes.map(({ clave }) => [clave, 'Elige una opción'])))
      setMensaje({
        tipo: 'alerta',
        texto: `Falta responder: ${faltantes.map(({ clave }) => tituloCategoria(clave)).join(', ')}.`,
      })
      return
    }

    setEnviando(true)
    try {
      await api('/cuestionario', { metodo: 'PUT', datos: { ...datos.respuestas, importancia: datos.importancia } })
      setErrores({})
      setCompleto(true)
      setMensaje({ tipo: 'exito', texto: 'Tus hábitos de convivencia se guardaron.' }) // CA-13.2
      await recargarUsuario()
    } catch (err) {
      setErrores(err.errores ?? {})
      setMensaje({
        tipo: 'alerta',
        texto: err.errores ? Object.values(err.errores)[0] : err.message,
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="tarjeta pagina-perfil pagina-cuestionario">
      <h1>Hábitos de convivencia</h1>
      <p className="subtitulo">
        Tus respuestas se usan para calcular tu compatibilidad con otros estudiantes. Marca como
        «imprescindible» lo que para ti no es negociable (hasta {MAX_IMPRESCINDIBLES}).
      </p>

      <p className="cuestionario-avance" aria-live="polite">
        {completo ? 'Cuestionario completo. Puedes cambiar tus respuestas cuando quieras.' : `Respondiste ${respondidas} de ${CATEGORIAS.length}`}
      </p>

      <form onSubmit={enviar} noValidate>
        {CATEGORIAS.map(({ clave, titulo, pregunta, opciones }) => {
          const error = errores[clave]
          const nivel = datos.importancia[clave]
          const sinCupo = imprescindibles >= MAX_IMPRESCINDIBLES && nivel !== 'imprescindible'
          return (
            <fieldset key={clave} className={`habito${error ? ' con-error' : ''}`}
              aria-describedby={error ? `${clave}-error` : undefined}>
              <legend>{titulo}</legend>
              <p className="habito-pregunta">{pregunta}</p>
              <div className="habito-opciones">
                {opciones.map(({ valor, texto }) => (
                  <label key={valor} className="habito-opcion">
                    <input type="radio" name={clave} value={valor} checked={datos.respuestas[clave] === valor}
                      onChange={() => responder(clave, valor)} />
                    <span>{texto}</span>
                  </label>
                ))}
              </div>
              {error && <p className="campo-error" id={`${clave}-error`}>{error}</p>}

              <div className="habito-importancia" role="radiogroup" aria-label={`Importancia de ${titulo.toLowerCase()}`}>
                <span>¿Qué tan importante es coincidir con tu roomie?</span>
                <div className="segmentos">
                  {NIVELES.map(({ valor, texto }) => (
                    <label key={valor} className={`segmento${valor === 'imprescindible' && sinCupo ? ' deshabilitado' : ''}`}
                      title={valor === 'imprescindible' && sinCupo ? `Ya marcaste ${MAX_IMPRESCINDIBLES} imprescindibles` : undefined}>
                      <input type="radio" name={`importancia-${clave}`} value={valor} checked={nivel === valor}
                        disabled={valor === 'imprescindible' && sinCupo} onChange={() => priorizar(clave, valor)} />
                      <span>{texto}</span>
                    </label>
                  ))}
                </div>
              </div>
              {errores[`importancia.${clave}`] && <p className="campo-error">{errores[`importancia.${clave}`]}</p>}
            </fieldset>
          )
        })}

        <p className="campo-ayuda cuestionario-contador">
          Imprescindibles: {imprescindibles} de {MAX_IMPRESCINDIBLES}
        </p>

        {mensaje.texto && (
          <p className={mensaje.tipo} role={mensaje.tipo === 'alerta' ? 'alert' : 'status'}>{mensaje.texto}</p>
        )}

        <div className="acciones">
          <Link to="/perfil" className="boton secundario">Ver mi perfil</Link>
          <button type="submit" className="boton" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </main>
  )
}
