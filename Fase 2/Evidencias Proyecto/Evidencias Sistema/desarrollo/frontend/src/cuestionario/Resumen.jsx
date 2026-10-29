import { CATEGORIAS, NIVELES } from './datos.js'
import { IconoNivel, IlustracionOpcion } from './ilustraciones.jsx'
import { textoRespuesta } from '../cuestionario.js'

const Lapiz = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></svg>
)

/**
 * «Tu perfil de convivencia»: las 7 respuestas con su ilustración y su importancia; los
 * imprescindibles van destacados. `alEditar(indice)` abre esa pregunta para cambiarla.
 */
export default function Resumen({ estado, alEditar, titulo = 'Tu perfil de convivencia', bajada }) {
  const imprescindibles = CATEGORIAS.filter(({ clave }) => estado.importancia[clave] === 'imprescindible')

  return (
    <section className="c-resumen" aria-labelledby="c-titulo-resumen">
      <header className="c-resumen-cabecera">
        <h2 id="c-titulo-resumen">{titulo}</h2>
        {bajada && <p>{bajada}</p>}
        <p className="c-resumen-imprescindibles">
          {imprescindibles.length
            ? <>Tus imprescindibles: <strong>{imprescindibles.map((c) => c.titulo).join(', ')}</strong></>
            : 'No marcaste imprescindibles: te adaptas con facilidad.'}
        </p>
      </header>
      <ul className="c-resumen-lista">
        {CATEGORIAS.map(({ clave, titulo: categoria }, i) => {
          const nivel = estado.importancia[clave]
          const datosNivel = NIVELES.find((n) => n.valor === nivel)
          return (
            <li key={clave} className={`c-resumen-item nivel-${nivel}`}>
              <span className="c-resumen-ilustracion"><IlustracionOpcion categoria={clave} valor={estado.respuestas[clave]} /></span>
              <span className="c-resumen-textos">
                <span className="c-resumen-categoria">{categoria}</span>
                <strong>{textoRespuesta(clave, estado.respuestas[clave]) || 'Sin responder'}</strong>
                <span className={`c-insignia-nivel ${nivel}`}><IconoNivel nivel={nivel} /> {datosNivel?.titulo}</span>
              </span>
              {alEditar && (
                <button type="button" className="c-editar" onClick={() => alEditar(i)} aria-label={`Editar ${categoria.toLowerCase()}`}>
                  <Lapiz /> <span>Editar</span>
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
