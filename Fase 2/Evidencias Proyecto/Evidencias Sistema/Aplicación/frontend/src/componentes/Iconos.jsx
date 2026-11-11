// Íconos de línea para el perfil. Decorativos: el texto que los acompaña ya dice lo que significan

const Icono = ({ children, tamano = 18 }) => (
  <svg viewBox="0 0 24 24" width={tamano} height={tamano} fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

export const IconoUbicacion = () => (
  <Icono>
    <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" />
    <circle cx="12" cy="9" r="2.5" />
  </Icono>
)

export const IconoPersona = () => (
  <Icono>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Icono>
)

export const IconoCalendario = () => (
  <Icono>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M16 3v4M8 3v4M3 10h18" />
  </Icono>
)

export const IconoBirrete = () => (
  <Icono>
    <path d="M2 9l10-5 10 5-10 5z" />
    <path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
  </Icono>
)

export const IconoCamara = () => (
  <Icono tamano={18}>
    <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    <circle cx="12" cy="13.5" r="3.5" />
  </Icono>
)

export const IconoVerificado = () => (
  <Icono tamano={16}>
    <path d="M12 2l2.4 2.1 3.2-.3.9 3.1 2.8 1.6-1.2 3 1.2 3-2.8 1.6-.9 3.1-3.2-.3L12 22l-2.4-2.1-3.2.3-.9-3.1-2.8-1.6 1.2-3-1.2-3 2.8-1.6.9-3.1 3.2.3z" />
    <path d="M8.5 12l2.5 2.5 4.5-5" />
  </Icono>
)

export const IconoHogar = () => (
  <Icono>
    <path d="M3 11l9-7 9 7" />
    <path d="M5 10v10h14V10" />
    <path d="M10 20v-6h4v6" />
  </Icono>
)

export const IconoLlave = () => (
  <Icono>
    <circle cx="7.5" cy="15.5" r="4.5" />
    <path d="M10.7 12.3L20 3M16 7l3 3M14 9l2 2" />
  </Icono>
)

export const IconoMas = () => (
  <Icono tamano={16}>
    <path d="M12 5v14M5 12h14" />
  </Icono>
)

export const IconoEditar = () => (
  <Icono tamano={15}>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <path d="M13.5 6.5l4 4" />
  </Icono>
)

export const IconoPapelera = () => (
  <Icono tamano={15}>
    <path d="M4 7h16M10 11v6M14 11v6" />
    <path d="M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Icono>
)

export const IconoLupa = () => (
  <Icono tamano={22}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </Icono>
)

export const IconoRoomies = () => (
  <Icono tamano={22}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M15.5 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8" />
  </Icono>
)

export const IconoCheck = () => (
  <Icono tamano={14}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icono>
)

export const IconoFlecha = () => (
  <Icono tamano={16}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icono>
)

export const IconoSalir = () => (
  <Icono tamano={16}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
    <path d="M10 8l-4 4 4 4M6 12h10" />
  </Icono>
)
