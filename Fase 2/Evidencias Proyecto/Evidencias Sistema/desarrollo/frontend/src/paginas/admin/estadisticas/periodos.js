// Períodos del panel de estadísticas. Se guardan en la dirección (?periodo=mes, o desde/hasta con
// «personalizado»); cada tarjeta puede tener el suyo (?p.<tarjeta>=trimestre)

export const PERIODOS = [
  { valor: 'todo', texto: 'Todo', largo: 'Todo el historial' },
  { valor: 'semana', texto: 'Semana', largo: 'Últimos 7 días', dias: 7 },
  { valor: 'mes', texto: 'Mes', largo: 'Últimos 30 días', dias: 30 },
  { valor: 'trimestre', texto: 'Trimestre', largo: 'Últimos 90 días', dias: 90 },
  { valor: 'anio', texto: 'Año', largo: 'Últimos 12 meses', dias: 365 },
  { valor: 'personalizado', texto: 'Personalizado', largo: 'Fechas a elección' },
]
// Las tarjetas solo ofrecen períodos fijos (las fechas a elección son del filtro global)
export const PERIODOS_TARJETA = PERIODOS.filter((p) => p.valor !== 'personalizado')
// Textos cortos para el selector de cada tarjeta (el nombre completo va en su etiqueta accesible)
export const CORTO_TARJETA = { todo: 'Todo', semana: '7 días', mes: '30 días', trimestre: '90 días', anio: '12 meses' }

export const esPeriodo = (valor) => PERIODOS.some((p) => p.valor === valor)

// Fecha local en AAAA-MM-DD (toISOString la pasaría a UTC y podría cambiar el día)
export const iso = (fecha) => {
  const d = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000)
  return d.toISOString().slice(0, 10)
}

/** { desde, hasta } (AAAA-MM-DD, o vacíos para «todo») de un período */
export function rangoDe({ periodo = 'todo', desde = '', hasta = '' }) {
  if (periodo === 'personalizado') return { desde, hasta }
  const dias = PERIODOS.find((p) => p.valor === periodo)?.dias
  if (!dias) return { desde: '', hasta: '' }
  const hoy = new Date()
  const inicio = new Date(hoy)
  inicio.setDate(hoy.getDate() - (dias - 1))
  return { desde: iso(inicio), hasta: iso(hoy) }
}

const fechaCorta = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
const deIso = (texto) => {
  const [a, m, d] = texto.split('-').map(Number)
  return new Date(a, m - 1, d)
}

/** Texto para mostrar: «Últimos 30 días», «1 ago 2026 – 7 nov 2026», «Desde 1 ago 2026»… */
export function textoPeriodo({ periodo = 'todo', desde = '', hasta = '' }) {
  if (periodo !== 'personalizado') return PERIODOS.find((p) => p.valor === periodo)?.largo ?? 'Todo el historial'
  if (desde && hasta) return `${fechaCorta.format(deIso(desde))} – ${fechaCorta.format(deIso(hasta))}`
  if (desde) return `Desde ${fechaCorta.format(deIso(desde))}`
  if (hasta) return `Hasta ${fechaCorta.format(deIso(hasta))}`
  return 'Todo el historial'
}

/** Parte del nombre del archivo exportado: «2026-08-09_a_2026-11-07» o «todo» */
export function sufijoArchivo(rango) {
  if (!rango.desde && !rango.hasta) return 'todo'
  return `${rango.desde || 'inicio'}_a_${rango.hasta || 'hoy'}`
}
