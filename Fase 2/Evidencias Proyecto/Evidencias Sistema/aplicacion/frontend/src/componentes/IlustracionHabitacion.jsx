// Una habitación dibujada con los colores de la marca, para las publicaciones sin fotos (la misma de
// «Mis publicaciones»). Se ve entera en cualquier tamaño: se apoya abajo y su propio color de fondo
// (#e3f1ef, el mismo que debe tener la caja que la contiene) completa el resto, sin recortarla
export default function IlustracionHabitacion({ className = '' }) {
  return (
    <svg className={`ilustracion-habitacion ${className}`.trim()} viewBox="0 0 320 200"
      preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <rect width="320" height="200" fill="#e3f1ef" />
      <rect y="150" width="320" height="50" fill="#cfe5e1" />
      <rect x="196" y="46" width="78" height="62" rx="4" fill="#fff" />
      <path d="M235 46v62M196 77h78" stroke="#cfe5e1" strokeWidth="4" />
      <rect x="40" y="112" width="120" height="40" rx="8" fill="#12766b" />
      <rect x="40" y="96" width="34" height="26" rx="6" fill="#3fd1b8" />
      <rect x="180" y="118" width="52" height="34" rx="4" fill="#0e2440" />
      <circle cx="252" cy="134" r="10" fill="#f2c94c" />
    </svg>
  )
}
