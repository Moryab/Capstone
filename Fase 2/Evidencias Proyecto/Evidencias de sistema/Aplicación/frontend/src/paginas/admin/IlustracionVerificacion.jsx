// Ilustración del detalle de una verificación: el comprobante (un carnet de estudiante con birrete)
// frente a la ficha del perfil, una lupa que los compara y el sello de verificado. Colores de RoomMatch
// (navy, petróleo, verde azulado, aqua y dorado). Decorativa
export default function IlustracionVerificacion({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 360 240" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="dv-carnet" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0e3a4f" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
        <linearGradient id="dv-ficha" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#eef6f5" />
        </linearGradient>
      </defs>

      {/* Mancha de fondo */}
      <path d="M44 150c-18-56 24-106 86-114 50-6 74 18 118 10 52-10 94 28 84 78-8 46-52 72-106 74-46 2-62-16-104-8-40 8-66-6-78-40z"
        fill="#3fd1b8" opacity="0.14" />

      {/* Ficha del perfil (detrás, a la derecha) */}
      <g transform="rotate(7 250 110)">
        <rect x="206" y="52" width="96" height="116" rx="12" fill="url(#dv-ficha)" stroke="#cfe5e1" strokeWidth="2" />
        <circle cx="228" cy="76" r="10" fill="#cfe5e1" />
        <rect x="244" y="70" width="44" height="6" rx="3" fill="#0e3a4f" opacity="0.75" />
        <rect x="244" y="80" width="30" height="5" rx="2.5" fill="#cfe5e1" />
        {[102, 116, 130, 144].map((y, i) => (
          <rect key={y} x="218" y={y} width={i % 2 ? 54 : 68} height="6" rx="3" fill="#e3f1ef" />
        ))}
      </g>

      {/* Comprobante: un carnet de estudiante */}
      <g transform="rotate(-6 150 128)">
        <rect x="76" y="78" width="148" height="96" rx="14" fill="url(#dv-carnet)" />
        <rect x="76" y="78" width="148" height="22" rx="14" fill="#3fd1b8" opacity="0.25" />
        <rect x="90" y="108" width="40" height="50" rx="8" fill="#ffffff" opacity="0.95" />
        <circle cx="110" cy="126" r="9" fill="#cfe5e1" />
        <path d="M96 154c2-10 8-14 14-14s12 4 14 14" fill="#cfe5e1" />
        <rect x="140" y="112" width="68" height="7" rx="3.5" fill="#ffffff" opacity="0.9" />
        <rect x="140" y="126" width="50" height="6" rx="3" fill="#ffffff" opacity="0.55" />
        <rect x="140" y="139" width="60" height="6" rx="3" fill="#ffffff" opacity="0.55" />
        <rect x="140" y="152" width="34" height="6" rx="3" fill="#f2c94c" opacity="0.9" />
      </g>

      {/* Birrete sobre el carnet */}
      <g className="md-ilus-birrete">
        <path d="M118 66l34-14 34 14-34 14z" fill="#0b1f3a" />
        <path d="M134 74v12c0 5 8 9 18 9s18-4 18-9V74l-18 7z" fill="#0b1f3a" />
        <path d="M186 66v16" stroke="#f2c94c" strokeWidth="3" strokeLinecap="round" />
        <circle cx="186" cy="85" r="3.5" fill="#f2c94c" />
      </g>

      {/* Lupa que compara el carnet con la ficha */}
      <g className="md-ilus-lupa">
        <circle cx="214" cy="150" r="22" fill="#ffffff" fillOpacity="0.5" stroke="#f2c94c" strokeWidth="6" />
        <path d="M230 166l18 18" stroke="#f2c94c" strokeWidth="8" strokeLinecap="round" />
        <path d="M204 142a12 12 0 0 1 10-6" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* Sello de verificado */}
      <g className="md-ilus-sello">
        <circle cx="276" cy="60" r="20" fill="#0f766e" stroke="#ffffff" strokeWidth="4" />
        <path d="M267 60l6 6 12-13" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Destellos */}
      <path className="md-ilus-destello" d="M62 70l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#f2c94c" />
      <path className="md-ilus-destello" d="M316 120l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#3fd1b8" style={{ animationDelay: '0.9s' }} />
      <circle cx="60" cy="176" r="3" fill="#3fd1b8" />
      <circle cx="310" cy="190" r="2.5" fill="#0f766e" opacity="0.5" />
    </svg>
  )
}
