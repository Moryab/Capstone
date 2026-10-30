// Datos compartidos por las páginas de administración (HU-28 y HU-29)

// Mismos valores que el tipo `EstadoVerificacion` del backend
export const ESTADOS_VERIFICACION = [
  { valor: 'no_verificado', texto: 'No verificado' },
  { valor: 'pendiente', texto: 'Pendiente' },
  { valor: 'verificado', texto: 'Verificado' },
  { valor: 'rechazado', texto: 'Rechazado' },
  { valor: 'revocado', texto: 'Revocado' },
]

// CA-28.3: los estados de cuenta que hoy usa la plataforma
export const ESTADOS_CUENTA = [
  { valor: 'activa', texto: 'Activa' },
  { valor: 'suspendida', texto: 'Suspendida' },
]

// CA-29.1: «suspendida» es como se guarda una publicación oculta por moderación (HU-27 y HU-30)
export const ESTADOS_PUBLICACION = [
  { valor: 'activa', texto: 'Activa' },
  { valor: 'completa', texto: 'Sin cupos' },
  { valor: 'suspendida', texto: 'Oculta' },
  { valor: 'eliminada', texto: 'Eliminada' },
]

const textoDe = (lista, valor) => lista.find((o) => o.valor === valor)?.texto ?? valor
export const textoVerificacion = (valor) => textoDe(ESTADOS_VERIFICACION, valor)
export const textoCuenta = (valor) => textoDe(ESTADOS_CUENTA, valor)
export const textoPublicacion = (valor) => textoDe(ESTADOS_PUBLICACION, valor)
