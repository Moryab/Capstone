// Ilustración de la evaluación: dos roomies junto a una hoja con vistos y un corazón, con los colores
// de RoomMatch (navy, petróleo, verde azulado, aqua y dorado). Decorativa
export default function IlustracionEvaluacion({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 360 240" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ev-hoja" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#eef6f5" />
        </linearGradient>
      </defs>
      {/* Mancha de fondo */}
      <path d="M48 150c-20-52 18-108 82-118 46-7 70 18 112 10 52-10 92 26 84 76-7 44-50 72-104 76-44 4-60-14-100-6-38 8-62-6-74-38z"
        fill="#3fd1b8" opacity="0.14" />
      {/* Hoja de evaluación */}
      <g transform="rotate(-6 182 120)">
        <rect x="128" y="44" width="112" height="150" rx="12" fill="url(#ev-hoja)" stroke="#cfe5e1" strokeWidth="2" />
        <rect x="146" y="64" width="54" height="8" rx="4" fill="#0e3a4f" opacity="0.8" />
        {[96, 126, 156].map((y, i) => (
          <g key={y}>
            <rect x="146" y={y - 10} width="20" height="20" rx="6" fill={i === 2 ? '#fdecea' : '#e3f1ef'} />
            {i === 2
              ? <path d={`M151 ${y - 5}l10 10M161 ${y - 5}l-10 10`} stroke="#d97757" strokeWidth="3" strokeLinecap="round" />
              : <path d={`M150 ${y}l4 4 8-9`} stroke="#0f766e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />}
            <rect x="174" y={y - 4} width={i === 1 ? 40 : 50} height="7" rx="3.5" fill="#cfe5e1" />
          </g>
        ))}
      </g>
      {/* Corazones */}
      <path className="ev-ilus-corazon" d="M214 40c-6-10-22-6-20 6 2 9 20 18 20 18s18-9 20-18c2-12-14-16-20-6z" fill="#f2c94c" />
      <path d="M244 26c-4-6-13-4-12 3 1 6 12 11 12 11s11-5 12-11c1-7-8-9-12-3z" fill="#0f766e" opacity="0.85" />
      {/* Roomie de la izquierda */}
      <circle cx="82" cy="92" r="17" fill="#f5c9a8" />
      <path d="M65 88c0-14 10-22 20-20 9 1 15 8 14 18-6-6-17-8-34 2z" fill="#0b1f3a" />
      <path d="M58 200c0-46 8-80 28-84 18-4 30 18 30 46v38z" fill="#0f766e" />
      <path d="M96 128c14 4 28-6 38-20" stroke="#0f766e" strokeWidth="11" strokeLinecap="round" fill="none" />
      <circle cx="138" cy="104" r="6" fill="#f5c9a8" />
      <path d="M60 200h56" stroke="#0b1f3a" strokeWidth="4" strokeLinecap="round" />
      {/* Roomie de la derecha, con un lápiz */}
      <circle cx="282" cy="98" r="17" fill="#c9926b" />
      <path d="M266 96c-2-14 8-22 18-21 10 1 16 9 14 19-4-7-14-10-32 2z" fill="#0e3a4f" />
      <path d="M252 202c0-46 8-80 30-82 20-2 30 20 30 46v36z" fill="#0e3a4f" />
      <path d="M262 136c-12 6-24 2-32-8" stroke="#0e3a4f" strokeWidth="11" strokeLinecap="round" fill="none" />
      <rect x="208" y="104" width="34" height="8" rx="4" transform="rotate(34 225 108)" fill="#f2c94c" />
      <path d="M254 202h56" stroke="#0b1f3a" strokeWidth="4" strokeLinecap="round" />
      {/* Hojitas */}
      <path d="M318 168c10-14 24-14 30-8-8 2-18 8-30 8z" fill="#3fd1b8" opacity="0.7" />
      <path d="M30 120c-6-12 0-24 8-26 0 8-2 18-8 26z" fill="#3fd1b8" opacity="0.7" />
    </svg>
  )
}
