import { mayusculaInicial } from '../../inicio/utilidades.js'

// Nombres y fechas del chat (las fechas, en la hora local del navegador)

export const nombreDe = (otro) => `${mayusculaInicial(otro.nombre)}${otro.ap_paterno ? ` ${mayusculaInicial(otro.ap_paterno)}` : ''}`

const hora = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit' })
const diaLargo = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
const diaCorto = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' })

const inicioDelDia = (fecha) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime()
const diasAtras = (fecha) => Math.round((inicioDelDia(new Date()) - inicioDelDia(fecha)) / 86_400_000)

export const horaDe = (iso) => hora.format(new Date(iso))

// Separador entre días dentro de la conversación: «Hoy», «Ayer» o «lunes 3 de noviembre»
export function tituloDia(iso) {
  const fecha = new Date(iso)
  const dias = diasAtras(fecha)
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Ayer'
  const texto = diaLargo.format(fecha)
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// En la lista de conversaciones: la hora si fue hoy, «Ayer» o la fecha corta
export function cuandoCorto(iso) {
  const fecha = new Date(iso)
  const dias = diasAtras(fecha)
  if (dias === 0) return hora.format(fecha)
  if (dias === 1) return 'Ayer'
  return diaCorto.format(fecha)
}

export const mismoDia = (a, b) => inicioDelDia(new Date(a)) === inicioDelDia(new Date(b))
