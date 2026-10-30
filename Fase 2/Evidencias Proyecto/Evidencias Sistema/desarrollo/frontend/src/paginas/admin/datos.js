// Datos compartidos por las páginas de administración de usuarios (HU-28)

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

const textoDe = (lista, valor) => lista.find((o) => o.valor === valor)?.texto ?? valor
export const textoVerificacion = (valor) => textoDe(ESTADOS_VERIFICACION, valor)
export const textoCuenta = (valor) => textoDe(ESTADOS_CUENTA, valor)
