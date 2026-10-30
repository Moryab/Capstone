// Datos compartidos por las páginas de verificación del estudiante (HU-21) y del administrador (HU-22)

// Mismos valores que el tipo `TipoComprobante` del backend
export const TIPOS_COMPROBANTE = [
  { valor: 'certificado_alumno_regular', texto: 'Certificado de alumno regular' },
  { valor: 'comprobante_matricula', texto: 'Comprobante de matrícula' },
  { valor: 'credencial_estudiantil', texto: 'Credencial estudiantil vigente' },
]
export const textoTipo = (valor) => TIPOS_COMPROBANTE.find((t) => t.valor === valor)?.texto ?? valor

// Mismo límite y formatos que valida el backend (CA-21.3)
export const COMPROBANTE_MAX_MB = 5
export const COMPROBANTE_TIPOS = ['application/pdf', 'image/jpeg', 'image/png']

// Estados de una solicitud, según el modelo de datos
export const ESTADOS_SOLICITUD = {
  pendiente: 'Pendiente',
  en_revision: 'En revisión',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
}

export const fechaHora = new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeStyle: 'short' })
export const fechaCorta = new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' })
