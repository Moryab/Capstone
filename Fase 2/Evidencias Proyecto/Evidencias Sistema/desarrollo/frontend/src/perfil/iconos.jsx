// Íconos de línea del perfil, monocromos (toman el color del texto)

const Icono = ({ children, tamano = 24, grosor = 1.6 }) => (
  <svg viewBox="0 0 24 24" width={tamano} height={tamano} fill="none" stroke="currentColor" strokeWidth={grosor}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>
)

const TRAZOS = {
  horario_sueno: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  horario_estudio: <><path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4z" /><path d="M20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z" /></>,
  orden_limpieza: <><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z" /><path d="M18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z" /></>,
  ruido: <><path d="M4 10v4h4l5 4V6L8 10z" /><path d="M16.5 8.5a5 5 0 0 1 0 7" /><path d="M19 6a8.5 8.5 0 0 1 0 12" /></>,
  visitas: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 4.8a3.2 3.2 0 0 1 0 6.4M18 14.4a6 6 0 0 1 3 5.6" /></>,
  fumar: <><rect x="2.5" y="14" width="15" height="4" rx="1" /><path d="M20.5 14v4M17.5 10c0-2 2-2 2-4M20.5 10c0-2 2-2 2-4" /></>,
  mascotas: <><circle cx="7" cy="9" r="1.8" /><circle cx="12" cy="6.5" r="1.8" /><circle cx="17" cy="9" r="1.8" /><path d="M8 17c0-2.8 1.8-5 4-5s4 2.2 4 5c0 1.7-1.6 2.5-4 2.5S8 18.7 8 17z" /></>,
}

export function IconoHabito({ clave, tamano }) {
  return <Icono tamano={tamano}>{TRAZOS[clave]}</Icono>
}

export const IconoSello = ({ tamano = 16 }) => (
  <Icono tamano={tamano} grosor={2}><path d="M6 4h12l3 5-9 11L3 9z" /><path d="M3 9h18" /></Icono>
)
export const IconoCandado = ({ tamano = 20 }) => (
  <Icono tamano={tamano} grosor={1.8}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Icono>
)
export const IconoTelefono = ({ tamano = 18 }) => (
  <Icono tamano={tamano} grosor={1.8}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></Icono>
)
export const IconoMensaje = ({ tamano = 18 }) => (
  <Icono tamano={tamano} grosor={1.8}><path d="M21 12a8.5 8.5 0 0 1-12.5 7.5L3 21l1.5-5.5A8.5 8.5 0 1 1 21 12z" /></Icono>
)
export const IconoLapiz = ({ tamano = 16 }) => (
  <Icono tamano={tamano} grosor={1.9}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></Icono>
)
export const IconoOjo = ({ tamano = 16 }) => (
  <Icono tamano={tamano} grosor={1.9}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></Icono>
)
export const IconoCheck = ({ tamano = 14 }) => (
  <Icono tamano={tamano} grosor={2.6}><path d="M5 12.5l4.5 4.5L19 7.5" /></Icono>
)
export const IconoFlecha = ({ tamano = 16, izquierda = false }) => (
  <Icono tamano={tamano} grosor={2}><path d={izquierda ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} /></Icono>
)
export const IconoCorazon = ({ tamano = 22 }) => (
  <Icono tamano={tamano} grosor={1.8}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></Icono>
)
export const IconoCasa = ({ tamano = 22 }) => (
  <Icono tamano={tamano} grosor={1.6}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></Icono>
)
export const IconoFoto = ({ tamano = 18 }) => (
  <Icono tamano={tamano} grosor={1.8}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-8 8" /></Icono>
)

