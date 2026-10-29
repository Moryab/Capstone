import { Link } from 'react-router-dom'
import { Tarjeta } from '../comunes.jsx'
import { IconoCandado, IconoCheck, IconoFlecha } from '../iconos.jsx'

// Ilustraciones pequeñas de cada función que viene
const ILUSTRACIONES = {
  busqueda: (
    <svg viewBox="0 0 120 80" aria-hidden="true">
      <rect x="8" y="14" width="76" height="56" rx="8" fill="#e3f1ef" />
      <path d="M8 44 C30 34 50 56 84 40" stroke="#bfe0da" strokeWidth="4" fill="none" />
      <g className="i-pronto-mover">
        <path d="M34 22 a9 9 0 0 1 18 0 c0 8 -9 16 -9 16 s-9 -8 -9 -16z" fill="#12766b" />
        <circle cx="43" cy="22" r="3.2" fill="#fff" />
      </g>
      <g className="i-pronto-mover lento">
        <circle cx="88" cy="44" r="16" fill="#fff" stroke="#0e2440" strokeWidth="5" />
        <path d="M100 56 l12 12" stroke="#0e2440" strokeWidth="6" strokeLinecap="round" />
      </g>
    </svg>
  ),
  roomie: (
    <svg viewBox="0 0 120 80" aria-hidden="true">
      <circle cx="38" cy="30" r="12" fill="#0e2440" />
      <path d="M16 70 a22 22 0 0 1 44 0z" fill="#0e2440" />
      <circle cx="82" cy="30" r="12" fill="#12766b" />
      <path d="M60 70 a22 22 0 0 1 44 0z" fill="#12766b" />
      <path className="i-pronto-latido" d="M60 22 c-4-6-14-3-12 4 c1 5 12 11 12 11 s11-6 12-11 c2-7-8-10-12-4z" fill="#f2c94c" />
    </svg>
  ),
  cuestionario: (
    <svg viewBox="0 0 120 80" aria-hidden="true">
      <rect x="30" y="8" width="60" height="68" rx="8" fill="#fff" stroke="#d9e5e9" strokeWidth="3" />
      <rect x="48" y="3" width="24" height="10" rx="4" fill="#0e2440" />
      {[24, 40, 56].map((y, i) => (
        <g key={y} className="i-pronto-mover" style={{ animationDelay: `${i * 0.15}s` }}>
          <rect x="40" y={y} width="10" height="10" rx="3" fill={i < 2 ? '#12766b' : '#e3f1ef'} />
          <rect x="56" y={y + 3} width="24" height="4" rx="2" fill="#d9e5e9" />
        </g>
      ))}
    </svg>
  ),
  match: (
    <svg viewBox="0 0 120 80" aria-hidden="true">
      <g className="i-pronto-mover">
        <rect x="14" y="18" width="44" height="52" rx="8" fill="#e3f1ef" transform="rotate(-8 36 44)" />
        <circle cx="36" cy="38" r="8" fill="#12766b" transform="rotate(-8 36 44)" />
      </g>
      <g className="i-pronto-mover lento">
        <rect x="62" y="14" width="44" height="52" rx="8" fill="#0e2440" transform="rotate(8 84 40)" />
        <circle cx="84" cy="34" r="8" fill="#3fd1b8" transform="rotate(8 84 40)" />
      </g>
      <circle cx="60" cy="66" r="11" fill="#f2c94c" />
      <path d="M55 66 l4 4 7-8" stroke="#0e2440" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}

// Función de la plataforma. Con `a` ya existe y toda la tarjeta lleva ahí; sin `a` es un adelanto
// bloqueado («Muy pronto»)
export default function TarjetaPronto({ tipo, titulo, texto, a }) {
  const id = `i-pronto-${tipo}`
  return (
    <Tarjeta className="i-area-pronto" cuerpo={`i-pronto${a ? ' disponible' : ''}`} etiqueta={id}>
      {a ? (
        <span className="i-candado disponible"><IconoCheck tamano={12} /> Disponible</span>
      ) : (
        <span className="i-candado"><IconoCandado /> Muy pronto</span>
      )}
      <div className="i-pronto-ilustracion">{ILUSTRACIONES[tipo]}</div>
      <h3 id={id}>
        {/* El enlace del título cubre toda la tarjeta */}
        {a ? <Link to={a} className="i-pronto-enlace">{titulo} <IconoFlecha /></Link> : titulo}
      </h3>
      <p>{texto}</p>
    </Tarjeta>
  )
}
