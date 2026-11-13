// Ilustración de la ficha de una publicación: un aviso de alojamiento gigante (la foto de la casa, el
// título y la etiqueta del precio) que una persona revisa con una lupa enorme. Arriba, el pin de la
// ubicación y una banderita de reporte; abajo, una planta. Colores de RoomMatch (navy, petróleo, verde
// azulado, aqua y dorado). Decorativa
export default function IlustracionPublicacion({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 360 240" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="dp-aviso" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#eef6f5" />
        </linearGradient>
        <linearGradient id="dp-cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3fd1b8" stopOpacity="0.55" />
          <stop offset="1" stopColor="#e3f1ef" />
        </linearGradient>
      </defs>

      {/* Manchas de fondo */}
      <path d="M36 146c-12-58 30-110 96-116 50-4 76 22 120 12 52-12 94 30 84 80-8 46-50 74-108 76-46 2-64-16-106-8-42 8-74-8-86-44z"
        fill="#3fd1b8" opacity="0.14" />
      <circle cx="58" cy="58" r="26" fill="#f2c94c" opacity="0.18" />

      {/* Planta */}
      <g className="du-ilus-planta">
        <path d="M30 222c2-20 6-36 14-52" fill="none" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" />
        <path d="M36 198c-12-4-17-14-15-23 10 2 17 10 15 23z" fill="#3fd1b8" />
        <path d="M41 182c8-9 17-11 25-7-4 9-13 13-25 7z" fill="#0f766e" />
        <circle cx="46" cy="166" r="4.5" fill="#f2c94c" />
      </g>

      {/* El aviso del alojamiento */}
      <g transform="rotate(-5 160 124)">
        <rect x="80" y="40" width="160" height="168" rx="16" fill="url(#dp-aviso)" stroke="#cfe5e1" strokeWidth="2" />
        {/* Foto: una casa con su ventana */}
        <rect x="92" y="52" width="136" height="84" rx="10" fill="url(#dp-cielo)" />
        <path d="M92 124c22-10 40-12 62-6s44 6 74-4v12a10 10 0 0 1-10 10H102a10 10 0 0 1-10-10z" fill="#0f766e" opacity="0.35" />
        <path d="M130 102l30-24 30 24v26h-60z" fill="#ffffff" />
        <path d="M124 104l36-30 36 30" fill="none" stroke="#0b1f3a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="152" y="108" width="16" height="20" rx="3" fill="#0e3a4f" />
        <rect x="136" y="104" width="12" height="11" rx="2" fill="#f2c94c" />
        <rect x="172" y="104" width="12" height="11" rx="2" fill="#f2c94c" />
        <circle cx="206" cy="68" r="7" fill="#f2c94c" />
        {/* Título y datos */}
        <rect x="94" y="148" width="92" height="8" rx="4" fill="#0b1f3a" opacity="0.8" />
        <rect x="94" y="162" width="60" height="6" rx="3" fill="#cfe5e1" />
        {/* Íconos de la ficha: cama, ducha y wifi como puntos */}
        {[94, 116, 138].map((x) => <rect key={x} x={x} y="180" width="16" height="14" rx="4" fill="#e3f1ef" />)}
        {/* Etiqueta del precio */}
        <g className="dp-ilus-precio">
          <path d="M178 176h44a8 8 0 0 1 8 8v8a8 8 0 0 1-8 8h-44l-10-12z" fill="#f2c94c" />
          <circle cx="180" cy="188" r="3" fill="#ffffff" />
          <rect x="190" y="184" width="30" height="7" rx="3.5" fill="#0b1f3a" opacity="0.75" />
        </g>
      </g>

      {/* Pin de ubicación sobre el aviso */}
      <g className="dp-ilus-pin">
        <path d="M100 18c-12 0-20 9-20 20 0 15 20 32 20 32s20-17 20-32c0-11-8-20-20-20z" fill="#0f766e" />
        <circle cx="100" cy="38" r="7.5" fill="#ffffff" />
      </g>

      {/* Banderita de reporte en la esquina */}
      <g className="md-ilus-bandera">
        <path d="M236 30v40" stroke="#0b1f3a" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M238 32h26l-6 9 6 9h-26z" fill="#e0685a" />
      </g>

      {/* Persona que revisa con una lupa enorme */}
      <ellipse cx="300" cy="224" rx="30" ry="4.5" fill="#0b1f3a" opacity="0.12" />
      <path d="M287 166l-6 54h11l9-40 7 40h11l-4-54z" fill="#0b1f3a" />
      <rect x="275" y="216" width="18" height="7" rx="3.5" fill="#0e3a4f" />
      <rect x="305" y="216" width="18" height="7" rx="3.5" fill="#0e3a4f" />
      <path d="M282 122c10-8 28-8 36 0l4 46h-44z" fill="#f2c94c" />
      <path d="M318 128l8 30" stroke="#f2c94c" strokeWidth="9" strokeLinecap="round" />
      <circle cx="327" cy="162" r="5" fill="#c98d66" />
      <g className="md-ilus-lupa">
        <path d="M286 130l-26-14" stroke="#f2c94c" strokeWidth="9" strokeLinecap="round" />
        <circle cx="256" cy="114" r="5" fill="#c98d66" />
        <path d="M250 106l-12-12" stroke="#0b1f3a" strokeWidth="8" strokeLinecap="round" />
        <circle cx="222" cy="78" r="24" fill="#ffffff" fillOpacity="0.45" stroke="#0b1f3a" strokeWidth="6" />
        <path d="M208 70a14 14 0 0 1 12-8" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
      </g>
      <circle cx="300" cy="106" r="13" fill="#c98d66" />
      <path d="M287 104c0-12 7-18 14-18 9 0 14 7 13 15-5-6-12-7-18-5-4 1-7 4-9 8z" fill="#4a2c22" />
      <path d="M312 98c6 2 9 8 7 16" fill="none" stroke="#4a2c22" strokeWidth="5" strokeLinecap="round" />

      {/* Destellos */}
      <path className="md-ilus-destello" d="M54 100l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#f2c94c" />
      <path className="md-ilus-destello" d="M334 60l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#3fd1b8" style={{ animationDelay: '0.9s' }} />
      <circle cx="270" cy="20" r="3" fill="#3fd1b8" />
      <circle cx="344" cy="196" r="2.5" fill="#0f766e" opacity="0.5" />
    </svg>
  )
}
