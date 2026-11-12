// Íconos de lo que incluye un alojamiento (mismo trazo que los de «Alojamientos»). Decorativos:
// siempre van junto a su texto

const Svg = ({ children, tamano = 16 }) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>
)

export const IconoCama = () => <Svg><path d="M3 6v13M3 15h18M21 19v-6a2 2 0 0 0-2-2h-8v4" /><rect x="5.5" y="10" width="3.5" height="3" rx="1" /></Svg>
// Quién puede postular: una persona con un visto
export const IconoPostular = () => <Svg><circle cx="10" cy="8" r="3.5" /><path d="M3.5 20a6.5 6.5 0 0 1 10.5-5.1" /><path d="M15.5 18l2 2 4-4.5" /></Svg>
export const IconoDucha = () => <Svg><path d="M4 20V8a4 4 0 0 1 8 0" /><path d="M9 11h6" /><path d="M10 14v1M12 15v1M14 14v1M11 18v1M13 18v1" /></Svg>
export const IconoAuto = () => <Svg><path d="M5 16V12l2-5h10l2 5v4" /><path d="M3 16h18v2H3z" /><circle cx="8" cy="13" r="0.6" /><circle cx="16" cy="13" r="0.6" /></Svg>
// Boleta con un check: los gastos (agua, luz, gas, internet) van incluidos en el arriendo
export const IconoGastos = () => <Svg><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 11l2 2 4-4" /></Svg>
// Birrete: distancia a la sede
export const IconoSede = () => <Svg><path d="M2 9l10-5 10 5-10 5z" /><path d="M6 11v5c3 2 9 2 12 0v-5" /></Svg>

// Servicios de «Gastos mensuales»
export const IconoAgua = () => <Svg><path d="M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z" /></Svg>
export const IconoLuz = () => <Svg><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></Svg>
export const IconoGas = () => <Svg><path d="M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3-1-5 1-8z" /></Svg>
export const IconoInternet = () => <Svg><path d="M2 9a15 15 0 0 1 20 0" /><path d="M5 12.5a10 10 0 0 1 14 0" /><path d="M8.5 16a5 5 0 0 1 7 0" /><circle cx="12" cy="19.5" r="0.8" /></Svg>
// Flechas de la galería
export const IconoAnterior = () => <Svg tamano={20}><path d="M15 6l-6 6 6 6" /></Svg>
export const IconoSiguiente = () => <Svg tamano={20}><path d="M9 6l6 6-6 6" /></Svg>
