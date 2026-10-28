// Nombres legibles de los campos obligatorios del perfil, para avisar cuáles faltan (CA-03.5)
export const ETIQUETAS_PERFIL = {
  institucion_id: 'Institución',
  sede: 'Sede',
  carrera: 'Carrera',
  direccion: 'Dirección en la ciudad donde estudias',
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
