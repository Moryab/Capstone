// Ilustración de la ficha de un usuario: una ficha de perfil gigante con su foto, sus datos marcados
// (uno revisado y uno por revisar) y dos corazones de match. A la izquierda un estudiante la señala;
// a la derecha quien administra anota con un lápiz enorme. Colores de RoomMatch (navy, petróleo,
// verde azulado, aqua y dorado). Decorativa
export default function IlustracionUsuario({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 360 240" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="du-ficha" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#eef6f5" />
        </linearGradient>
        <linearGradient id="du-foto" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0e3a4f" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>

      {/* Mancha de fondo */}
      <path d="M40 140c-14-60 34-108 98-112 48-4 70 20 116 12 54-10 92 32 80 82-10 44-52 70-108 72-44 2-64-14-104-6-42 8-72-12-82-48z"
        fill="#3fd1b8" opacity="0.14" />
      <path d="M268 30c22-6 44 6 46 26 2 18-16 28-34 24-20-4-34-44-12-50z" fill="#f2c94c" opacity="0.18" />

      {/* Planta a la izquierda, como en un rincón de la pieza */}
      <g className="du-ilus-planta">
        <path d="M34 222c2-22 6-40 16-58" fill="none" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" />
        <path d="M40 196c-12-4-18-14-16-24 10 2 18 10 16 24z" fill="#3fd1b8" />
        <path d="M46 178c8-10 18-12 26-8-4 10-14 14-26 8z" fill="#0f766e" />
        <circle cx="52" cy="160" r="5" fill="#3fd1b8" />
        <circle cx="62" cy="150" r="3.5" fill="#f2c94c" />
      </g>

      {/* La ficha del perfil */}
      <g transform="rotate(-4 180 122)">
        <rect x="112" y="36" width="138" height="172" rx="16" fill="url(#du-ficha)" stroke="#cfe5e1" strokeWidth="2" />
        {/* Foto */}
        <circle cx="146" cy="74" r="20" fill="url(#du-foto)" />
        <circle cx="146" cy="68" r="7" fill="#e3f1ef" />
        <path d="M133 88c2-8 7-11 13-11s11 3 13 11" fill="#e3f1ef" />
        {/* Nombre y rol */}
        <rect x="174" y="62" width="58" height="8" rx="4" fill="#0b1f3a" opacity="0.8" />
        <rect x="174" y="76" width="36" height="6" rx="3" fill="#3fd1b8" />
        {/* Datos: uno revisado (check) y otro por revisar (x) */}
        <rect x="128" y="110" width="104" height="22" rx="8" fill="#e3f1ef" />
        <circle cx="140" cy="121" r="6.5" fill="#0f766e" />
        <path d="M137 121l2.4 2.4 4.4-4.8" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="152" y="118" width="62" height="6" rx="3" fill="#0f766e" opacity="0.45" />
        <rect x="128" y="140" width="104" height="22" rx="8" fill="#fff6dc" />
        <path d="M136 147l8 8M144 147l-8 8" stroke="#d9a81e" strokeWidth="2.6" strokeLinecap="round" />
        <rect x="152" y="148" width="50" height="6" rx="3" fill="#d9a81e" opacity="0.55" />
        <rect x="128" y="174" width="80" height="6" rx="3" fill="#cfe5e1" />
        <rect x="128" y="186" width="56" height="6" rx="3" fill="#cfe5e1" />
      </g>

      {/* Corazones de match sobre la ficha */}
      <g className="du-ilus-corazones">
        <path d="M226 28c0-8 10-10 12-2 2-8 12-6 12 2 0 8-12 14-12 16 0-2-12-8-12-16z" fill="#f2c94c" />
        <path d="M240 18c0-7 9-9 11-2 2-7 11-5 11 2 0 7-11 12-11 14 0-2-11-7-11-14z" fill="#0b1f3a" />
      </g>

      {/* Estudiante que señala la ficha */}
      <ellipse cx="78" cy="224" rx="28" ry="4.5" fill="#0b1f3a" opacity="0.12" />
      <path d="M66 166l-6 54h11l9-40 6 40h11l-4-54z" fill="#0b1f3a" />
      <rect x="54" y="216" width="18" height="7" rx="3.5" fill="#0e3a4f" />
      <rect x="84" y="216" width="18" height="7" rx="3.5" fill="#0e3a4f" />
      <path d="M62 122c10-8 26-8 34 0l4 46H58z" fill="#f2c94c" />
      <path d="M64 128l-10 32" stroke="#f2c94c" strokeWidth="9" strokeLinecap="round" />
      <circle cx="53" cy="163" r="5" fill="#c98d66" />
      <g className="du-ilus-brazo">
        <path d="M94 128l22-20" stroke="#f2c94c" strokeWidth="9" strokeLinecap="round" />
        <circle cx="119" cy="105" r="5" fill="#c98d66" />
      </g>
      <circle cx="79" cy="106" r="13" fill="#c98d66" />
      <path d="M66 104c0-12 8-18 16-17 8 1 12 8 11 14-6-5-14-5-20-2-3 1-5 3-7 5z" fill="#4a2c22" />
      <circle cx="69" cy="92" r="6" fill="#4a2c22" />

      {/* Quien administra, con un lápiz enorme */}
      <ellipse cx="298" cy="224" rx="30" ry="4.5" fill="#0b1f3a" opacity="0.12" />
      <path d="M284 164l-6 56h11l9-42 7 42h11l-4-56z" fill="#0b1f3a" />
      <rect x="272" y="216" width="18" height="7" rx="3.5" fill="#0e3a4f" />
      <rect x="303" y="216" width="18" height="7" rx="3.5" fill="#0e3a4f" />
      <path d="M280 120c10-8 28-8 36 0l4 46h-44z" fill="#0f766e" />
      <path d="M316 126l8 32" stroke="#0f766e" strokeWidth="9" strokeLinecap="round" />
      <circle cx="325" cy="162" r="5" fill="#f1c19c" />
      <g className="du-ilus-lapiz">
        <g transform="rotate(14 262 150)">
          <rect x="255" y="74" width="15" height="104" rx="3" fill="#f2c94c" />
          <rect x="255" y="74" width="5" height="104" fill="#ffffff" opacity="0.35" />
          <rect x="255" y="66" width="15" height="12" rx="3" fill="#3fd1b8" />
          <path d="M255 178h15l-7.5 20z" fill="#f6dfa0" />
          <path d="M260 192h5l-2.5 6z" fill="#0b1f3a" />
        </g>
        <path d="M284 128l-18 22" stroke="#0f766e" strokeWidth="9" strokeLinecap="round" />
        <circle cx="264" cy="152" r="5.5" fill="#f1c19c" />
      </g>
      <circle cx="298" cy="104" r="13" fill="#f1c19c" />
      <path d="M285 102c0-12 7-17 14-17 9 0 14 7 13 15-5-6-12-7-18-5-4 1-7 4-9 7z" fill="#0b1f3a" />

      {/* Destellos */}
      <path className="md-ilus-destello" d="M98 46l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#f2c94c" />
      <path className="md-ilus-destello" d="M330 86l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#3fd1b8" style={{ animationDelay: '0.9s' }} />
      <circle cx="26" cy="120" r="3" fill="#3fd1b8" />
      <circle cx="342" cy="196" r="2.5" fill="#0f766e" opacity="0.5" />
    </svg>
  )
}
