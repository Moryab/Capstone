import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../api.js'
import { RAZONES, textoDe } from '../evaluacion/SelectorRazones.jsx'
import './estadisticas.css'

const MOTIVOS = [
  { valor: 'incompatibilidad', texto: 'Incompatibilidad' },
  { valor: 'termino_arriendo', texto: 'Término del arriendo' },
  { valor: 'cambio_ciudad', texto: 'Cambio de ciudad' },
  { valor: 'fin_estudios', texto: 'Fin de los estudios' },
  { valor: 'otro', texto: 'Otro motivo' },
]

const numero = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 })
const pct = (valor) => (valor == null ? '—' : `${numero.format(valor)} %`)
const nombreMes = (clave) => {
  const [anio, mes] = clave.split('-').map(Number)
  return new Date(anio, mes - 1, 1).toLocaleDateString('es-CL', { month: 'short', year: 'numeric' })
}

// Indicador frente a una meta (CA-20.1): la barra muestra el valor y una marca la meta.
// El estado va escrito, no solo en el color
function Meta({ titulo, valor, meta, detalle }) {
  const cumple = valor != null && valor >= meta
  return (
    <section className="est-tarjeta">
      <h2>{titulo}</h2>
      <p className="est-cifra">{pct(valor)}</p>
      <div className="est-meta" role="img" aria-label={`${pct(valor)} frente a una meta de ${meta} %`}>
        <span className="est-meta-valor" style={{ width: `${Math.min(valor ?? 0, 100)}%` }} />
        <span className="est-meta-marca" style={{ left: `${meta}%` }} />
      </div>
      <p className="est-detalle">
        Meta {meta} % · <strong>{valor == null ? 'Sin datos' : cumple ? 'Meta cumplida' : 'Bajo la meta'}</strong>
      </p>
      <p className="est-detalle">{detalle}</p>
    </section>
  )
}

