// Ilustraciones animadas del panel deslizante. Son decorativas (el texto del panel ya explica todo),
// por eso van con aria-hidden. Las animaciones están en index.css y se apagan con "reducir movimiento"

const LUZ = '#fcd34d' // luz cálida de las ventanas

// Dos roomies que hacen "match" frente a un edificio
function Match() {
  return (
    <svg className="ilustracion" viewBox="0 0 260 190" aria-hidden="true">
      <ellipse cx="130" cy="166" rx="112" ry="8" fill="#fff" opacity="0.15" />

      {/* Edificio */}
      <rect x="92" y="56" width="76" height="110" rx="8" fill="#fff" opacity="0.22" />
      {[[104, 70], [136, 70], [104, 100], [136, 100]].map(([x, y], i) => (
        <rect key={i} className="ventana" style={{ animationDelay: `${i * 0.9}s` }}
          x={x} y={y} width="20" height="18" rx="3" fill={LUZ} />
      ))}
      <rect x="117" y="130" width="26" height="36" rx="4" fill="#fff" opacity="0.5" />

      {/* Líneas que conectan a los roomies con el match */}
      <path className="conexion" d="M66 96 Q86 46 113 36" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      <path className="conexion" d="M194 96 Q174 46 147 36" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />

      {/* Roomie con mochila */}
      <g className="roomie roomie-a">
        <rect x="30" y="122" width="12" height="30" rx="5" fill="#fff" opacity="0.55" />
        <rect x="38" y="116" width="36" height="50" rx="18" fill="#fff" />
        <circle cx="56" cy="100" r="13" fill="#fff" />
      </g>

      {/* Roomie con maleta */}
      <g className="roomie roomie-b">
        <rect x="186" y="116" width="36" height="50" rx="18" fill="#fff" />
        <circle cx="204" cy="100" r="13" fill="#fff" />
        <rect x="226" y="140" width="18" height="24" rx="4" fill="#fff" opacity="0.6" />
        <path d="M231 140v-5h8v5" fill="none" stroke="#fff" strokeWidth="2" opacity="0.6" />
      </g>

      {/* Match */}
      <g className="match">
        <circle cx="130" cy="32" r="18" fill="#fff" />
        <path d="M130 40 L122 32 A4.8 4.8 0 0 1 130 25.5 A4.8 4.8 0 0 1 138 32 Z" fill="#0f766e" />
      </g>

      <circle className="chispa" cx="34" cy="60" r="3" fill="#fff" />
      <circle className="chispa" style={{ animationDelay: '0.8s' }} cx="226" cy="64" r="2.5" fill="#fff" />
      <circle className="chispa" style={{ animationDelay: '1.6s' }} cx="180" cy="20" r="2" fill="#fff" />
      <circle className="chispa" style={{ animationDelay: '1.2s' }} cx="78" cy="22" r="2" fill="#fff" />
    </svg>
  )
}

// Casa con ventanas encendidas, humo y una llave: volver a "tu" hogar
function Hogar() {
  return (
    <svg className="ilustracion" viewBox="0 0 260 190" aria-hidden="true">
      <ellipse cx="130" cy="166" rx="112" ry="8" fill="#fff" opacity="0.15" />

      {/* Humo de la chimenea */}
      {[0, 1, 2].map((i) => (
        <circle key={i} className="humo" style={{ animationDelay: `${i}s` }}
          cx="168" cy="40" r="6" fill="#fff" />
      ))}

      {/* Casa */}
      <rect x="160" y="44" width="16" height="32" rx="2" fill="#fff" opacity="0.7" />
      <path d="M70 92 L130 44 L190 92 Z" fill="#fff" strokeLinejoin="round" />
      <rect x="82" y="88" width="96" height="78" rx="4" fill="#fff" opacity="0.92" />
      <rect className="ventana" x="94" y="102" width="22" height="20" rx="3" fill={LUZ} />
      <rect className="ventana" style={{ animationDelay: '1.5s' }} x="144" y="102" width="22" height="20" rx="3" fill={LUZ} />
      <rect x="118" y="120" width="24" height="46" rx="4" fill="#0f766e" />
      <circle cx="136" cy="144" r="2.2" fill={LUZ} />

      {/* Llave flotando */}
      <g className="llave">
        <circle cx="40" cy="58" r="11" fill="none" stroke="#fff" strokeWidth="4.5" />
        <path d="M51 58 H76 M68 58 v8 M75 58 v6" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" />
      </g>

      <circle className="chispa" cx="222" cy="70" r="3" fill="#fff" />
      <circle className="chispa" style={{ animationDelay: '1s' }} cx="30" cy="118" r="2.5" fill="#fff" />
      <circle className="chispa" style={{ animationDelay: '1.8s' }} cx="214" cy="128" r="2" fill="#fff" />
    </svg>
  )
}

export default function Ilustracion({ tipo }) {
  return tipo === 'hogar' ? <Hogar /> : <Match />
}
