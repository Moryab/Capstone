// Ilustraciones de cada opción del cuestionario y de los niveles de importancia.
// Son decorativas: el texto de la opción dice lo mismo

const N = '#0e2440' // azul marino
const T = '#12766b' // verde azulado
const C = '#3fd1b8' // verde claro
const A = '#f2c94c' // amarillo
const S = '#d9e5e9' // gris suave
const B = '#ffffff'

const Lienzo = ({ children }) => (
  <svg viewBox="0 0 64 64" className="c-ilustracion" aria-hidden="true" focusable="false">{children}</svg>
)

const Luna = ({ x = 34, y = 26, r = 13 }) => (
  <path d={`M${x + r * 0.35} ${y - r} a${r} ${r} 0 1 0 ${r * 0.65} ${r * 1.55} a${r * 0.95} ${r * 0.95} 0 0 1 -${r * 0.65} -${r * 1.55}z`} fill={A} />
)
const Estrella = ({ x, y, r = 2.2 }) => <circle cx={x} cy={y} r={r} fill={B} className="c-titila" />
const Libro = ({ x = 14, y = 34 }) => (
  <g>
    <path d={`M${x} ${y} h16 v18 h-16 z`} fill={T} />
    <path d={`M${x + 16} ${y} h16 v18 h-16 z`} fill={C} />
    <path d={`M${x + 16} ${y} v18`} stroke={N} strokeWidth="2" />
  </g>
)
const Persona = ({ x, y = 34, color = T, escala = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${escala})`}>
    <circle cx="0" cy="0" r="6" fill={color} />
    <path d="M-10 20 a10 10 0 0 1 20 0z" fill={color} />
  </g>
)
const Parlante = () => (
  <g>
    <rect x="12" y="18" width="22" height="30" rx="5" fill={N} />
    <circle cx="23" cy="38" r="6" fill={C} />
    <circle cx="23" cy="25" r="3" fill={C} />
  </g>
)
const Cigarro = ({ y = 40 }) => (
  <g>
    <rect x="10" y={y} width="34" height="7" rx="2" fill={B} stroke={N} strokeWidth="1.5" />
    <rect x="44" y={y} width="8" height="7" rx="1.5" fill={A} />
  </g>
)
const Huella = ({ x = 32, y = 36, color = T }) => (
  <g fill={color}>
    <ellipse cx={x} cy={y + 6} rx="9" ry="7" />
    <circle cx={x - 10} cy={y - 4} r="3.6" />
    <circle cx={x - 4} cy={y - 10} r="3.6" />
    <circle cx={x + 4} cy={y - 10} r="3.6" />
    <circle cx={x + 10} cy={y - 4} r="3.6" />
  </g>
)

const ILUSTRACIONES = {
  horario_sueno: {
    temprano: (
      <Lienzo>
        <circle cx="32" cy="40" r="14" fill={A} className="c-sube" />
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d="M32 16 v-6" stroke={A} strokeWidth="3" strokeLinecap="round" transform={`rotate(${-60 + i * 30} 32 40)`} />
        ))}
        <rect x="6" y="44" width="52" height="12" rx="3" fill={C} />
      </Lienzo>
    ),
    intermedio: (
      <Lienzo>
        <Luna x={22} y={28} r={12} />
        <circle cx="42" cy="40" r="13" fill={B} stroke={N} strokeWidth="3" />
        <path d="M42 33 v7 l5 3" stroke={T} strokeWidth="3" strokeLinecap="round" fill="none" />
      </Lienzo>
    ),
    tarde: (
      <Lienzo>
        <rect x="4" y="4" width="56" height="56" rx="14" fill={N} />
        <Luna x={30} y={30} r={14} />
        <Estrella x={46} y={16} /><Estrella x={50} y={34} r={1.6} /><Estrella x={14} y={46} r={1.8} />
      </Lienzo>
    ),
  },
  horario_estudio: {
    manana: (
      <Lienzo>
        <circle cx="46" cy="16" r="9" fill={A} />
        <Libro x={8} y={32} />
      </Lienzo>
    ),
    tarde: (
      <Lienzo>
        <path d="M30 30 a16 16 0 0 1 32 0z" fill="#f29e4c" />
        <Libro x={6} y={32} />
      </Lienzo>
    ),
    noche: (
      <Lienzo>
        <path d="M44 10 l12 14 h-24z" fill={A} />
        <path d="M44 24 v20" stroke={N} strokeWidth="3" />
        <path d="M34 50 h20" stroke={N} strokeWidth="4" strokeLinecap="round" />
        <path d="M30 26 l-14 22 h28z" fill={A} opacity="0.25" />
        <Libro x={4} y={40} />
      </Lienzo>
    ),
    variable: (
      <Lienzo>
        <rect x="8" y="12" width="48" height="42" rx="8" fill={B} stroke={N} strokeWidth="3" />
        <path d="M8 24 h48" stroke={N} strokeWidth="3" />
        <path d="M20 8 v8 M44 8 v8" stroke={N} strokeWidth="3" strokeLinecap="round" />
        <path d="M18 36 h22 l-5 -5 M46 44 h-22 l5 5" stroke={T} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Lienzo>
    ),
  },
  orden_limpieza: {
    alto: (
      <Lienzo>
        <path d="M40 6 l-12 30" stroke={N} strokeWidth="4" strokeLinecap="round" />
        <path d="M18 34 h20 l4 20 h-28z" fill={T} />
        <path d="M22 44 v10 M28 44 v10 M34 44 v10" stroke={C} strokeWidth="2" />
        <path d="M50 22 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2z" fill={A} className="c-titila" />
        <path d="M12 16 l1.5 3 3 1.5 -3 1.5 -1.5 3 -1.5 -3 -3 -1.5 3 -1.5z" fill={A} className="c-titila" />
      </Lienzo>
    ),
    medio: (
      <Lienzo>
        <path d="M10 26 h44 l-5 28 h-34z" fill={C} />
        <path d="M10 26 h44" stroke={T} strokeWidth="4" strokeLinecap="round" />
        <path d="M18 36 h28 M20 45 h24" stroke={T} strokeWidth="2.5" strokeLinecap="round" />
        <rect x="20" y="14" width="10" height="12" rx="2" fill={A} />
        <rect x="33" y="10" width="10" height="16" rx="2" fill={N} />
      </Lienzo>
    ),
    bajo: (
      <Lienzo>
        <path d="M14 30 l10 -8 h16 l10 8 -6 6 -4 -3 v20 h-16 v-20 l-4 3z" fill={C} transform="rotate(-12 32 36)" />
        <rect x="30" y="44" width="24" height="10" rx="3" fill={A} transform="rotate(10 42 49)" />
        <circle cx="12" cy="50" r="5" fill={N} />
      </Lienzo>
    ),
  },
  ruido: {
    bajo: (
      <Lienzo>
        <path d="M14 38 v-6 a18 18 0 0 1 36 0 v6" stroke={N} strokeWidth="5" fill="none" strokeLinecap="round" />
        <rect x="8" y="34" width="12" height="18" rx="5" fill={T} />
        <rect x="44" y="34" width="12" height="18" rx="5" fill={T} />
      </Lienzo>
    ),
    moderado: (
      <Lienzo>
        <Parlante />
        <path d="M42 26 a10 10 0 0 1 0 16" stroke={T} strokeWidth="3.5" fill="none" strokeLinecap="round" className="c-onda" />
      </Lienzo>
    ),
    alto: (
      <Lienzo>
        <Parlante />
        <path d="M40 28 a8 8 0 0 1 0 12" stroke={T} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M46 22 a16 16 0 0 1 0 24" stroke={T} strokeWidth="3" fill="none" strokeLinecap="round" className="c-onda" />
        <g className="c-flota" fill={A}>
          <circle cx="50" cy="14" r="3.5" /><path d="M53 14 v-10 l5 2" stroke={A} strokeWidth="2.5" fill="none" />
        </g>
      </Lienzo>
    ),
  },
  visitas: {
    nunca: (
      <Lienzo>
        <path d="M8 30 l24 -18 24 18" stroke={N} strokeWidth="4" fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <rect x="14" y="28" width="36" height="28" rx="3" fill={B} stroke={N} strokeWidth="3" />
        <Persona x={32} y={38} escala={0.75} />
      </Lienzo>
    ),
    ocasional: (
      <Lienzo>
        <Persona x={22} y={30} color={N} />
        <Persona x={42} y={30} color={T} />
      </Lienzo>
    ),
    frecuente: (
      <Lienzo>
        <Persona x={14} y={34} color={C} escala={0.8} />
        <Persona x={50} y={34} color={A} escala={0.8} />
        <Persona x={32} y={28} color={T} />
      </Lienzo>
    ),
  },
  fumar: {
    no_fuma_no_tolera: (
      <Lienzo>
        <Cigarro y={29} />
        <circle cx="32" cy="32" r="24" stroke="#c62828" strokeWidth="5" fill="none" />
        <path d="M15 15 l34 34" stroke="#c62828" strokeWidth="5" strokeLinecap="round" />
      </Lienzo>
    ),
    no_fuma_tolera: (
      <Lienzo>
        <path d="M14 50 c0 -24 16 -36 38 -38 c0 24 -14 38 -38 38z" fill={C} />
        <path d="M16 48 c8 -12 18 -20 30 -28" stroke={T} strokeWidth="3" fill="none" strokeLinecap="round" />
      </Lienzo>
    ),
    // Cigarro con humo que sube en nubes
    fuma: (
      <Lienzo>
        <g className="c-humo" fill="#b8c7cf">
          <circle cx="40" cy="31" r="7" />
          <circle cx="48" cy="24" r="6.5" />
          <circle cx="41" cy="17" r="5.5" />
          <circle cx="50" cy="11" r="4.5" />
        </g>
        <path d="M44 41 c-3 -3 2 -5 0 -8" stroke="#b8c7cf" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <Cigarro y={45} />
      </Lienzo>
    ),
  },
  mascotas: {
    no_tiene_no_tolera: (
      <Lienzo>
        <Huella color={S} />
        <path d="M12 52 l40 -40" stroke={N} strokeWidth="5" strokeLinecap="round" />
      </Lienzo>
    ),
    no_tiene_tolera: (
      <Lienzo>
        <path d="M32 54 c-16 -10 -24 -18 -24 -28 a12 12 0 0 1 24 -4 a12 12 0 0 1 24 4 c0 10 -8 18 -24 28z" fill={C} className="c-late" />
        <Huella x={32} y={32} color={T} />
      </Lienzo>
    ),
    // Carita de perrito
    tiene: (
      <Lienzo>
        <ellipse cx="13" cy="30" rx="7.5" ry="15" fill="#b7791f" transform="rotate(16 13 30)" />
        <ellipse cx="51" cy="30" rx="7.5" ry="15" fill="#b7791f" transform="rotate(-16 51 30)" />
        <circle cx="32" cy="32" r="19" fill="#f2c94c" />
        <ellipse cx="32" cy="41" rx="11" ry="8.5" fill="#fff3d6" />
        <circle cx="25" cy="28" r="3" fill={N} /><circle cx="39" cy="28" r="3" fill={N} />
        <circle cx="26" cy="27" r="1" fill={B} /><circle cx="40" cy="27" r="1" fill={B} />
        <ellipse cx="32" cy="36.5" rx="4.4" ry="3.2" fill={N} />
        <path d="M32 39.5 v3" stroke={N} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M27 42.5 q5 3.5 10 0" stroke={N} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M30 44 q2 6 4 0z" fill="#f28b82" />
      </Lienzo>
    ),
  },
}

// Ilustraciones de los pasos de estudios y origen
const PASOS = {
  estudios: (
    <Lienzo>
      <path d="M4 24 L32 12 L60 24 L32 36 Z" fill={N} />
      <path d="M16 30 v12 c0 6 32 6 32 0 v-12 l-16 7z" fill={T} />
      <path d="M54 26 v14" stroke={A} strokeWidth="3" strokeLinecap="round" />
      <circle cx="54" cy="42" r="3.2" fill={A} />
    </Lienzo>
  ),
  origen: (
    <Lienzo>
      <path d="M32 58 C20 44 12 34 12 24 a20 20 0 0 1 40 0 c0 10 -8 20 -20 34z" fill={T} />
      <circle cx="32" cy="24" r="12" fill={B} />
      <path d="M25 27 l7 -6 7 6 v6 h-14z" fill={A} />
      <rect x="30" y="29" width="4" height="4" fill={N} />
    </Lienzo>
  ),
}

export function IlustracionPaso({ tipo }) {
  return PASOS[tipo] ?? null
}

export function IlustracionOpcion({ categoria, valor }) {
  return ILUSTRACIONES[categoria]?.[valor] ?? null
}

// Íconos de los niveles de importancia
const Icono = ({ children }) => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
)
const ICONOS_NIVEL = {
  // Dos flechas que se acomodan: «me adapto»
  flexible: <Icono><path d="M4 9h12l-3-3M20 15H8l3 3" /></Icono>,
  importante: <Icono><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></Icono>,
  // Diamante: lo más valioso, no se negocia
  imprescindible: <Icono><path d="M6 4h12l3 5-9 11L3 9z" /><path d="M3 9h18M9 4l3 16 3-16" /></Icono>,
}

export function IconoNivel({ nivel }) {
  return ICONOS_NIVEL[nivel] ?? null
}
