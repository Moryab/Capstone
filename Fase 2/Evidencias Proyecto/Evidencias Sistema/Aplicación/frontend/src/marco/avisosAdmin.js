import { guardarLocal, leerLocal } from '../almacenamiento.js'
import { nombrePropio } from '../paginas/admin/ui/formato.js'
import { textoMotivo } from '../reportes.js'

/*
 * Avisos del administrador (la campana): lo que espera revisión, de GET /admin/avisos. Son tareas, no
 * notificaciones: desaparecen al resolverse. Cada administrador elige en Configuración qué tipos ve, y
 * su navegador recuerda cuándo abrió la campana por última vez, para contar como «nuevo» lo que llegó
 * después. Son preferencias de comodidad: sin almacenamiento, se ve todo y todo cuenta como nuevo.
 */

export const ATRASADO_MS = 2 * 24 * 60 * 60 * 1000 // más de 2 días esperando

export const PREFERENCIAS_INICIALES = { reportes: true, verificaciones: true, atrasados: true }

const clavePreferencias = (id) => `roommatch_admin_avisos_${id}`
const claveVisto = (id) => `roommatch_admin_avisos_visto_${id}`

export const leerPreferencias = (id) => ({ ...PREFERENCIAS_INICIALES, ...leerLocal(clavePreferencias(id), {}) })
export const guardarPreferencias = (id, valor) => guardarLocal(clavePreferencias(id), valor)
export const leerVisto = (id) => leerLocal(claveVisto(id), null)
export const guardarVisto = (id, fechaIso) => guardarLocal(claveVisto(id), fechaIso)

/** Los avisos de los tipos que el administrador quiere ver */
export const filtrarAvisos = (avisos = [], preferencias) => avisos.filter((a) => (
  a.tipo === 'reporte' ? preferencias.reportes : a.tipo === 'verificacion' ? preferencias.verificaciones : true
))

export const esNuevo = (aviso, visto) => !visto || new Date(aviso.fecha) > new Date(visto)
export const esAtrasado = (aviso, ahora = Date.now()) => ahora - new Date(aviso.fecha).getTime() > ATRASADO_MS

/** Título y texto de cada aviso, en palabras del administrador */
export function textoAviso(aviso) {
  const nombre = aviso.nombre ? (aviso.tipo_elemento === 'publicacion' ? `«${aviso.nombre}»` : nombrePropio(aviso.nombre)) : null
  if (aviso.tipo === 'reporte') {
    return {
      titulo: `Reporte N.º ${aviso.codigo}: ${textoMotivo(aviso.motivo)}`,
      mensaje: aviso.tipo_elemento === 'publicacion'
        ? `Sobre la publicación ${nombre ?? 'que ya no existe'}`
        : `Sobre el perfil de ${nombre ?? 'una cuenta que ya no existe'}`,
    }
  }
  return {
    titulo: `Solicitud de verificación N.º ${aviso.codigo}`,
    mensaje: `${nombre ?? 'Un estudiante'}${aviso.institucion ? ` · ${aviso.institucion}` : ''} espera tu revisión`,
  }
}
