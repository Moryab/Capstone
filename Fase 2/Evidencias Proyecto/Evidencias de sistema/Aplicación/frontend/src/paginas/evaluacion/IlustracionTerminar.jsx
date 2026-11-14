// Ilustración de «Terminar la convivencia»: una casa con la puerta abierta, una maleta y dos roomies
// que se despiden, con los colores de RoomMatch. Decorativa
export default function IlustracionTerminar({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 360 240" aria-hidden="true" focusable="false">
      {/* Mancha de fondo */}
      <path d="M40 160c-16-50 22-104 86-112 44-6 72 16 114 8 50-9 94 24 86 74-7 44-52 70-106 74-44 3-62-12-102-5-38 7-64-6-78-39z"
        fill="#3fd1b8" opacity="0.14" />
      {/* Casa */}
      <path d="M118 112l62-50 62 50" fill="none" stroke="#0e3a4f" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="132" y="108" width="96" height="92" rx="6" fill="#ffffff" stroke="#cfe5e1" strokeWidth="2" />
      <rect x="146" y="122" width="22" height="20" rx="3" fill="#e3f1ef" />
      <path d="M157 122v20M146 132h22" stroke="#cfe5e1" strokeWidth="2" />
      {/* Puerta abierta */}
      <rect x="186" y="142" width="28" height="58" rx="3" fill="#0b1f3a" />
      <path d="M186 142l-10 6v52h10z" fill="#12766b" />
      <circle cx="180" cy="174" r="2" fill="#f2c94c" />
      <path d="M118 200h124" stroke="#0b1f3a" strokeWidth="4" strokeLinecap="round" />
      {/* Roomie que sale con su maleta */}
      <circle cx="270" cy="112" r="15" fill="#c9926b" />
      <path d="M255 110c-1-12 8-19 17-18 9 1 14 8 13 17-4-6-13-8-30 1z" fill="#0e3a4f" />
      <path d="M250 200c0-40 7-70 26-72 18-2 26 18 26 42v30z" fill="#0f766e" />
      <path d="M296 150c10 4 16 12 18 22" stroke="#0f766e" strokeWidth="10" strokeLinecap="round" fill="none" />
      <rect x="302" y="168" width="34" height="32" rx="6" fill="#f2c94c" />
      <path d="M312 168v-6a7 7 0 0 1 14 0v6" fill="none" stroke="#0e3a4f" strokeWidth="3" />
      <path d="M302 182h34" stroke="#d9a92f" strokeWidth="2" />
      {/* Mano que se despide */}
      <path d="M256 150c-10-4-16-14-16-26" stroke="#0f766e" strokeWidth="10" strokeLinecap="round" fill="none" />
      <circle cx="240" cy="120" r="6" fill="#c9926b" />
      {/* Roomie que se queda, despidiéndose */}
      <circle cx="84" cy="116" r="15" fill="#f5c9a8" />
      <path d="M69 113c0-12 9-19 18-17 8 1 13 7 12 16-5-5-15-7-30 1z" fill="#0b1f3a" />
      <path d="M62 200c0-40 7-68 24-70 16-2 26 16 26 40v30z" fill="#0e3a4f" />
      <path d="M104 146c8-6 12-18 10-30" stroke="#0e3a4f" strokeWidth="10" strokeLinecap="round" fill="none" />
      <circle cx="114" cy="112" r="6" fill="#f5c9a8" />
      {/* Líneas de saludo y un corazón */}
      <path d="M122 98l8-6M126 108l10-2M232 104l-8-6" stroke="#3fd1b8" strokeWidth="3" strokeLinecap="round" />
      <path className="ev-ilus-corazon" d="M180 40c-5-8-18-5-16 5 2 7 16 14 16 14s14-7 16-14c2-10-11-13-16-5z" fill="#f2c94c" />
    </svg>
  )
}
