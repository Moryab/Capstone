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

// CA-26.1. Desestimar también deja el reporte «resuelto» (CA-27.4), con la resolución «sin acción»
export const ESTADOS_REPORTE = [
  { valor: 'pendiente', texto: 'Pendiente' },
  { valor: 'en_revision', texto: 'En revisión' },
  { valor: 'resuelto', texto: 'Resuelto' },
]

// HU-27: mismos valores que `ACCIONES_PERFIL` y `ACCIONES_PUBLICACION` del backend
export const ACCIONES_PERFIL = [
  { valor: 'desestimar', texto: 'Desestimar el reporte' },
  { valor: 'advertir', texto: 'Advertir al usuario' },
  { valor: 'suspender', texto: 'Suspender la cuenta' },
  { valor: 'quitar_verificacion', texto: 'Quitar la verificación' },
]
export const ACCIONES_PUBLICACION = [
  { valor: 'desestimar', texto: 'Desestimar el reporte' },
  { valor: 'ocultar', texto: 'Ocultar la publicación' },
  { valor: 'eliminar', texto: 'Eliminar la publicación' },
]

// Valores de `acciones_moderacion.accion`, para mostrar con qué se resolvió un reporte
const ACCIONES_REGISTRADAS = [
  { valor: 'desestimar_reporte', texto: 'Reporte desestimado' },
  { valor: 'advertir_usuario', texto: 'Advertencia al usuario' },
  { valor: 'suspender_usuario', texto: 'Cuenta suspendida' },
  { valor: 'revocar_verificacion', texto: 'Verificación quitada' },
  { valor: 'suspender_publicacion', texto: 'Publicación ocultada' },
  { valor: 'eliminar_publicacion', texto: 'Publicación eliminada' },
]

export const MAX_JUSTIFICACION = 500

const textoDe = (lista, valor) => lista.find((o) => o.valor === valor)?.texto ?? valor
export const textoTipoReporte = (valor) => textoDe(TIPOS_REPORTE, valor)
export const textoEstadoReporte = (valor) => textoDe(ESTADOS_REPORTE, valor)
export const textoAccion = (valor) => textoDe(ACCIONES_REGISTRADAS, valor)
export const textoMotivo = (valor) => textoDe([...MOTIVOS_PERFIL, ...MOTIVOS_PUBLICACION], valor)
