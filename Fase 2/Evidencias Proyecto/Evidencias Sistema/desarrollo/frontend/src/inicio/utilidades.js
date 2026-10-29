// Datos y funciones compartidas por la pantalla de inicio

// Momento del día: decide el saludo y la escena del hero
export function momentoDelDia(hora = new Date().getHours()) {
  if (hora >= 6 && hora < 12) return 'manana'
  if (hora >= 12 && hora < 20) return 'tarde'
  return 'noche'
}

export const SALUDOS = { manana: 'Buenos días', tarde: 'Buenas tardes', noche: 'Buenas noches' }

// Frases de ánimo que rotan bajo el saludo (no prometen nada ni muestran cifras)
export const FRASES = [
  'Tu próximo hogar está más cerca.',
  'Un perfil completo genera más confianza.',
  'Publica tu espacio y encuentra con quién compartirlo.',
  'Convivir bien empieza por conocerse.',
]

export const mayusculaInicial = (texto = '') => texto.charAt(0).toUpperCase() + texto.slice(1)

// Las preferencias del navegador se comparten con el resto de la app
export { guardarLocal, leerLocal } from '../almacenamiento.js'
