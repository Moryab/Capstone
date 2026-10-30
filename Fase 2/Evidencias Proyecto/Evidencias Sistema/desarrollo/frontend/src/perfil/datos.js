// Datos de presentación del perfil: textos cortos, niveles y la frase de convivencia.
// No hay datos nuevos: todo sale de las respuestas reales del cuestionario (../cuestionario.js)

import { CATEGORIAS } from '../cuestionario.js'

export { CATEGORIAS }

// Respuesta corta de cada opción, para la cara frontal de las fichas
export const CORTOS = {
  horario_sueno: { temprano: 'Se acuesta temprano', intermedio: 'Horario intermedio', tarde: 'Se acuesta tarde' },
  horario_estudio: { manana: 'Estudia de mañana', tarde: 'Estudia de tarde', noche: 'Estudia de noche', variable: 'Horario variable' },
  orden_limpieza: { alto: 'Mucho orden', medio: 'Orden normal', bajo: 'Orden relajado' },
  ruido: { bajo: 'Casa tranquila', moderado: 'Ruido moderado', alto: 'Le gusta el movimiento' },
  visitas: { nunca: 'Casi sin visitas', ocasional: 'Visitas ocasionales', frecuente: 'Visitas seguido' },
  fumar: { no_fuma_no_tolera: 'Sin humo', no_fuma_tolera: 'No fuma, tolera', fuma: 'Fuma' },
  mascotas: { no_tiene_no_tolera: 'Sin mascotas', no_tiene_tolera: 'Le gustan', tiene: 'Tiene mascota' },
}
export const corto = (clave, valor) => CORTOS[clave]?.[valor] ?? '—'

export const NIVELES = {
  flexible: { titulo: 'Flexible', texto: 'Se adapta si su roomie es distinto en esto.' },
  importante: { titulo: 'Importante', texto: 'Prefiere coincidir con su roomie.' },
  imprescindible: { titulo: 'Imprescindible', texto: 'No es negociable para encontrar roomie.' },
}

/**
 * Frase de convivencia («Nocturno, ordenado y tranquilo») hecha con reglas fijas sobre las
 * respuestas. Concuerda con el género del perfil; si no se indicó, usa frases sin género.
 */
const RASGOS = [
  ['horario_sueno', { tarde: ['Nocturno', 'Nocturna', 'de horario nocturno'], temprano: ['Madrugador', 'Madrugadora', 'de horario temprano'] }],
  ['orden_limpieza', { alto: ['ordenado', 'ordenada', 'muy ordenado en casa'], bajo: ['relajado', 'relajada', 'relajado con el orden'] }],
  ['ruido', { bajo: ['tranquilo', 'tranquila', 'de ambiente tranquilo'], alto: ['animado', 'animada', 'de ambiente animado'] }],
  ['visitas', { frecuente: ['sociable', 'sociable', 'sociable'], nunca: ['reservado', 'reservada', 'de pocas visitas'] }],
  ['horario_estudio', { noche: ['estudioso de noche', 'estudiosa de noche', 'estudia de noche'], manana: ['estudioso de mañana', 'estudiosa de mañana', 'estudia de mañana'] }],
]
export function fraseConvivencia(habitos, genero) {
  if (!habitos) return null
  const i = genero === 'masculino' ? 0 : genero === 'femenino' ? 1 : 2
  const partes = RASGOS.map(([clave, opciones]) => opciones[habitos[clave]]?.[i]).filter(Boolean).slice(0, 3)
  if (!partes.length) return 'Equilibrado en su forma de convivir'
  const texto = partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}`
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// Cómo se ve cada categoría en la comparación: verde coinciden, amarillo parecido o distinto sin
// ser imprescindible, rojo choque con un imprescindible (datos del cálculo de compatibilidad)
export function claseComparacion(d) {
  if (d.conflicto_imprescindible) return { clase: 'choque', texto: 'Choque con imprescindible' }
  if (d.puntaje === 1) return { clase: 'coincide', texto: 'Coinciden' }
  if (d.puntaje > 0) return { clase: 'parecido', texto: 'Parecido' }
  return { clase: 'distinto', texto: 'Distinto' }
}

export const mayuscula = (t = '') => t.charAt(0).toUpperCase() + t.slice(1)
