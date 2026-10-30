// Mismos valores que el tipo `MotivoPerfil` del backend (CA-24.1)
export const MOTIVOS_PERFIL = [
  { valor: 'perfil_falso', texto: 'Perfil falso o suplantación' },
  { valor: 'comportamiento_inapropiado', texto: 'Comportamiento inapropiado' },
  { valor: 'informacion_falsa', texto: 'Información falsa' },
  { valor: 'estafa', texto: 'Posible estafa' },
  { valor: 'otro', texto: 'Otro' },
]

// Mismos valores que el tipo `MotivoPublicacion` del backend (CA-25.1)
export const MOTIVOS_PUBLICACION = [
  { valor: 'publicacion_enganosa', texto: 'Información falsa o engañosa' },
  { valor: 'estafa', texto: 'Posible estafa' },
  { valor: 'contenido_inapropiado', texto: 'Contenido inapropiado' },
  { valor: 'fotos_no_corresponden', texto: 'Fotos que no corresponden' },
  { valor: 'otro', texto: 'Otro' },
]

export const MAX_DESCRIPCION = 500

export const TIPOS_REPORTE = [
  { valor: 'usuario', texto: 'Perfil' },
  { valor: 'publicacion', texto: 'Publicación' },
]

// Mismos valores que el tipo `EstadoReporte` del backend
export const ESTADOS_REPORTE = [
  { valor: 'pendiente', texto: 'Pendiente' },
  { valor: 'en_revision', texto: 'En revisión' },
  { valor: 'resuelto', texto: 'Resuelto' },
  { valor: 'descartado', texto: 'Descartado' },
]

const textoDe = (lista, valor) => lista.find((o) => o.valor === valor)?.texto ?? valor
export const textoTipoReporte = (valor) => textoDe(TIPOS_REPORTE, valor)
export const textoEstadoReporte = (valor) => textoDe(ESTADOS_REPORTE, valor)
export const textoMotivo = (valor) => textoDe([...MOTIVOS_PERFIL, ...MOTIVOS_PUBLICACION], valor)
