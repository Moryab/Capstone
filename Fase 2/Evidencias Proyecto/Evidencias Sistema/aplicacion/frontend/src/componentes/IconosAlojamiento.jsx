// Íconos de lo que incluye un alojamiento (mismo trazo que los de «Alojamientos»). Decorativos:
// siempre van junto a su texto

const Svg = ({ children, tamano = 16 }) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>
)

export const IconoSillon = () => <Svg><path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" /><path d="M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v4H3z" /><path d="M5 17v2M19 17v2" /></Svg>
export const IconoDucha = () => <Svg><path d="M4 20V8a4 4 0 0 1 8 0" /><path d="M9 11h6" /><path d="M10 14v1M12 15v1M14 14v1M11 18v1M13 18v1" /></Svg>
export const IconoAuto = () => <Svg><path d="M5 16V12l2-5h10l2 5v4" /><path d="M3 16h18v2H3z" /><circle cx="8" cy="13" r="0.6" /><circle cx="16" cy="13" r="0.6" /></Svg>
// Boleta con un check: los gastos (agua, luz, gas, internet) van incluidos en el arriendo
export const IconoGastos = () => <Svg><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 11l2 2 4-4" /></Svg>
// Birrete: distancia a la sede
export const IconoSede = () => <Svg><path d="M2 9l10-5 10 5-10 5z" /><path d="M6 11v5c3 2 9 2 12 0v-5" /></Svg>