// CA-20.2: barras agrupadas por mes, con leyenda y la misma información en una tabla
function PorMes({ meses }) {
  const maximo = Math.max(1, ...meses.flatMap((m) => [m.exitosos, m.no_exitosos]))
  return (
    <section className="est-tarjeta est-ancha" aria-labelledby="titulo-por-mes">
      <h2 id="titulo-por-mes">Resultado de los match por mes</h2>
      <ul className="est-leyenda">
        <li><span className="est-muestra exitoso" aria-hidden="true" /> Exitosos</li>
        <li><span className="est-muestra no-exitoso" aria-hidden="true" /> No exitosos</li>
      </ul>
      <div className="est-columnas" role="img" aria-label="Gráfico de barras por mes; los mismos datos están en la tabla">
        {meses.map((m) => (
          <div key={m.mes} className="est-mes">
            <div className="est-barras">
              {[['exitosos', 'exitoso', 'Exitosos'], ['no_exitosos', 'no-exitoso', 'No exitosos']].map(([clave, clase, texto]) => (
                <span key={clave} className={`est-barra ${clase}`} style={{ height: `${(m[clave] / maximo) * 100}%` }}
                  data-tip={`${nombreMes(m.mes)} · ${texto}: ${m[clave]}`} />
              ))}
            </div>
            <span className="est-mes-nombre">{nombreMes(m.mes)}</span>
          </div>
        ))}
      </div>
      <details className="est-tabla">
        <summary>Ver como tabla</summary>
        <table>
          <thead><tr><th scope="col">Mes</th><th scope="col">Exitosos</th><th scope="col">No exitosos</th></tr></thead>
          <tbody>
            {meses.map((m) => (
              <tr key={m.mes}><th scope="row">{nombreMes(m.mes)}</th><td>{m.exitosos}</td><td>{m.no_exitosos}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  )
}

// CA-20.3: ranking horizontal, de más a menos frecuente (un solo color: es una sola serie)
function Ranking({ id, titulo, filas, vacio }) {
  const total = filas.reduce((s, f) => s + f.cantidad, 0)
  const maximo = Math.max(1, ...filas.map((f) => f.cantidad))
  return (
    <section className="est-tarjeta" aria-labelledby={id}>
      <h2 id={id}>{titulo}</h2>
      {filas.length === 0 ? (
        <p className="est-detalle">{vacio}</p>
      ) : (
        <ol className="est-ranking">
          {filas.map((f) => (
            <li key={f.etiqueta}>
              <span className="est-ranking-nombre">{f.etiqueta}</span>
              <span className="est-ranking-pista" aria-hidden="true">
                <span style={{ width: `${(f.cantidad / maximo) * 100}%` }} />
              </span>
              <span className="est-ranking-valor">{f.cantidad} <small>({pct((100 * f.cantidad) / total)})</small></span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

// HU-20: estadísticas de éxito o fracaso de los match, para el administrador
export default function Estadisticas() {
  const [params, setParams] = useSearchParams()
  const desde = params.get('desde') ?? ''
  const hasta = params.get('hasta') ?? ''
  const [filtro, setFiltro] = useState({ desde, hasta })
  const [resultado, setResultado] = useState({ clave: null, datos: null, error: '' })
  const [errores, setErrores] = useState({})
  const clave = params.toString()

  useEffect(() => {
    let vigente = true
    api(`/admin/estadisticas${clave ? `?${clave}` : ''}`)
      .then((datos) => vigente && setResultado({ clave, datos, error: '' }))
      .catch((err) => {
        if (!vigente) return
        setErrores(err.errores ?? {})
        setResultado({ clave, datos: null, error: err.errores ? '' : err.message })
      })
    return () => {
      vigente = false
    }
  }, [clave])

  // CA-20.4: el período queda en la dirección, así se puede compartir o volver a él
  const aplicar = (e) => {
    e.preventDefault()
    if (filtro.desde && filtro.hasta && filtro.desde > filtro.hasta) {
      setErrores({ hasta: 'La fecha final debe ser igual o posterior a la inicial' })
      return
    }
    setErrores({})
    setParams(Object.fromEntries(Object.entries(filtro).filter(([, v]) => v)))
  }
  const verTodo = () => {
    setFiltro({ desde: '', hasta: '' })
    setErrores({})
    setParams({})
  }

  const { datos } = resultado
  const cargando = resultado.clave !== clave
  const r = datos?.resumen

  return (
    <main className="pagina-estadisticas">
      <div className="encabezado-pagina">
        <div>
          <h1>Estadísticas de match</h1>
          <p className="subtitulo">Qué tan bien funcionan las convivencias que propone RoomMatch, frente a las metas del proyecto.</p>
        </div>
      </div>

      <form className="est-filtro" onSubmit={aplicar} noValidate>
        <div className="campo">
          <label htmlFor="est-desde">Desde</label>
          <input id="est-desde" type="date" value={filtro.desde} max={filtro.hasta || undefined}
            onChange={(e) => setFiltro({ ...filtro, desde: e.target.value })} />
          {errores.desde && <p className="campo-error">{errores.desde}</p>}
        </div>
        <div className="campo">
          <label htmlFor="est-hasta">Hasta</label>
          <input id="est-hasta" type="date" value={filtro.hasta} min={filtro.desde || undefined}
            onChange={(e) => setFiltro({ ...filtro, hasta: e.target.value })} />
          {errores.hasta && <p className="campo-error">{errores.hasta}</p>}
        </div>
        <button type="submit" className="boton">Aplicar</button>
        {(desde || hasta) && <button type="button" className="boton secundario" onClick={verTodo}>Ver todo</button>}
      </form>

      {resultado.error && <p className="alerta" role="alert">{resultado.error}</p>}
      {!datos && !resultado.error && <p className="cargando">Calculando estadísticas…</p>}

      {datos && !datos.hay_datos && (
        // CA-20.5
        <div className="alojamientos-vacio">
          <h3>Sin datos para mostrar</h3>
          <p>
            {desde || hasta
              ? 'No hay convivencias evaluadas en ese período. Prueba con otras fechas.'
              : 'Aún no hay convivencias evaluadas. Las cifras aparecerán cuando los estudiantes evalúen su primer mes.'}
          </p>
        </div>
      )}

      {datos?.hay_datos && (
        <div className={`est-grilla${cargando ? ' actualizando' : ''}`} aria-busy={cargando}>
          <section className="est-tarjeta">
            <h2>Convivencias evaluadas</h2>
            <p className="est-cifra">{r.evaluadas}</p>
            <p className="est-detalle">{r.exitosas} exitosas · {r.no_exitosas} no exitosas</p>
            <p className="est-detalle">
              {datos.embudo.propuestas} propuestas · {datos.embudo.confirmadas} confirmadas · {datos.embudo.terminadas} terminadas
            </p>
          </section>
          <Meta titulo="Match exitosos" valor={r.porcentaje_exito} meta={r.meta_exito}
            detalle={`${pct(r.porcentaje_no_exito)} no exitosos`} />
          <Meta titulo="Respuesta a las evaluaciones" valor={r.tasa_respuesta} meta={r.meta_respuesta}
            detalle={`${r.respondidas} de ${r.avisos_enviados} avisos respondidos`} />

          {datos.por_mes.length > 0 && <PorMes meses={datos.por_mes} />}

          <Ranking id="titulo-razones" titulo="Razones de incompatibilidad"
            filas={datos.razones.map((f) => ({ etiqueta: textoDe(RAZONES, f.razon), cantidad: f.cantidad }))}
            vacio="Nadie ha indicado razones en este período." />
          <Ranking id="titulo-motivos" titulo="Por qué terminan las convivencias"
            filas={datos.motivos_fin.map((f) => ({ etiqueta: textoDe(MOTIVOS, f.motivo), cantidad: f.cantidad }))}
            vacio="Ninguna convivencia terminó en este período." />
        </div>
      )}
    </main>
  )
}
