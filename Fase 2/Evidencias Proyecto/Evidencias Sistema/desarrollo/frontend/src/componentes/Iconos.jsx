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
