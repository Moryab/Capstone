// Ilustraciones SVG propias de la landing, con la paleta de RoomMatch. Son decorativas: el texto
// de cada sección ya explica lo que muestran, por eso llevan aria-hidden

const NOCHE = '#0e2440'
const TEAL = '#12766b'
const TEAL_CLARO = '#3fd1b8'
const AMARILLO = '#f2c94c'
const SUAVE = '#e3eef0'

const Lienzo = ({ children, className = '' }) => (
  <svg className={`l-ilus ${className}`} viewBox="0 0 360 300" aria-hidden="true">
    <rect x="10" y="10" width="340" height="280" rx="26" fill="#fff" />
    {children}
  </svg>
)

// Paso 1: crear el perfil (foto, nombre, carrera)
function CrearPerfil() {
  return (
    <Lienzo>
      <rect x="10" y="10" width="340" height="86" rx="26" fill={NOCHE} />
      <rect x="10" y="70" width="340" height="26" fill={NOCHE} />
      <circle cx="180" cy="100" r="40" fill={TEAL} stroke="#fff" strokeWidth="6" />
      <circle cx="180" cy="90" r="13" fill="#fff" />
      <path d="M156 122 a24 20 0 0 1 48 0 z" fill="#fff" />
      <circle cx="210" cy="128" r="13" fill={AMARILLO} stroke="#fff" strokeWidth="4" />
      <path d="M205 128h10M210 123v10" stroke={NOCHE} strokeWidth="2.6" strokeLinecap="round" />
      <rect x="120" y="160" width="120" height="14" rx="7" fill={NOCHE} />
      <rect x="140" y="184" width="80" height="10" rx="5" fill={SUAVE} />
      <rect x="60" y="214" width="110" height="34" rx="12" fill={SUAVE} />
      <rect x="190" y="214" width="110" height="34" rx="12" fill={SUAVE} />
      <rect x="72" y="227" width="60" height="8" rx="4" fill={TEAL} opacity="0.6" />
      <rect x="202" y="227" width="70" height="8" rx="4" fill={TEAL} opacity="0.6" />
    </Lienzo>
  )
}

// Paso 2: cuestionario de convivencia (opciones por categoría y "imprescindible")
function EstiloConvivencia() {
  const filas = [
    { y: 46, valor: 0.75, icono: 'M44 62a10 10 0 1 0 10-14 8 8 0 0 1-10 14z' }, // luna: horarios
    { y: 108, valor: 0.9, icono: 'M40 76l14-14M46 80l4 4 10-10' }, // orden
    { y: 170, valor: 0.35, icono: 'M40 62h6l8-7v22l-8-7h-6z' }, // ruido
  ]
  return (
    <Lienzo>
      {filas.map(({ y, valor, icono }, i) => (
        <g key={i} transform={`translate(0 ${y - 46})`}>
          <rect x="30" y="38" width="300" height="50" rx="16" fill={SUAVE} />
          <path d={icono} fill="none" stroke={TEAL} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="80" y="59" width="200" height="8" rx="4" fill="#fff" />
          <rect x="80" y="59" width={200 * valor} height="8" rx="4" fill={TEAL} />
          <circle cx={80 + 200 * valor} cy="63" r="10" fill="#fff" stroke={TEAL} strokeWidth="3" />
          {i === 0 && (
            <g transform="translate(296 49)">
              <rect width="26" height="26" rx="8" fill={AMARILLO} />
              <path d="M13 6l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L5.8 11.3l5-.7z" fill={NOCHE} />
            </g>
          )}
        </g>
      ))}
      <rect x="30" y="236" width="140" height="34" rx="17" fill={TEAL} />
      <rect x="58" y="249" width="84" height="8" rx="4" fill="#fff" />
      <rect x="186" y="236" width="144" height="34" rx="17" fill="none" stroke={SUAVE} strokeWidth="3" />
    </Lienzo>
  )
}

