// Íconos de línea propios del inicio. Decorativos: siempre van junto a un texto o un aria-label

const Icono = ({ children, tamano = 20 }) => (
  <svg viewBox="0 0 24 24" width={tamano} height={tamano} fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

export const IconoInicio = () => (
  <Icono>
    <path d="M3 11l9-7 9 7" />
    <path d="M5 10v10h5v-6h4v6h5V10" />
  </Icono>
)

export const IconoUsuario = () => (
  <Icono>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Icono>
)

export const IconoLista = () => (
  <Icono>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M7 9h10M7 13h10M7 17h6" />
  </Icono>
)

export const IconoMas = ({ tamano = 20 }) => (
  <Icono tamano={tamano}>
    <path d="M12 5v14M5 12h14" />
  </Icono>
)

export const IconoSalir = () => (
  <Icono tamano={18}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
    <path d="M10 8l-4 4 4 4M6 12h10" />
  </Icono>
)

export const IconoContraer = () => (
  <Icono tamano={18}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16M15 10l-2 2 2 2" />
  </Icono>
)

export const IconoCandado = ({ tamano = 14 }) => (
  <Icono tamano={tamano}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Icono>
)

export const IconoCheck = ({ tamano = 14 }) => (
  <Icono tamano={tamano}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icono>
)

export const IconoCamara = () => (
  <Icono tamano={26}>
    <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    <circle cx="12" cy="13.5" r="3.5" />
  </Icono>
)

export const IconoFlecha = () => (
  <Icono tamano={16}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icono>
)

export const IconoVerificado = () => (
  <Icono tamano={14}>
    <path d="M12 2l2.4 2.1 3.2-.3.9 3.1 2.8 1.6-1.2 3 1.2 3-2.8 1.6-.9 3.1-3.2-.3L12 22l-2.4-2.1-3.2.3-.9-3.1-2.8-1.6 1.2-3-1.2-3 2.8-1.6.9-3.1 3.2.3z" />
    <path d="M8.5 12l2.5 2.5 4.5-5" />
  </Icono>
)

export const IconoPausa = () => (
  <Icono tamano={14}>
    <path d="M9 5v14M15 5v14" />
  </Icono>
)

export const IconoReproducir = () => (
  <Icono tamano={14}>
    <path d="M7 5l12 7-12 7z" />
  </Icono>
)

export const IconoTuerca = () => (
  <Icono>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Icono>
)

export const IconoCerrar = () => (
  <Icono tamano={18}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icono>
)

export const IconoSol = () => (
  <Icono>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icono>
)

export const IconoLuna = () => (
  <Icono>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
  </Icono>
)

export const IconoEditar = () => (
  <Icono>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <path d="M13.5 6.5l4 4" />
  </Icono>
)

export const IconoCampana = () => (
  <Icono>
    <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </Icono>
)

export const IconoEscudo = () => (
  <Icono>
    <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
    <path d="M9 12l2 2 4-4" />
  </Icono>
)
