import './interruptorEscena.css'

/**
 * Interruptor ilustrado con elementos de RoomMatch: la ciudad de los fondos, la red de conexiones entre
 * roomies y corazones de match. Activo: el botón (una casa) rueda a la derecha, abre la puerta y
 * enciende la luz; en pausa vuelve a la izquierda con la puerta cerrada.
 * Es un switch accesible: `activo`, `alCambiar(nuevo)` y los ids de su etiqueta y su descripción.
 */
export default function InterruptorEscena({ activo, alCambiar, etiquetadoPor, descritoPor, deshabilitado }) {
  return (
    <button type="button" role="switch" aria-checked={activo} aria-labelledby={etiquetadoPor}
      aria-describedby={descritoPor} disabled={deshabilitado} className="ie" data-activo={activo || undefined}
      onClick={() => alCambiar(!activo)}>
      {/* Activo: la red de conexiones y los corazones (a la izquierda, el botón queda a la derecha) */}
      <span className="ie-activo" aria-hidden="true">
        <svg className="ie-red" viewBox="0 0 80 44" preserveAspectRatio="xMinYMid meet">
          <path d="M8 30L22 12L38 24L52 8L66 20" fill="none" stroke="#5eead4" strokeOpacity="0.55" strokeWidth="1.2" />
          <path d="M22 12L30 34L38 24" fill="none" stroke="#5eead4" strokeOpacity="0.35" strokeWidth="1" />
          {[[8, 30], [22, 12], [38, 24], [52, 8], [66, 20], [30, 34]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" fill="#5eead4" />
          ))}
        </svg>
        <span className="ie-corazon" style={{ left: '18%' }} />
        <span className="ie-corazon chico" style={{ left: '40%' }} />
      </span>
      {/* En pausa: el ícono de pausa (a la derecha, el botón queda a la izquierda) */}
      <span className="ie-pausa" aria-hidden="true"><span /><span /></span>
      {/* La ciudad de los fondos de RoomMatch, abajo */}
      <svg className="ie-ciudad" viewBox="0 0 132 16" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 16V9h8V5h7v4h6V2h9v7h5V6h8v10h4V8h7V3h8v6h6V7h7v9h5V4h9v5h6V6h8v10h5V8h6V5h8z" />
      </svg>

      {/* El botón: una rueda que gira al avanzar, con la casa encima */}
      <span className="ie-boton" aria-hidden="true">
        <span className="ie-rueda" />
        <svg className="ie-casa" viewBox="0 0 32 32">
          <path d="M5 15L16 6l11 9" fill="none" stroke="#0e3a4f" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 13.5V26h16V13.5" fill="#ffffff" stroke="#0e3a4f" strokeWidth="2.2" strokeLinejoin="round" />
          <rect className="ie-ventana" x="10.5" y="15.5" width="5" height="4.5" rx="1" />
          <rect className="ie-puerta" x="17.5" y="17" width="4.5" height="9" rx="1" />
        </svg>
      </span>
    </button>
  )
}
