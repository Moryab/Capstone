import { Tarjeta } from '../comunes.jsx'
import '../pausadas.css'

// Casa con distintivo de pausa (la misma idea del modal, en pequeño)
function Icono() {
  return (
    <svg className="p-ilustracion" viewBox="0 0 120 96" aria-hidden="true">
      <path d="M26 50 L60 22 L94 50" fill="none" stroke="#3fd1b8" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="34" y="48" width="52" height="38" rx="5" fill="#fff" />
      <rect x="54" y="62" width="13" height="24" rx="3" fill="#12766b" />
      <g className="p-ilustracion-pausa">
        <circle cx="92" cy="28" r="17" fill="#f2c94c" />
        <rect x="85.5" y="20" width="5" height="16" rx="1.5" fill="#0e2440" />
        <rect x="93.5" y="20" width="5" height="16" rx="1.5" fill="#0e2440" />
      </g>
    </svg>
  )
}

/**
 * Recordatorio en el inicio: publicaciones pausadas que el oferente aún no confirma. Las
 * respuestas se dan en el modal (ModalPausadas.jsx), que también se abre solo al cambiar de rol.
 */
export default function TarjetaPausadas({ publicaciones, alRevisar }) {
  const n = publicaciones.length
  return (
    <Tarjeta className="i-area-pausadas" cuerpo="p-tarjeta" etiqueta="i-titulo-pausadas" id="i-pausadas">
      <span className="p-tarjeta-icono"><Icono /></span>
      <div>
        <h2 id="i-titulo-pausadas">
          {n === 1 ? 'Tienes un espacio esperando tu respuesta' : `Tienes ${n} espacios esperando tu respuesta`}
        </h2>
        <p className="p-tarjeta-texto">
          {n === 1 ? 'Está pausado' : 'Están pausados'} desde que buscabas alojamiento. Nadie
          {n === 1 ? ' lo' : ' los'} ve hasta que confirmes si {n === 1 ? 'sigue disponible' : 'siguen disponibles'}.
        </p>
        <ul className="p-tarjeta-lista" aria-label="Publicaciones pausadas">
          {publicaciones.map((p) => <li key={p.id}>{p.titulo}</li>)}
        </ul>
      </div>
      <button type="button" className="r-boton grande" onClick={alRevisar} aria-haspopup="dialog">
        Revisar ahora
      </button>
    </Tarjeta>
  )
}
