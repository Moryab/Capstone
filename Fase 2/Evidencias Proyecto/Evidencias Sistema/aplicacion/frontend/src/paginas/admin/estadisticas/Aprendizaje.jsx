import { RAZONES, textoDe } from '../../evaluacion/SelectorRazones.jsx'
import { pct } from './Graficos.jsx'

/*
 * EP-08: lo que RoomMatch aprendió sola (GET /admin/estadisticas/algoritmo). El administrador no
 * aprueba nada: ve la versión vigente de los pesos por hábito y cada revisión que hizo la plataforma.
 */

const dosDecimales = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const textoPeso = (valor) => `×${dosDecimales.format(valor)}`
const textoFecha = (iso) => (iso ? new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const habito = (categoria) => textoDe(RAZONES, categoria)

export const ESTADOS_AJUSTE = { aprobado: 'Aplicado', rechazado: 'No aplicado' }
export const textoEstadoAjuste = (a) => (a.cambios.length === 0 ? 'Sin cambios' : ESTADOS_AJUSTE[a.estado] ?? a.estado)

function Pesos({ pesos, maximo }) {
  return (
    <ol className="ap-pesos">
      {pesos.map((p) => {
        const cambio = p.peso > p.peso_inicial ? 'sube' : p.peso < p.peso_inicial ? 'baja' : null
        return (
          <li key={p.categoria}>
            <span className="ap-habito">{habito(p.categoria)}</span>
            <span className="ap-valor" data-cambio={cambio || undefined}>
              {textoPeso(p.peso)}
              {cambio && <span className="visualmente-oculto">{cambio === 'sube' ? ', pesa más que al inicio' : ', pesa menos que al inicio'}</span>}
            </span>
            {/* La marca indica el peso inicial (×1) */}
            <span className="ap-pista" aria-hidden="true" style={{ '--inicio': p.peso_inicial / maximo }}>
              <span style={{ '--avance': p.peso / maximo }} />
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function Revision({ ajuste }) {
  const v = ajuste.validacion
  return (
    <li className="ap-revision">
      <header>
        <span className="ap-chip" data-estado={ajuste.cambios.length ? ajuste.estado : 'sin_cambios'}>{textoEstadoAjuste(ajuste)}</span>
        <span className="ap-version">
          {ajuste.version_propuesta ? `${ajuste.version_base} → ${ajuste.version_propuesta}` : ajuste.version_base}
        </span>
        <span className="ap-meta">{textoFecha(ajuste.fecha)} · {ajuste.casos_analizados} convivencias analizadas</span>
      </header>
      {ajuste.cambios.length > 0 && (
        <ul className="ap-cambios">
          {ajuste.cambios.map((c) => (
            <li key={c.categoria}>
              <strong>{habito(c.categoria)}</strong> {textoPeso(c.peso_actual)} → {textoPeso(c.peso_propuesto)}
              <p>{c.justificacion}</p>
            </li>
          ))}
        </ul>
      )}
      {v && (
        <p className="ap-validacion">
          Validación: éxito de los match que se habrían propuesto, {pct(v.tasa_exito_base)} ({v.matches_base}) con la versión
          anterior y {pct(v.tasa_exito_propuesta)} ({v.matches_propuesta}) con los pesos nuevos.
        </p>
      )}
      {ajuste.observaciones && <p className="ap-observacion">{ajuste.observaciones}</p>}
    </li>
  )
}

export default function Aprendizaje({ datos }) {
  const { version, vigente_desde, pesos, casos_evaluados, proxima_revision_en, reglas, ajustes } = datos
  return (
    <div className="ap">
      <dl className="ap-estado">
        <div><dt>Versión vigente</dt><dd>{version}</dd><small>desde el {textoFecha(vigente_desde)}</small></div>
        <div><dt>Convivencias evaluadas</dt><dd>{casos_evaluados}</dd><small>lo que analiza la plataforma</small></div>
        <div>
          <dt>Próxima revisión</dt>
          <dd>{proxima_revision_en === 0 ? 'Lista' : `Faltan ${proxima_revision_en}`}</dd>
          <small>{proxima_revision_en === 0 ? 'se hace en los próximos minutos' : 'convivencias evaluadas'}</small>
        </div>
      </dl>

      <div className="ap-columnas">
        <section aria-label="Peso actual de cada hábito">
          <h3 className="ap-titulo">Peso de cada hábito</h3>
          <Pesos pesos={pesos} maximo={reglas.peso_max} />
        </section>
        <section aria-label="Revisiones de la plataforma">
          <h3 className="ap-titulo">Últimas revisiones</h3>
          {ajustes.length === 0 ? (
            <p className="ap-vacio">
              Aún no hay revisiones. La primera se hace al llegar a {reglas.minimo_casos_ajuste} convivencias evaluadas.
            </p>
          ) : (
            <ol className="ap-revisiones">{ajustes.map((a) => <Revision key={a.codigo} ajuste={a} />)}</ol>
          )}
        </section>
      </div>

      <p className="m-nota ap-reglas">
        RoomMatch revisa sola los pesos desde las {reglas.minimo_casos_ajuste} convivencias evaluadas y luego cada {reglas.nuevos_casos_revision} nuevas.
        Cambia un hábito solo si, al diferir en él, fracasan al menos {reglas.umbral_diferencia} puntos más convivencias
        (con {reglas.confianza} % de confianza de que no es azar), en pasos de hasta {textoPeso(reglas.paso_maximo).slice(1)} y
        entre {textoPeso(reglas.peso_min)} y {textoPeso(reglas.peso_max)}. Aplica el cambio solo si los match que se habrían
        propuesto con los pesos nuevos no tienen menos éxito.
      </p>
    </div>
  )
}
