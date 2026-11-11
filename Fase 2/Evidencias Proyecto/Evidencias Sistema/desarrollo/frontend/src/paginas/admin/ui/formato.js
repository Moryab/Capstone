// Formatos para mostrar datos en el admin (sin tocar lo que guarda la base de datos)

// Palabras que en un nombre van en minúscula salvo al comienzo («María de la Fuente»)
const MENORES = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'van', 'von'])

/** «lucas goler urra» → «Lucas Goler Urra» (también con guiones: «ana-maría» → «Ana-María») */
export function nombrePropio(texto = '') {
  return texto
    .trim()
    .toLocaleLowerCase('es-CL')
    .split(/\s+/)
    .map((palabra, i) => (i > 0 && MENORES.has(palabra)
      ? palabra
      : palabra.split('-').map((p) => p.charAt(0).toLocaleUpperCase('es-CL') + p.slice(1)).join('-')))
    .join(' ')
}

// Para el avatar: primera palabra como nombre y segunda como apellido
export const partesNombre = (texto = '') => {
  const [nombre = '', apellido = ''] = nombrePropio(texto).split(' ')
  return { nombre, apellido }
}

export const fecha = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })

const relativo = new Intl.RelativeTimeFormat('es-CL', { numeric: 'auto' })
/** «hace 3 días», «hace 2 horas», «ayer»: cuánto lleva esperando algo */
export function haceCuanto(fechaIso, ahora = Date.now()) {
  const minutos = Math.round((new Date(fechaIso).getTime() - ahora) / 60000)
  if (Math.abs(minutos) < 60) return relativo.format(Math.min(-1, minutos), 'minute')
  const horas = Math.round(minutos / 60)
  if (Math.abs(horas) < 24) return relativo.format(horas, 'hour')
  return relativo.format(Math.round(horas / 24), 'day')
}

/** 12345678-K → 12.345.678-K, como se escribe en Chile. El de Usuarios ya llega parcial (••.•••.678-K) */
export function rut(valor) {
  if (!valor) return 'Sin RUT'
  if (valor.includes('•')) return valor
  const [cuerpo, dv] = valor.split('-')
  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`
}
