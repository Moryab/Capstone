// Nombres legibles de los campos obligatorios del perfil, para avisar cuáles faltan (CA-03.5)
export const ETIQUETAS_PERFIL = {
  institucion_id: 'Institución',
  sede: 'Sede',
  carrera: 'Carrera',
  direccion: 'Dirección de tu ciudad de origen',
  ciudad_origen: 'Ciudad de origen',
  region_origen: 'Región de origen',
  telefono: 'Teléfono',
}

export const describirFaltantes = (campos) =>
  campos.map((campo) => ETIQUETAS_PERFIL[campo] ?? campo).join(', ')

// Mismos valores que el tipo `Genero` del backend
export const GENEROS = [
  { valor: 'femenino', texto: 'Femenino' },
  { valor: 'masculino', texto: 'Masculino' },
  { valor: 'no_binario', texto: 'No binario' },
]

export const textoGenero = (valor) => GENEROS.find((g) => g.valor === valor)?.texto

// Año de ingreso (opcional): de hace 15 años al actual, nunca futuro. Mismo rango que valida el backend
export const ANIO_INGRESO_MAX = new Date().getFullYear()
export const ANIO_INGRESO_MIN = ANIO_INGRESO_MAX - 15
export const errorAnioIngreso = (valor) => {
  if (valor === '' || valor == null) return undefined
  const anio = Number(valor)
  return Number.isInteger(anio) && anio >= ANIO_INGRESO_MIN && anio <= ANIO_INGRESO_MAX
    ? undefined
    : `Ingresa un año entre ${ANIO_INGRESO_MIN} y ${ANIO_INGRESO_MAX}`
}
// En un campo de año no se puede escribir signo, decimales ni exponente
export const sinSignos = (e) => { if (['-', '+', 'e', 'E', '.', ','].includes(e.key)) e.preventDefault() }

// Mismo límite y formatos que valida el backend para la foto de perfil
export const FOTO_MAX_MB = 5
export const FOTO_TIPOS = ['image/jpeg', 'image/png', 'image/webp']
