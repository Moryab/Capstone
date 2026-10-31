// Ilustraciones de los dos roles. Decorativas: siempre van junto al nombre del rol

// «Busco dónde vivir»: una casa con una lupa
export const IconoBuscador = ({ tamano = 28 }) => (
  <svg viewBox="0 0 64 64" width={tamano} height={tamano} fill="none" aria-hidden="true" className="r-icono-rol">
    <path d="M8 31 L32 11 L56 31" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="14" y="28" width="36" height="26" rx="4" className="r-icono-cuerpo" />
    <rect x="19" y="34" width="8" height="7" rx="1.5" className="r-icono-luz" />
    <rect x="28" y="42" width="8" height="12" rx="2" fill="currentColor" />
    <circle cx="50" cy="48" r="8" className="r-icono-lente" strokeWidth="3.5" />
    <path d="M56 54 L61 59" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
  </svg>
)

// «Tengo un espacio»: una casa con una llave
export const IconoOferente = ({ tamano = 28 }) => (
  <svg viewBox="0 0 64 64" width={tamano} height={tamano} fill="none" aria-hidden="true" className="r-icono-rol">
    <path d="M8 31 L32 11 L56 31" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="14" y="28" width="36" height="26" rx="4" className="r-icono-cuerpo" />
    <rect x="19" y="34" width="8" height="7" rx="1.5" className="r-icono-luz" />
    <rect x="37" y="34" width="8" height="7" rx="1.5" className="r-icono-luz" />
    <rect x="28" y="42" width="8" height="12" rx="2" fill="currentColor" />
    <circle cx="9" cy="50" r="6" stroke="#f2c94c" strokeWidth="3.5" />
    <path d="M14 53 L24 58 M20 56 l-2 4" stroke="#f2c94c" strokeWidth="3.5" strokeLinecap="round" />
  </svg>
)
