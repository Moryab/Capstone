// Estilo mínimo: ocupa todo su contenedor
import './sinFoto.css'

// Habitación dibujada (cama, ventana y lámpara) para los alojamientos que aún no tienen fotos.
// Es el mismo dibujo del inicio; rellena su contenedor recortándose al centro, sea cual sea su forma
export default function SinFoto({ className = '' }) {
  return (
    <svg className={`sin-foto-dibujo ${className}`.trim()} viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"
      aria-hidden="true" focusable="false">
      <rect width="160" height="100" fill="#e3f1ef" />
      <rect y="74" width="160" height="26" fill="#cfe5e1" />
      <rect x="98" y="20" width="40" height="30" rx="3" fill="#fff" />
      <rect x="18" y="54" width="62" height="22" rx="5" fill="#12766b" />
      <rect x="18" y="45" width="18" height="14" rx="4" fill="#3fd1b8" />
      <circle cx="122" cy="66" r="6" fill="#f2c94c" />
    </svg>
  )
}
