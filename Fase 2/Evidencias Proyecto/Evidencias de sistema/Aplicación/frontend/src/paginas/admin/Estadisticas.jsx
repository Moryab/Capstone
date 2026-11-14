import {
  closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Component, useEffect, useId, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../api.js'
import { guardarLocal, leerLocal } from '../../almacenamiento.js'
import { useAvisoBreve } from '../../componentes/AvisoBreve.jsx'
import { useSesion } from '../../sesion/SesionContext.jsx'
import { RAZONES, textoDe } from '../evaluacion/SelectorRazones.jsx'
import { consultaDe, descargarCsv, pedir, pedirAlgoritmo, slug, useAlgoritmo, useEstadisticas } from './estadisticas/datos.js'
import Aprendizaje, { textoEstadoAjuste, textoPeso } from './estadisticas/Aprendizaje.jsx'
import Hero from './estadisticas/Hero.jsx'
import Semana, { diaLargo, SERIES_SEMANA } from './estadisticas/Semana.jsx'
import Calendario from './estadisticas/Calendario.jsx'
import { useResumenAdmin } from '../../marco/ResumenAdmin.jsx'
import {
  BarrasMes, brechaDe, Categorias, Lineas, Meta, nombreMes, pct, Ranking, SERIES_LINEAS,
} from './estadisticas/Graficos.jsx'
import {
  CORTO_TARJETA, esPeriodo, PERIODOS, PERIODOS_TARJETA, rangoDe, sufijoArchivo, textoPeriodo,
} from './estadisticas/periodos.js'
import './estadisticas.css'
import { useCifraAnimada, useIndicador } from './ui/animaciones.js'
import { EstadoVacio, PaginaAdmin } from './ui/componentes.jsx'
import Desplegable, { CampoDesplegable } from './ui/Desplegable.jsx'

// Cifra grande de una tarjeta: cuenta hasta su valor y, al cambiar un filtro, del anterior al nuevo
function Cifra({ valor }) {
  const ref = useCifraAnimada(valor)
  return <p ref={ref} className="g-cifra" data-valor={valor}>{valor}</p>
}

const MOTIVOS = [
  { valor: 'incompatibilidad', texto: 'Incompatibilidad' },
  { valor: 'termino_arriendo', texto: 'Término del arriendo' },
  { valor: 'cambio_ciudad', texto: 'Cambio de ciudad' },
  { valor: 'fin_estudios', texto: 'Fin de los estudios' },
  { valor: 'otro', texto: 'Otro motivo' },
]

const razonesDe = (d) => d.razones.map((f) => ({ etiqueta: textoDe(RAZONES, f.razon), cantidad: f.cantidad }))
const rocesDe = (d) => d.roces.map((f) => ({ etiqueta: textoDe(RAZONES, f.razon), cantidad: f.cantidad }))
const motivosDe = (d) => d.motivos_fin.map((f) => ({ etiqueta: textoDe(MOTIVOS, f.motivo), cantidad: f.cantidad }))
const categoriasDe = (d) => d.analisis_categorias.map((f) => ({ ...f, etiqueta: textoDe(RAZONES, f.categoria) }))

// CA-20.5: el texto exacto del criterio cuando no hay datos
const SIN_DATOS = 'Sin datos para mostrar'
const filasRanking = (titulo, filas) => {
  const total = filas.reduce((s, f) => s + f.cantidad, 0)
  return [[titulo, 'Cantidad', 'Porcentaje'], ...filas.map((f) => [f.etiqueta, f.cantidad, pct((100 * f.cantidad) / total)])]
}

function TablaDatos({ titulo, columnas, filas }) {
  return (
    <details className="m-tabla">
      <summary>Ver como tabla</summary>
      <table>
        <caption className="visualmente-oculto">{titulo}</caption>
        <thead><tr>{columnas.map((c, i) => <th key={c} scope="col" className={i ? 'num' : undefined}>{c}</th>)}</tr></thead>
        <tbody>
          {filas.map(([primera, ...resto]) => (
            <tr key={primera}><th scope="row">{primera}</th>{resto.map((v, i) => <td key={columnas[i + 1]} className="num">{v}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}

/*
 * Tarjetas del panel. Cada una sabe cuándo está vacía, cómo se ve y qué exporta a CSV.
 * `ancho`: tercio, mitad o completo (en pantallas chicas todas pasan a ancho completo)
 */
const MODULOS = {
  evaluadas: {
    titulo: 'Convivencias evaluadas',
    ancho: 'tercio',
    destacada: 'convivencias', // el corazón de RoomMatch: convivencias que se concretan
    vacio: (d) => d.resumen.evaluadas === 0 && d.embudo.propuestas === 0,
    textoVacio: 'No hay convivencias evaluadas ni propuestas en este período.',
    ver: (d) => (
      <div className="m-kpi">
        <Cifra valor={d.resumen.evaluadas} />
        <p className="g-detalle"><b className="m-exito">{d.resumen.exitosas} exitosas</b> · <b className="m-fracaso">{d.resumen.no_exitosas} no exitosas</b></p>
        {/* Embudo: de las propuestas, cuántas se confirmaron y cuántas terminaron */}
        <dl className="m-embudo">
          {[['Propuestas', d.embudo.propuestas], ['Confirmadas', d.embudo.confirmadas], ['Terminadas', d.embudo.terminadas]].map(([texto, n]) => (
            <div key={texto}>
              <dt>{texto}</dt>
              <dd>{n}{texto !== 'Propuestas' && d.embudo.propuestas > 0 && <small> · {pct((100 * n) / d.embudo.propuestas)}</small>}</dd>
              <span className="m-embudo-pista" aria-hidden="true">
                <span style={{ '--avance': d.embudo.propuestas ? n / d.embudo.propuestas : 0 }} />
              </span>
            </div>
          ))}
        </dl>
      </div>
    ),
    csv: (d) => [
      ['Indicador', 'Valor'],
      ['Convivencias evaluadas', d.resumen.evaluadas], ['Exitosas', d.resumen.exitosas], ['No exitosas', d.resumen.no_exitosas],
      ['Propuestas', d.embudo.propuestas], ['Confirmadas', d.embudo.confirmadas], ['Terminadas', d.embudo.terminadas],
    ],
  },
  exito: {
    titulo: 'Match exitosos',
    ancho: 'tercio',
    destacada: 'exito', // la meta principal del proyecto (60 %)
    vacio: (d) => d.resumen.porcentaje_exito == null,
    textoVacio: 'Sin convivencias evaluadas no hay porcentaje de éxito.',
    ver: (d) => <Meta valor={d.resumen.porcentaje_exito} meta={d.resumen.meta_exito} detalle={`${pct(d.resumen.porcentaje_no_exito)} no exitosos`} />,
    csv: (d) => [['Indicador', 'Valor', 'Meta'], ['Match exitosos', pct(d.resumen.porcentaje_exito), `${d.resumen.meta_exito} %`], ['Match no exitosos', pct(d.resumen.porcentaje_no_exito), '']],
  },
  respuesta: {
    titulo: 'Respuesta a las evaluaciones',
    ancho: 'tercio',
    vacio: (d) => d.resumen.tasa_respuesta == null,
    textoVacio: 'No se enviaron avisos de evaluación.',
    ver: (d) => <Meta valor={d.resumen.tasa_respuesta} meta={d.resumen.meta_respuesta} detalle={`${d.resumen.respondidas} de ${d.resumen.avisos_enviados} respondidos`} />,
    csv: (d) => [['Indicador', 'Valor', 'Meta'], ['Tasa de respuesta', pct(d.resumen.tasa_respuesta), `${d.resumen.meta_respuesta} %`],
      ['Avisos enviados', d.resumen.avisos_enviados, ''], ['Respondidos', d.resumen.respondidas, '']],
  },
  lineas: {
    titulo: 'Evolución mensual',
    descripcion: 'Match exitosos, no exitosos y registros nuevos por mes',
    ancho: 'dosTercios',
    vacio: (d) => d.serie_mensual.every((m) => !m.exitosos && !m.no_exitosos && !m.registros),
    textoVacio: 'No hubo match evaluados ni registros nuevos.',
    ver: (d, { activas, setActivas }) => (
      <>
        <Lineas serie={d.serie_mensual} activas={activas} alCambiarActivas={setActivas} />
        <TablaDatos titulo="Evolución mensual" columnas={['Mes', ...SERIES_LINEAS.map((s) => s.texto)]}
          filas={d.serie_mensual.map((m) => [nombreMes(m.mes, true), ...SERIES_LINEAS.map((s) => m[s.clave])])} />
      </>
    ),
    csv: (d, { activas }) => {
      const series = SERIES_LINEAS.filter((s) => activas.includes(s.clave))
      return [['Mes', ...series.map((s) => s.texto)], ...d.serie_mensual.map((m) => [m.mes, ...series.map((s) => m[s.clave])])]
    },
  },
  // Siempre los últimos 7 días (GET /admin/resumen): no usa el período ni la ciudad
  semana: {
    titulo: 'Nuevos esta semana',
    descripcion: 'Lo nuevo de cada día',
    ancho: 'tercio',
    fijo: 'Últimos 7 días',
    fuente: 'resumen',
    vacio: (d) => !d.actividad?.some((dia) => SERIES_SEMANA.some((s) => dia[s.clave] > 0)),
    textoVacio: 'Sin movimiento estos 7 días.',
    ver: (d) => <Semana actividad={d.actividad} />,
    csv: (d) => [['Día', ...SERIES_SEMANA.map((s) => s.texto)], ...d.actividad.map((dia) => [diaLargo(dia.dia), ...SERIES_SEMANA.map((s) => dia[s.clave])])],
  },
  barras: {
    titulo: 'Resultado de los match por mes',
    ancho: 'completo',
    vacio: (d) => d.por_mes.length === 0,
    textoVacio: 'No hay convivencias evaluadas.',
    ver: (d) => (
      <>
        <BarrasMes meses={d.por_mes} />
        {/* CA-20.2: la misma información en una tabla */}
        <TablaDatos titulo="Resultado por mes" columnas={['Mes', 'Exitosos', 'No exitosos']}
          filas={d.por_mes.map((m) => [nombreMes(m.mes, true), m.exitosos, m.no_exitosos])} />
      </>
    ),
    csv: (d) => [['Mes', 'Exitosos', 'No exitosos'], ...d.por_mes.map((m) => [m.mes, m.exitosos, m.no_exitosos])],
  },
  // Razones, roces y motivos van en una misma fila (un tercio cada una)
  razones: {
    titulo: 'Razones de incompatibilidad',
    descripcion: 'Hábitos con problemas en convivencias que no funcionaron',
    ancho: 'tercio',
    vacio: (d) => d.razones.length === 0,
    textoVacio: 'Nadie indicó razones de incompatibilidad.',
    ver: (d) => <Ranking filas={razonesDe(d)} />,
    csv: (d) => filasRanking('Razón', razonesDe(d)),
  },
  // Evaluación de los 30 días: hábitos que costaron aunque la convivencia funcione
  roces: {
    titulo: 'Roces en convivencias que funcionan',
    descripcion: 'Hábitos que costaron aunque la convivencia siga bien',
    ancho: 'tercio',
    vacio: (d) => !d.roces?.length,
    textoVacio: 'Nadie marcó roces en convivencias que funcionan.',
    ver: (d) => <Ranking filas={rocesDe(d)} />,
    csv: (d) => filasRanking('Hábito', rocesDe(d)),
  },
  motivos: {
    titulo: 'Por qué terminan las convivencias',
    ancho: 'tercio',
    vacio: (d) => d.motivos_fin.length === 0,
    textoVacio: 'Ninguna convivencia terminó.',
    ver: (d) => <Ranking filas={motivosDe(d)} />,
    csv: (d) => filasRanking('Motivo', motivosDe(d)),
  },
  // EP-08: base para proponer ajustes al algoritmo (HU-20)
  categorias: {
    titulo: 'Qué diferencias fracasan más',
    descripcion: 'Convivencias no exitosas cuando el par difiere en un hábito, frente a cuando coincide',
    ancho: 'dosTercios',
    vacio: (d) => d.analisis_categorias.every((f) => f.casos_con_diferencia + f.casos_sin_diferencia === 0),
    textoVacio: 'No hay convivencias evaluadas para comparar.',
    ver: (d) => <Categorias filas={categoriasDe(d)} />,
    csv: (d) => [
      ['Hábito', 'Fracaso si difieren', 'Fracasos / casos (difieren)', 'Fracaso si coinciden', 'Fracasos / casos (coinciden)', 'Diferencia'],
      ...categoriasDe(d).map((f) => [
        f.etiqueta,
        f.casos_con_diferencia ? pct(f.tasa_fracaso_con_diferencia) : 'Sin casos', `${f.fracasos_con_diferencia} / ${f.casos_con_diferencia}`,
        f.casos_sin_diferencia ? pct(f.tasa_fracaso_sin_diferencia) : 'Sin casos', `${f.fracasos_sin_diferencia} / ${f.casos_sin_diferencia}`,
        brechaDe(f.diferencia),
      ]),
    ],
  },
  // Product Vision (EP-02, EP-06, EP-07): reportes bajo el 5 % del total de anuncios
  reportes: {
    titulo: 'Tasa de reportes',
    ancho: 'tercio',
    vacio: (d) => d.reportes.tasa_reportes == null,
    textoVacio: 'No hay anuncios publicados.',
    ver: (d) => (
      <Meta valor={d.reportes.tasa_reportes} meta={d.reportes.meta_tasa_reportes_max} maximo escala={15}
        detalle={`${d.reportes.publicaciones_reportadas} de ${d.reportes.anuncios} anuncios reportados`} />
    ),
    csv: (d) => [
      ['Indicador', 'Valor', 'Meta'],
      ['Tasa de reportes', pct(d.reportes.tasa_reportes), `Bajo ${d.reportes.meta_tasa_reportes_max} %`],
      ['Anuncios', d.reportes.anuncios, ''], ['Anuncios reportados', d.reportes.publicaciones_reportadas, ''],
    ],
  },
  // EP-08: la mejora continua general. La plataforma ajusta sola los pesos; aquí solo se muestra
  aprendizaje: {
    titulo: 'Aprendizaje del algoritmo',
    descripcion: 'RoomMatch ajusta sola cuánto pesa cada hábito según cómo resultan las convivencias',
    ancho: 'completo',
    fijo: 'Automático',
    fuente: 'algoritmo',
    vacio: () => false,
    ver: (d) => <Aprendizaje datos={d} />,
    csv: (d) => [
      ['Versión vigente', d.version],
      ['Convivencias evaluadas', d.casos_evaluados],
      [],
      ['Hábito', 'Peso actual', 'Peso inicial'],
      ...d.pesos.map((p) => [textoDe(RAZONES, p.categoria), textoPeso(p.peso), textoPeso(p.peso_inicial)]),
      [],
      ['Fecha', 'Resultado', 'Versión', 'Convivencias analizadas', 'Cambios', 'Éxito antes', 'Éxito con los pesos nuevos', 'Observaciones'],
      ...d.ajustes.map((a) => [
        a.fecha.slice(0, 10), textoEstadoAjuste(a), a.version_propuesta ? `${a.version_base} → ${a.version_propuesta}` : a.version_base,
        a.casos_analizados,
        a.cambios.map((c) => `${textoDe(RAZONES, c.categoria)} ${textoPeso(c.peso_actual)} → ${textoPeso(c.peso_propuesto)}`).join(', '),
        a.validacion ? pct(a.validacion.tasa_exito_base) : '', a.validacion ? pct(a.validacion.tasa_exito_propuesta) : '',
        a.observaciones ?? '',
      ]),
    ],
  },
}
const ORDEN_INICIAL = Object.keys(MODULOS)

// El orden guardado puede venir de una versión anterior: se descartan ids viejos y se suman los nuevos
const ordenValido = (guardado) => {
  const lista = Array.isArray(guardado) ? guardado.filter((id) => id in MODULOS) : []
  return [...new Set([...lista, ...ORDEN_INICIAL])]
}

const Svg = ({ children }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
)
const IconoDescargar = () => <Svg><path d="M12 4v11M7 10l5 5 5-5M5 19h14" /></Svg>
const IconoPanel = () => <Svg><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><path d="M16.5 13v7M13 16.5h7" /></Svg>
const IconoAsa = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    {[7, 12, 17].flatMap((y) => [9, 15].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" />))}
  </svg>
)

// Si a la respuesta le falta un dato (por ejemplo, una API sin actualizar), la tarjeta no se da por
// vacía: se intenta mostrar y, si falla, LimiteTarjeta lo explica sin tumbar el resto del panel
const esVacio = (modulo, datos) => {
  try {
    return modulo.vacio(datos)
  } catch {
    return false
  }
}
const VistaModulo = ({ modulo, datos, extra }) => modulo.ver(datos, extra)

class LimiteTarjeta extends Component {
  state = { error: null, reinicio: this.props.reinicio }

  static getDerivedStateFromError(error) {
    return { error }
  }

  // Con otros datos se vuelve a intentar, sin desmontar el gráfico: así puede animar el cambio
  static getDerivedStateFromProps(props, state) {
    return props.reinicio !== state.reinicio ? { error: null, reinicio: props.reinicio } : null
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <p className="m-falla" role="alert">
        No se pudo mostrar esta tarjeta. Recarga la página; si sigue igual, revisa que la API esté actualizada.
      </p>
    )
  }
}

/**
 * Una tarjeta del panel. Usa el período global salvo que tenga uno propio, que se indica arriba con
 * «Período propio · Restablecer». En modo edición se arrastra desde el asa (o con el teclado).
 */
function Tarjeta({ id, editando, global, propio, alCambiarPropio, alAmpliarGlobal, ciudad, extra, alExportar }) {
  const modulo = MODULOS[id]
  const idTitulo = useId()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !editando })
  const filtro = propio ? { periodo: propio } : global
  const rango = rangoDe(filtro)
  const consulta = consultaDe({ ...rango, ciudad })
  const estadisticas = useEstadisticas(consulta)
  const algoritmo = useAlgoritmo(modulo.fuente === 'algoritmo')
  const { resumen } = useResumenAdmin()
  // Las tarjetas «fijas» no usan el período: leen el resumen del admin o lo aprendido por el algoritmo
  const { datos, error, cargando } = modulo.fuente === 'resumen' ? { datos: resumen, error: '', cargando: false }
    : modulo.fuente === 'algoritmo' ? algoritmo : estadisticas
  const vacio = Boolean(datos) && esVacio(modulo, datos)

  return (
    <section ref={setNodeRef} className="m-tarjeta" data-animar="tarjeta" data-cargando={(!datos && !error) || undefined} data-modulo={id} data-ancho={modulo.ancho} data-destacada={modulo.destacada}
      data-editando={editando || undefined}
      data-arrastrando={isDragging || undefined} aria-labelledby={idTitulo} aria-busy={cargando}
      style={{ transform: CSS.Translate.toString(transform), transition }}>
      <header className="m-cabeza">
        {editando && (
          <button type="button" ref={setActivatorNodeRef} className="m-asa" aria-label={`Mover «${modulo.titulo}»`} {...attributes} {...listeners}>
            <IconoAsa />
          </button>
        )}
        <div className="m-titulos">
          {modulo.destacada && <span className="m-clave">Indicador clave</span>}
          <h2 id={idTitulo}>{modulo.titulo}</h2>
          {modulo.descripcion && <p>{modulo.descripcion}</p>}
        </div>
        {!editando && (
          <div className="m-acciones">
            {modulo.fijo ? <span className="m-fijo">{modulo.fijo}</span> : (
            // La primera opción sigue al filtro del panel y dice cuál es; la lista no repite ese período
            <Desplegable variante="compacto" alinear="derecha" etiqueta={`Período de «${modulo.titulo}»`}
              valor={propio ?? ''} alCambiar={(v) => alCambiarPropio(v || null)}
              opciones={[
                { valor: '', texto: `Panel · ${CORTO_TARJETA[global.periodo] ?? 'Fechas'}` },
                ...PERIODOS_TARJETA.filter((p) => p.valor !== global.periodo).map((p) => ({ valor: p.valor, texto: CORTO_TARJETA[p.valor] })),
              ]} />
            )}
            <button type="button" className="m-icono" onClick={() => alExportar(id, datos, rango)} disabled={!datos || vacio}
              aria-label={`Exportar «${modulo.titulo}» a CSV`} title="Exportar a CSV">
              <IconoDescargar />
            </button>
          </div>
        )}
      </header>

      {propio && (
        <p className="m-propio">
          <span>Período propio · {textoPeriodo({ periodo: propio })}</span>
          <button type="button" onClick={() => alCambiarPropio(null)}>Restablecer</button>
        </p>
      )}

      <div className="m-cuerpo" data-cargando={cargando || undefined}>
        {error && <p className="alerta" role="alert">{error}</p>}
        {!datos && !error && <div className="m-esqueleto" role="status" aria-label="Cargando" />}
        {vacio && (
          <EstadoVacio compacto ilustracion="grafico" titulo={SIN_DATOS}
            texto={`${modulo.textoVacio}${!modulo.fijo && filtro.periodo !== 'todo' ? ' Amplía el período para ver más.' : ''}`}
            accion={!modulo.fijo && filtro.periodo !== 'todo' && (
              <button type="button" className="a-boton" onClick={() => (propio ? alCambiarPropio('todo') : alAmpliarGlobal())}>
                Ver todo el historial
              </button>
            )} />
        )}
        {datos && !vacio && (
          <LimiteTarjeta reinicio={consulta}>
            <VistaModulo modulo={modulo} datos={datos} extra={extra} />
          </LimiteTarjeta>
        )}
      </div>
    </section>
  )
}

// Anuncios del lector de pantalla al reordenar con el teclado
const tituloDe = (id) => MODULOS[id]?.titulo ?? id
const ANUNCIOS = {
  onDragStart: ({ active }) => `Tomaste «${tituloDe(active.id)}». Usa las flechas para moverla y Espacio para soltarla.`,
  onDragOver: ({ active, over }) => (over ? `«${tituloDe(active.id)}» está en el lugar de «${tituloDe(over.id)}».` : ''),
  onDragEnd: ({ active, over }) => (over ? `Soltaste «${tituloDe(active.id)}» en el lugar de «${tituloDe(over.id)}».` : `Soltaste «${tituloDe(active.id)}».`),
  onDragCancel: ({ active }) => `Cancelaste. «${tituloDe(active.id)}» volvió a su lugar.`,
}
const INSTRUCCIONES = {
  draggable: 'Para mover una tarjeta presiona Espacio o Enter, muévela con las flechas y vuelve a presionar Espacio para soltarla. Escape cancela.',
}

// HU-20: estadísticas de éxito o fracaso de los match, para el administrador
export default function Estadisticas() {
  const { usuario } = useSesion()
  const { avisar } = useAvisoBreve()
  const { resumen } = useResumenAdmin()
  const [params, setParams] = useSearchParams()
  const claveOrden = `rm_admin_panel_${usuario.id}`

  // Filtro global (en la dirección). Las direcciones antiguas solo traían desde/hasta
  const desdeUrl = params.get('desde') ?? ''
  const hastaUrl = params.get('hasta') ?? ''
  const periodo = esPeriodo(params.get('periodo')) ? params.get('periodo') : (desdeUrl || hastaUrl ? 'personalizado' : 'todo')
  const global = { periodo, desde: desdeUrl, hasta: hastaUrl }
  const ciudad = params.get('ciudad') ?? ''
  const [calendarioAbierto, setCalendarioAbierto] = useState(false)
  const segmentosPeriodo = useIndicador(`${periodo}-${calendarioAbierto}`)
  const [comunas, setComunas] = useState([])
  const [activas, setActivas] = useState(SERIES_LINEAS.map((s) => s.clave))
  const [orden, setOrden] = useState(() => ordenValido(leerLocal(claveOrden, ORDEN_INICIAL)))
  const [borrador, setBorrador] = useState(null) // orden mientras se edita (null: no se está editando)
  const [exportando, setExportando] = useState(false)

  useEffect(() => {
    api('/catalogos/publicacion').then(({ comunas: lista }) => setComunas(lista)).catch(() => {})
  }, [])

  // El filtro global y los períodos propios (p.<tarjeta>) quedan en la dirección
  // Parte siempre de la dirección más reciente: dos cambios seguidos no se pisan
  const cambiarParams = (cambios) => {
    setParams((actuales) => {
      const nuevos = new URLSearchParams(actuales)
      Object.entries(cambios).forEach(([k, v]) => (v ? nuevos.set(k, v) : nuevos.delete(k)))
      return nuevos
    }, { replace: true })
  }
  const elegirPeriodo = (valor) => {
    if (valor === 'personalizado') {
      setCalendarioAbierto((abierto) => !abierto)
      return
    }
    setCalendarioAbierto(false)
    cambiarParams({ periodo: valor === 'todo' ? '' : valor, desde: '', hasta: '' })
  }
  // CA-20.4: período a elección, con la misma validación que el backend
  // CA-20.4: período a elección desde el calendario (que ya impide un fin anterior al inicio)
  const aplicarFechas = (desde, hasta) => {
    cambiarParams({ periodo: 'personalizado', desde, hasta })
    setCalendarioAbierto(false)
  }
  const propioDe = (id) => {
    const valor = params.get(`p.${id}`)
    // Si coincide con el período del panel, ya no es «propio»
    return valor !== periodo && PERIODOS_TARJETA.some((p) => p.valor === valor) ? valor : null
  }
  const filtroDe = (id) => (propioDe(id) ? { periodo: propioDe(id) } : global)

  const nombreCiudad = comunas.find((c) => c.id === ciudad)?.nombre
  const nombreArchivo = (base, rango) => `roommatch-${base}_${sufijoArchivo(rango)}${nombreCiudad ? `_${slug(nombreCiudad)}` : ''}.csv`
  const cabeceraCsv = (titulo, filtro) => [[titulo], [`Período: ${textoPeriodo(filtro)}`], [`Ciudad: ${nombreCiudad ?? 'Todas'}`], []]

  const exportarTarjeta = (id, datos, rango) => {
    const modulo = MODULOS[id]
    try {
      descargarCsv(nombreArchivo(slug(modulo.titulo), rango), [...cabeceraCsv(modulo.titulo, filtroDe(id)), ...modulo.csv(datos, { activas })])
      avisar(`Exportaste «${modulo.titulo}»`)
    } catch {
      avisar(`No se pudo exportar «${modulo.titulo}»`, { tipo: 'error' })
    }
  }

  // Exporta todo lo que se ve: cada tarjeta con su período (global o propio), en el orden del panel
  const exportarTodo = async () => {
    setExportando(true)
    try {
      const filas = cabeceraCsv('Estadísticas de match · RoomMatch', global)
      for (const id of orden) {
        const modulo = MODULOS[id]
        const datos = modulo.fuente === 'resumen' ? resumen
          : modulo.fuente === 'algoritmo' ? await pedirAlgoritmo()
            : await pedir(consultaDe({ ...rangoDe(filtroDe(id)), ciudad }))
        if (!datos) continue
        filas.push([`${modulo.titulo} (${modulo.fijo ?? textoPeriodo(filtroDe(id))})`])
        filas.push(...(modulo.vacio(datos) ? [[SIN_DATOS]] : modulo.csv(datos, { activas })), [])
      }
      descargarCsv(nombreArchivo('estadisticas', rangoDe(global)), filas)
      avisar('Exportaste el panel a CSV')
    } catch (err) {
      avisar(`No se pudo exportar: ${err.message}`, { tipo: 'error' })
    } finally {
      setExportando(false)
    }
  }

  // Editar panel: se reordena un borrador; «Guardar» lo deja como el orden de este administrador
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const editando = borrador !== null
  const visibles = borrador ?? orden
  const alSoltar = ({ active, over }) => {
    if (over && active.id !== over.id) {
      setBorrador((lista) => arrayMove(lista, lista.indexOf(active.id), lista.indexOf(over.id)))
    }
  }
  const guardarOrden = () => {
    setOrden(borrador)
    guardarLocal(claveOrden, borrador)
    setBorrador(null)
    avisar('Orden del panel guardado')
  }

  return (
    <PaginaAdmin className="pagina-estadisticas">
      <Hero acciones={!editando && (
        <>
          <button type="button" className="a-boton h-boton" onClick={() => setBorrador(orden)}><IconoPanel /> Editar panel</button>
          <button type="button" className="a-boton h-boton luz" onClick={exportarTodo} disabled={exportando}>
            <IconoDescargar /> {exportando ? 'Exportando…' : 'Exportar'}
          </button>
        </>
      )} />

      {editando ? (
        <section className="m-edicion" aria-label="Editar el orden del panel">
          <p>
            <strong>Editando el panel.</strong> Arrastra las tarjetas desde su asa, o tómalas con Espacio y muévelas con las flechas.
          </p>
          <div className="m-edicion-acciones">
            <button type="button" className="a-enlace" onClick={() => setBorrador(ORDEN_INICIAL)}>Restablecer orden</button>
            <button type="button" className="a-boton" onClick={() => setBorrador(null)}>Cancelar</button>
            <button type="button" className="a-boton primario" onClick={guardarOrden}>Guardar</button>
          </div>
        </section>
      ) : (
        <section className="a-filtros m-filtros" aria-label="Filtros del panel" data-animar="tarjeta">
          <div className="a-filtros-controles">
            <div className="m-filtro m-filtro-periodo">
              <span className="m-filtro-titulo" id="m-titulo-periodo">Período</span>
              <div ref={segmentosPeriodo} className="a-segmentos" role="group" aria-labelledby="m-titulo-periodo">
                {PERIODOS.map((p) => (
                  <button key={p.valor} type="button" onClick={() => elegirPeriodo(p.valor)}
                    data-abre-calendario={p.valor === 'personalizado' || undefined}
                    aria-pressed={p.valor === 'personalizado' ? calendarioAbierto || periodo === 'personalizado' : periodo === p.valor && !calendarioAbierto}
                    aria-expanded={p.valor === 'personalizado' ? calendarioAbierto : undefined}>
                    {p.texto}
                  </button>
                ))}
              </div>
              {calendarioAbierto && (
                <Calendario desde={desdeUrl} hasta={hastaUrl} alAplicar={aplicarFechas} alCancelar={() => setCalendarioAbierto(false)} />
              )}
            </div>
            <CampoDesplegable etiqueta="Ciudad" valor={ciudad} alCambiar={(v) => cambiarParams({ ciudad: v })}
              opciones={[{ valor: '', texto: 'Todas las ciudades' }, ...comunas.map((c) => ({ valor: c.id, texto: c.nombre }))]} />
            <p className="m-filtro-resumen" aria-live="polite">
              {textoPeriodo(global)}{nombreCiudad ? ` · ${nombreCiudad}` : ''}
            </p>
          </div>
          {ciudad && (
            <p className="m-nota">
              Con una ciudad, los registros nuevos siguen contando a todos los estudiantes.
            </p>
          )}
        </section>
      )}

      <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={alSoltar}
        accessibility={{ announcements: ANUNCIOS, screenReaderInstructions: INSTRUCCIONES }}>
        <SortableContext items={visibles} strategy={rectSortingStrategy}>
          <div className="m-grilla">
            {visibles.map((id) => (
              <Tarjeta key={id} id={id} editando={editando} global={global} ciudad={ciudad}
                propio={propioDe(id)} alCambiarPropio={(valor) => cambiarParams({ [`p.${id}`]: valor })}
                alAmpliarGlobal={() => elegirPeriodo('todo')}
                extra={{ activas, setActivas }} alExportar={exportarTarjeta} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </PaginaAdmin>
  )
}
