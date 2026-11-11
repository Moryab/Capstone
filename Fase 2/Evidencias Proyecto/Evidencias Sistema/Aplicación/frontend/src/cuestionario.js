// Cuestionario de hábitos y preferencias de convivencia (HU-13). Los valores son los del modelo
// de datos; aquí van las preguntas y los textos que ve el estudiante

export const CATEGORIAS = [
  {
    clave: 'horario_sueno',
    titulo: 'Horario de sueño',
    pregunta: '¿A qué hora te sueles acostar?',
    opciones: [
      { valor: 'temprano', texto: 'Temprano, antes de las 23:00' },
      { valor: 'intermedio', texto: 'Entre las 23:00 y la 01:00' },
      { valor: 'tarde', texto: 'Tarde, después de la 01:00' },
    ],
  },
  {
    clave: 'horario_estudio',
    titulo: 'Horario de estudio',
    pregunta: '¿Cuándo sueles estudiar en casa?',
    opciones: [
      { valor: 'manana', texto: 'En la mañana' },
      { valor: 'tarde', texto: 'En la tarde' },
      { valor: 'noche', texto: 'En la noche' },
      { valor: 'variable', texto: 'Depende del día' },
    ],
  },
  {
    clave: 'orden_limpieza',
    titulo: 'Orden y limpieza',
    pregunta: '¿Cuánta importancia le das al orden y la limpieza de la casa?',
    opciones: [
      { valor: 'alto', texto: 'Mucha: todo limpio y en su lugar' },
      { valor: 'medio', texto: 'Normal: ordeno con regularidad' },
      { valor: 'bajo', texto: 'Poca: no me complica algo de desorden' },
    ],
  },
  {
    clave: 'ruido',
    titulo: 'Ruido',
    pregunta: '¿Cuánto ruido haces o te acomoda en casa (música, llamadas, televisión)?',
    opciones: [
      { valor: 'bajo', texto: 'Poco: prefiero una casa tranquila' },
      { valor: 'moderado', texto: 'Moderado' },
      { valor: 'alto', texto: 'Bastante: me gusta la música y el movimiento' },
    ],
  },
  {
    clave: 'visitas',
    titulo: 'Visitas',
    pregunta: '¿Con qué frecuencia recibes visitas?',
    opciones: [
      { valor: 'nunca', texto: 'Casi nunca' },
      { valor: 'ocasional', texto: 'De vez en cuando' },
      { valor: 'frecuente', texto: 'Seguido' },
    ],
  },
  {
    clave: 'fumar',
    titulo: 'Fumar',
    pregunta: '¿Fumas?',
    opciones: [
      { valor: 'no_fuma_no_tolera', texto: 'No fumo y no tolero el humo' },
      { valor: 'no_fuma_tolera', texto: 'No fumo, pero no me molesta' },
      { valor: 'fuma', texto: 'Fumo' },
    ],
  },
  {
    clave: 'mascotas',
    titulo: 'Mascotas',
    pregunta: '¿Tienes mascotas?',
    opciones: [
      { valor: 'no_tiene_no_tolera', texto: 'No tengo y prefiero no vivir con mascotas' },
      { valor: 'no_tiene_tolera', texto: 'No tengo, pero me gustan' },
      { valor: 'tiene', texto: 'Tengo mascota' },
    ],
  },
]

// CA-13.4: lo imprescindible pesa más en la compatibilidad (HU-14)
export const NIVELES = [
  { valor: 'flexible', texto: 'Flexible' },
  { valor: 'importante', texto: 'Importante' },
  { valor: 'imprescindible', texto: 'Imprescindible' },
]
export const MAX_IMPRESCINDIBLES = 3

export const textoRespuesta = (clave, valor) =>
  CATEGORIAS.find((c) => c.clave === clave)?.opciones.find((o) => o.valor === valor)?.texto ?? valor

export const tituloCategoria = (clave) => CATEGORIAS.find((c) => c.clave === clave)?.titulo ?? clave
