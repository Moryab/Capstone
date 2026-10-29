// Datos visuales del cuestionario. Las preguntas, opciones y categorías salen de ../cuestionario.js
// (no se cambian aquí); este archivo solo agrega cómo se ven

import { CATEGORIAS } from '../cuestionario.js'

export { CATEGORIAS, MAX_IMPRESCINDIBLES } from '../cuestionario.js'

// Nombre corto de cada categoría para la barra de pasos
export const CORTOS = {
  horario_sueno: 'Sueño',
  horario_estudio: 'Estudio',
  orden_limpieza: 'Orden',
  ruido: 'Ruido',
  visitas: 'Visitas',
  fumar: 'Fumar',
  mascotas: 'Mascotas',
}

// Cómo pesa cada nivel en la compatibilidad (pesos 1, 2 y 4 en backend/app/compatibilidad.py)
export const NIVELES = [
  { valor: 'flexible', titulo: 'Flexible', lema: 'Me adapto', texto: 'Si tu roomie es distinto en esto, no hay problema. Es lo que menos pesa.' },
  { valor: 'importante', titulo: 'Importante', lema: 'Prefiero coincidir', texto: 'Te gustaría que pensaran parecido. Pesa el doble que lo flexible.' },
  { valor: 'imprescindible', titulo: 'Imprescindible', lema: 'No es negociable', texto: 'Es lo que más pesa al buscar a tu roomie ideal.' },
]

// Los dos primeros pasos completan los datos obligatorios del perfil (CA-03.5) sin hacer aparte
// un formulario largo; después vienen las 7 categorías de hábitos
export const PASOS_PERFIL = [
  { tipo: 'estudios', clave: 'estudios', titulo: 'Tus estudios', corto: 'Estudios' },
  { tipo: 'origen', clave: 'origen', titulo: 'De dónde eres', corto: 'Origen' },
]
export const PASOS_HABITOS = CATEGORIAS.map((c) => ({ tipo: 'habito', ...c, corto: CORTOS[c.clave] }))
const PASOS_TODOS = [...PASOS_PERFIL, ...PASOS_HABITOS]
// Listas fijas (no se crean en cada render)
export const pasosDe = (conPerfil) => (conPerfil ? PASOS_TODOS : PASOS_HABITOS)

export const TOTAL = PASOS_PERFIL.length + CATEGORIAS.length

// Mensajes de ánimo al llegar a ciertos pasos del recorrido completo (índice desde 0)
export const ANIMOS = { 3: '¡Vas muy bien!', 5: 'Ya pasaste la mitad', 8: '¡Ya casi terminas!' }

// Campos del perfil que piden los dos primeros pasos
export const CAMPOS_PASO = {
  estudios: ['institucion_id', 'sede', 'carrera'],
  origen: ['ciudad_origen', 'region_origen', 'direccion'],
}
export const aPerfil = (perfil = {}) => ({
  institucion_id: perfil.institucion_id ?? '',
  sede: perfil.sede ?? '',
  carrera: perfil.carrera ?? '',
  anio_ingreso: perfil.anio_ingreso ?? '',
  ciudad_origen: perfil.ciudad_origen ?? '',
  region_origen: perfil.region_origen ?? '',
  direccion: perfil.direccion ?? '',
})
export const pasoListo = (tipo, perfil) => CAMPOS_PASO[tipo].every((c) => String(perfil[c] ?? '').trim())

// Respuestas vacías como '' para que las opciones partan sin marcar
export const aEstado = ({ respuestas, importancia }) => ({
  respuestas: Object.fromEntries(CATEGORIAS.map(({ clave }) => [clave, respuestas?.[clave] ?? ''])),
  importancia: Object.fromEntries(CATEGORIAS.map(({ clave }) => [clave, importancia?.[clave] ?? 'importante'])),
})

// Primer paso pendiente del recorrido completo, para retomar donde quedó
export const primerPendiente = (respuestas, perfil) => {
  if (!pasoListo('estudios', perfil)) return 0
  if (!pasoListo('origen', perfil)) return 1
  const i = CATEGORIAS.findIndex(({ clave }) => !respuestas[clave])
  return i === -1 ? TOTAL - 1 : PASOS_PERFIL.length + i
}

export const pasosHechos = (respuestas, perfil) =>
  PASOS_PERFIL.filter(({ tipo }) => pasoListo(tipo, perfil)).length
  + CATEGORIAS.filter(({ clave }) => respuestas[clave]).length

export const contarImprescindibles = (importancia) =>
  Object.values(importancia).filter((n) => n === 'imprescindible').length
