// Datos compartidos por las páginas de verificación del estudiante (HU-21) y del administrador (HU-22)

// «¿En qué situación estás?»: mismos valores que el tipo `Situacion` del backend
export const SITUACIONES = [
  { valor: 'matriculado', texto: 'Ya estoy matriculado/a', ayuda: 'Ya estudias en tu institución.' },
  { valor: 'seleccionado', texto: 'Recién quedé seleccionado/a', ayuda: 'Te aceptaron, pero aún no empiezan tus clases.' },
]
export const textoSituacion = (valor) => SITUACIONES.find((s) => s.valor === valor)?.texto ?? valor

// Mismos valores que el tipo `TipoComprobante` del backend, con la situación a la que corresponde cada uno
export const TIPOS_COMPROBANTE = [
  { valor: 'certificado_alumno_regular', texto: 'Certificado de alumno regular', situacion: 'matriculado' },
  { valor: 'comprobante_matricula', texto: 'Comprobante de matrícula', situacion: 'matriculado' },
  { valor: 'credencial_estudiantil', texto: 'Credencial estudiantil vigente', situacion: 'matriculado' },
  { valor: 'carta_aceptacion', texto: 'Ficha de selección o carta de aceptación', situacion: 'seleccionado' },
]
export const textoTipo = (valor) => TIPOS_COMPROBANTE.find((t) => t.valor === valor)?.texto ?? valor
export const tiposDe = (situacion) => TIPOS_COMPROBANTE.filter((t) => t.situacion === situacion)

// Mismo límite y formatos que valida el backend (CA-21.3)
export const COMPROBANTE_MAX_MB = 5
export const COMPROBANTE_TIPOS = ['application/pdf', 'image/jpeg', 'image/png']

// Estados de una solicitud, según el modelo de datos
export const ESTADOS_SOLICITUD = {
  pendiente: 'Pendiente',
  en_revision: 'En revisión',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  revocada: 'Revocada', // aprobada y quitada después por un administrador (solo lo ve el administrador)
}

export const fechaHora = new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeStyle: 'short' })
export const fechaCorta = new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' })
