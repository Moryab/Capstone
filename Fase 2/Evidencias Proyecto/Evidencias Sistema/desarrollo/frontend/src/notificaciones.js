// Avisos de la campana: a qué página lleva cada tipo de notificación del modelo de datos.
// Sin enlace, el aviso solo se lee
export function enlaceDe(aviso) {
  const { tipo, referencia } = aviso
  switch (tipo) {
    case 'nuevo_match':
    case 'respuesta_match':
    case 'match_confirmado':
      return '/propuestas'
    case 'evaluacion_disponible':
    case 'recordatorio_evaluacion':
      return referencia.id ? `/evaluacion/${referencia.id}` : '/propuestas'
    case 'verificacion_estudiante':
      return '/verificacion'
    case 'accion_moderacion':
      return referencia.tipo === 'publicacion' && referencia.id ? `/alojamientos/${referencia.id}` : null
    default:
      return null
  }
}

// «hace 5 min», «hace 3 h», «hace 2 días» o la fecha
export function haceCuanto(iso) {
  const minutos = Math.round((Date.now() - new Date(iso)) / 60000)
  if (minutos < 1) return 'ahora'
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.round(minutos / 60)
  if (horas < 24) return `hace ${horas} h`
  const dias = Math.round(horas / 24)
  if (dias < 7) return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`
  return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })
}
