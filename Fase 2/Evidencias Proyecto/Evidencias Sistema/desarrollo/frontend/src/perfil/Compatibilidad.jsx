import { Link } from 'react-router-dom'
import { NIVELES_COMPATIBILIDAD } from '../compatibilidad.js'
import { tituloCategoria } from '../cuestionario.js'
import { CATEGORIAS, claseComparacion, corto, mayuscula } from './datos.js'
import { IconoHabito, IconoSello } from './iconos.jsx'

// Anillo con el porcentaje. El número real ya está en el HTML; PaginaPerfil lo anima desde 0
function Anillo({ porcentaje, nivel }) {
  const valor = Math.floor(porcentaje)
  return (
    <div className={`p2-anillo nivel-${nivel}`} role="img" aria-label={`${valor} % de compatibilidad, ${NIVELES_COMPATIBILIDAD[nivel].toLowerCase()}`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="52" className="p2-anillo-fondo" />
        <circle cx="60" cy="60" r="52" className="p2-anillo-avance" pathLength="100" style={{ '--avance': valor }} />
      </svg>
      <span className="p2-anillo-cifra" aria-hidden="true"><strong data-valor={valor}>{valor}</strong>%</span>
    </div>
  )
}

/**
 * Compatibilidad con otro estudiante (CA-16.2), arriba y destacada: anillo, resumen y la
 * comparación «Tú vs …» por categoría, con los datos del cálculo (HU-14). `estado` y `datos`
 * vienen de useCompatibilidad. `vistaPrevia`: el propio perfil visto como lo ven los demás.
 */
export default function Compatibilidad({ estado, datos, nombre, yoCompleto, otroCompleto, vistaPrevia }) {
  const n = mayuscula(nombre)

  if (vistaPrevia) {
    return (
      <section className="p2-tarjeta p2-compat p2-compat-info p2-anima" aria-labelledby="p2-titulo-compat">
        <div className="p2-compat-vacio-icono" aria-hidden="true">%</div>
        <div>
          <h2 id="p2-titulo-compat">Compatibilidad contigo</h2>
          <p>Aquí cada estudiante ve qué tan compatible es contigo y en qué coinciden, según sus respuestas y las tuyas.</p>
        </div>
      </section>
    )
  }

  if (estado !== 'lista') {
    let titulo = 'Calculando compatibilidad…'
    let texto = null
    if (!yoCompleto) {
      titulo = 'Completa tus hábitos para ver tu compatibilidad'
      texto = <>Responde el cuestionario de convivencia y verás qué tan compatible eres con {n}. <Link to="/perfil/cuestionario">Completar mis hábitos</Link></>
    } else if (estado === 'no_disponible') {
      titulo = 'Compatibilidad no disponible'
      texto = otroCompleto
        ? `Aún no hay un cálculo de compatibilidad con ${n}.`
        : `${n} aún no responde el cuestionario de convivencia, así que todavía no se puede comparar.`
    } else if (estado === 'error') {
      titulo = 'No pudimos cargar la compatibilidad'
    }
    return (
      <section className="p2-tarjeta p2-compat p2-compat-info p2-anima" aria-labelledby="p2-titulo-compat" aria-busy={estado === 'cargando'}>
        <div className="p2-compat-vacio-icono" aria-hidden="true">%</div>
        <div>
          <h2 id="p2-titulo-compat">{titulo}</h2>
          {texto && <p>{texto}</p>}
        </div>
      </section>
    )
  }

  const detalle = CATEGORIAS.map(({ clave }) => datos.detalle.find((d) => d.categoria === clave)).filter(Boolean)
  const coinciden = detalle.filter((d) => d.puntaje === 1).length

  return (
    <section className="p2-tarjeta p2-compat p2-anima" aria-labelledby="p2-titulo-compat">
      <div className="p2-compat-resumen">
        <Anillo porcentaje={datos.porcentaje} nivel={datos.nivel} />
        <div className="p2-compat-textos">
          <p className="p2-etiqueta">Tu compatibilidad con {n}</p>
          <h2 id="p2-titulo-compat">{NIVELES_COMPATIBILIDAD[datos.nivel]}</h2>
          <p className="p2-compat-frase">Coinciden en <strong>{coinciden} de {detalle.length}</strong> hábitos de convivencia.</p>
          {datos.descartado && (
            <p className="p2-compat-descarte">
              No se recomiendan como roomies: no coinciden en <strong>{tituloCategoria(datos.categoria_descarte).toLowerCase()}</strong>,
              algo que uno de ustedes marcó como imprescindible.
            </p>
          )}
          <ul className="p2-leyenda" aria-label="Significado de los colores">
            <li className="coincide">Coinciden</li>
            <li className="parecido">Diferencia manejable</li>
            <li className="choque">Choque con imprescindible</li>
          </ul>
        </div>
      </div>

      <ol className="p2-comparacion">
        <li className="p2-comparacion-cabecera" aria-hidden="true">
          <span />
          <span>Tú</span>
          <span>{n}</span>
          <span />
        </li>
        {detalle.map((d) => {
          const { clase, texto } = claseComparacion(d)
          return (
            <li key={d.categoria} className={`p2-comparacion-fila ${clase}`}>
              <span className="p2-comparacion-categoria">
                <span className="p2-comparacion-icono"><IconoHabito clave={d.categoria} tamano={20} /></span>
                {tituloCategoria(d.categoria)}
              </span>
              <span className="p2-comparacion-valor">
                <span className="p2-movil-etiqueta">Tú: </span>{corto(d.categoria, d.mi_respuesta)}
                {d.mi_importancia === 'imprescindible' && <span className="p2-sello-mini" title="Imprescindible para ti"><IconoSello tamano={13} /></span>}
              </span>
              <span className="p2-comparacion-valor">
                <span className="p2-movil-etiqueta">{n}: </span>{corto(d.categoria, d.su_respuesta)}
                {d.su_importancia === 'imprescindible' && <span className="p2-sello-mini" title={`Imprescindible para ${n}`}><IconoSello tamano={13} /></span>}
              </span>
              <span className="p2-comparacion-estado">{texto}</span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
