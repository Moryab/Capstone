// Compatibilidad entre estudiantes (HU-14 y HU-15)

// CA-15.2: el nivel siempre va escrito, el color solo lo acompaña
export const NIVELES_COMPATIBILIDAD = {
  alta: 'Compatibilidad alta',
  media: 'Compatibilidad media',
  baja: 'Compatibilidad baja',
}

// Hacia abajo, para que el número calce con el nivel: 74,6 % es media y no debe verse como 75 %
export const formatearPorcentaje = (porcentaje) => `${Math.floor(porcentaje)} %`

// Cómo se parecen dos respuestas de una categoría, según el puntaje del cálculo
export const parecido = (puntaje) => {
  if (puntaje === 1) return { clase: 'coincide', texto: 'Coinciden' }
  if (puntaje === 0) return { clase: 'distinto', texto: 'Distinto' }
  return { clase: 'parecido', texto: 'Parecido' }
}
