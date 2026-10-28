import { useId } from 'react'
import { Link } from 'react-router-dom'

// Ícono de RoomMatch: un techo que cobija a dos personas (dos roomies que hacen match)
export function IconoLogo({ tamano = 44 }) {
  // id único para el degradado, por si el ícono aparece más de una vez en la página
  const idDegradado = useId()

  return (
    <svg className="logo-icono" width={tamano} height={tamano} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id={idDegradado} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0b1f3a" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${idDegradado})`} />
      <path d="M8.5 19.5 L20 10 L31.5 19.5" fill="none" stroke="#fff" strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="15.5" cy="21.5" r="3" fill="#fff" />
      <circle cx="24.5" cy="21.5" r="3" fill="#5eead4" />
      <path d="M9.5 31.5 a6 6 0 0 1 12 0 Z" fill="#fff" />
      <path d="M18.5 31.5 a6 6 0 0 1 12 0 Z" fill="#5eead4" />
    </svg>
  )
}

// Logo completo: ícono + nombre + lema. Lleva al inicio
export default function Logo() {
  return (
    <Link to="/" className="logo" aria-label="RoomMatch, ir al inicio">
      <IconoLogo />
      <span className="logo-textos">
        <span className="logo-nombre">
          Room<span className="logo-acento">Match</span>
        </span>
        <span className="logo-lema">Tu hogar y tu roomie ideal</span>
      </span>
    </Link>
  )
}
