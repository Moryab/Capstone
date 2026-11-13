// Ilustración del detalle de un reporte: un escudo con la bandera de reporte, una lupa que revisa la
// ficha reportada y las dos personas (quien reporta y a quien reportan) unidas al escudo. Colores de
// RoomMatch (navy, petróleo, verde azulado, aqua y dorado) y un acento coral. Decorativa
export default function IlustracionReporte({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 360 240" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="md-escudo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0e3a4f" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
        <linearGradient id="md-ficha" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#eef6f5" />
        </linearGradient>
      </defs>

      {/* Mancha de fondo */}
      <path d="M40 146c-16-54 26-104 88-112 48-6 72 20 116 12 54-10 96 28 86 78-9 46-54 72-108 74-46 2-62-16-104-8-40 8-66-8-78-44z"
        fill="#3fd1b8" opacity="0.14" />

      {/* Líneas punteadas: las dos personas llegan al escudo */}
      <path d="M70 176C96 156 118 150 140 146" fill="none" stroke="#0e3a4f" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" opacity="0.45" />
      <path d="M292 176c-24-18-44-24-66-28" fill="none" stroke="#0e3a4f" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" opacity="0.45" />

      {/* Quien reporta (izquierda) y a quien reportan (derecha) */}
      <g>
        <circle cx="58" cy="186" r="22" fill="#ffffff" stroke="#cfe5e1" strokeWidth="2" />
        <circle cx="58" cy="180" r="7" fill="#0f766e" />
        <path d="M45 198c2-8 8-12 13-12s11 4 13 12" fill="#0f766e" />
      </g>
      <g>
        <circle cx="302" cy="186" r="22" fill="#ffffff" stroke="#f4d6cc" strokeWidth="2" />
        <circle cx="302" cy="180" r="7" fill="#0e3a4f" />
        <path d="M289 198c2-8 8-12 13-12s11 4 13 12" fill="#0e3a4f" />
        {/* Aviso coral sobre la persona reportada */}
        <circle cx="318" cy="168" r="9" fill="#e07a5f" stroke="#ffffff" strokeWidth="2" />
        <path d="M318 163.5v5M318 172h0" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
      </g>

      {/* Ficha reportada, detrás del escudo */}
      <g transform="rotate(6 236 92)">
        <rect x="196" y="42" width="92" height="104" rx="12" fill="url(#md-ficha)" stroke="#cfe5e1" strokeWidth="2" />
        <circle cx="216" cy="64" r="9" fill="#cfe5e1" />
        <rect x="231" y="58" width="42" height="6" rx="3" fill="#0e3a4f" opacity="0.75" />
        <rect x="231" y="68" width="28" height="5" rx="2.5" fill="#cfe5e1" />
        <rect x="208" y="86" width="66" height="6" rx="3" fill="#e3f1ef" />
        <rect x="208" y="98" width="54" height="6" rx="3" fill="#e3f1ef" />
        <rect x="208" y="110" width="60" height="6" rx="3" fill="#fbe3dc" />
      </g>

      {/* Escudo con la bandera de reporte */}
      <g>
        <path d="M180 34l58 20v42c0 40-26 68-58 82-32-14-58-42-58-82V54z" fill="url(#md-escudo)" />
        <path d="M180 46l46 16v34c0 32-20 55-46 68-26-13-46-36-46-68V62z" fill="none" stroke="#3fd1b8" strokeWidth="2" opacity="0.5" />
        <path d="M166 74v58" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <path className="md-ilus-bandera" d="M168 76c12-6 20 6 32 0v30c-12 6-20-6-32 0z" fill="#f2c94c" />
      </g>

      {/* Lupa que revisa la ficha */}
      <g className="md-ilus-lupa">
        <circle cx="262" cy="128" r="22" fill="#ffffff" fillOpacity="0.55" stroke="#f2c94c" strokeWidth="6" />
        <path d="M278 144l18 18" stroke="#f2c94c" strokeWidth="8" strokeLinecap="round" />
        <path d="M252 120a12 12 0 0 1 10-6" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* Destellos */}
      <path className="md-ilus-destello" d="M110 54l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#f2c94c" />
      <path className="md-ilus-destello" d="M318 64l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#3fd1b8" style={{ animationDelay: '0.9s' }} />
      <circle cx="96" cy="112" r="3" fill="#3fd1b8" />
      <circle cx="304" cy="110" r="2.5" fill="#0f766e" opacity="0.5" />
    </svg>
  )
}