// Paso 3: lista de posibles roomies ordenados por compatibilidad
function VerCompatibles() {
  const filas = [
    { y: 34, pct: '92%', color: TEAL },
    { y: 116, pct: '85%', color: '#2a8f82' },
    { y: 198, pct: '78%', color: '#5aa69a' },
  ]
  return (
    <Lienzo>
      {filas.map(({ y, pct, color }, i) => (
        <g key={i}>
          <rect x="30" y={y} width="300" height="68" rx="18" fill={i === 0 ? '#eaf7f4' : SUAVE}
            stroke={i === 0 ? TEAL_CLARO : 'none'} strokeWidth="2" />
          <circle cx="66" cy={y + 34} r="20" fill={i === 0 ? NOCHE : '#9db4bd'} />
          <circle cx="66" cy={y + 29} r="7" fill="#fff" />
          <path d={`M54 ${y + 47} a12 10 0 0 1 24 0 z`} fill="#fff" />
          <rect x="98" y={y + 22} width="110" height="10" rx="5" fill={NOCHE} opacity={i === 0 ? 1 : 0.55} />
          <rect x="98" y={y + 40} width="74" height="8" rx="4" fill="#9db4bd" />
          <rect x="246" y={y + 19} width="66" height="30" rx="15" fill={color} />
          <text x="279" y={y + 39} textAnchor="middle" fontFamily="Outfit, sans-serif" fontWeight="700"
            fontSize="15" fill="#fff">{pct}</text>
        </g>
      ))}
    </Lienzo>
  )
}

// Paso 4: el match, dos personas unidas por el corazón
function HacerMatch() {
  return (
    <Lienzo>
      <rect x="10" y="10" width="340" height="280" rx="26" fill={NOCHE} />
      <path d="M96 170 Q180 40 264 170" fill="none" stroke={TEAL_CLARO} strokeWidth="3" strokeDasharray="6 9" />
      <circle cx="96" cy="160" r="20" fill="#fff" />
      <path d="M66 236 a30 36 0 0 1 60 0 z" fill="#fff" />
      <circle cx="264" cy="160" r="20" fill={TEAL_CLARO} />
      <path d="M234 236 a30 36 0 0 1 60 0 z" fill={TEAL_CLARO} />
      <circle cx="180" cy="98" r="34" fill="#fff" />
      <path d="M180 116 l-16 -15 a9.5 9.5 0 0 1 16 -12 a9.5 9.5 0 0 1 16 12 z" fill={TEAL} />
      <circle cx="58" cy="62" r="4" fill={AMARILLO} />
      <circle cx="306" cy="76" r="3" fill={AMARILLO} />
      <circle cx="288" cy="40" r="2.5" fill="#fff" opacity="0.6" />
      <rect x="110" y="252" width="140" height="22" rx="11" fill={TEAL} />
      <rect x="138" y="259" width="84" height="8" rx="4" fill="#fff" />
    </Lienzo>
  )
}

const PASOS = [CrearPerfil, EstiloConvivencia, VerCompatibles, HacerMatch]

export function IlustracionPaso({ numero, className }) {
  const Ilustracion = PASOS[numero]
  return <div className={className}><Ilustracion /></div>
}

// Miniatura de alojamiento: una habitación dibujada; el color de la pared cambia por tarjeta
export function Habitacion({ pared = '#cfe8e4', acento = TEAL }) {
  return (
    <svg className="l-habitacion" viewBox="0 0 320 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="320" height="190" fill={pared} />
      <rect y="140" width="320" height="50" fill="#f6efe4" />
      {/* Ventana con luz cálida */}
      <rect x="196" y="28" width="86" height="70" rx="6" fill="#fff" />
      <rect x="202" y="34" width="35" height="58" rx="3" fill={AMARILLO} opacity="0.85" />
      <rect x="241" y="34" width="35" height="58" rx="3" fill={AMARILLO} opacity="0.6" />
      {/* Cama */}
      <rect x="28" y="104" width="150" height="40" rx="8" fill="#fff" />
      <rect x="28" y="92" width="44" height="26" rx="8" fill="#f1f5f9" />
      <rect x="70" y="112" width="108" height="32" rx="8" fill={acento} />
      <rect x="22" y="80" width="12" height="70" rx="4" fill={NOCHE} />
      {/* Planta y velador */}
      <rect x="250" y="118" width="40" height="30" rx="5" fill={NOCHE} />
      <circle cx="270" cy="104" r="14" fill="#3b9a6e" />
      <rect x="266" y="108" width="8" height="12" fill="#8c5a3c" />
      {/* Cuadro */}
      <rect x="54" y="34" width="56" height="40" rx="4" fill="#fff" />
      <path d="M60 68 l14 -16 10 10 8 -8 12 14z" fill={acento} opacity="0.7" />
    </svg>
  )
}
