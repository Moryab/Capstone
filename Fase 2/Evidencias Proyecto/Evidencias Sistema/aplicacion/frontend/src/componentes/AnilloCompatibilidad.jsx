import { formatearPorcentaje, NIVELES_COMPATIBILIDAD } from '../compatibilidad.js'
import { mayusculaInicial } from '../inicio/utilidades.js'
import './anilloCompatibilidad.css'

const RADIO = 26
const PERIMETRO = 2 * Math.PI * RADIO

/**
 * Compatibilidad como anillo, para las tarjetas (roomies y propuestas). CA-15.2: el porcentaje y el
 * nivel siempre van escritos; el anillo y su color solo los refuerzan.
 */
export default function AnilloCompatibilidad({ porcentaje, nivel }) {
  const relleno = PERIMETRO * (1 - Math.min(100, Math.max(0, porcentaje)) / 100)
  return (
    <div className={`anillo-compat compat-${nivel}`}>
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <circle cx="32" cy="32" r={RADIO} className="anillo-fondo" />
        <circle cx="32" cy="32" r={RADIO} className="anillo-valor"
          strokeDasharray={PERIMETRO} strokeDashoffset={relleno} />
      </svg>
      <strong>{formatearPorcentaje(porcentaje).replace(' ', '')}</strong>
      {/* «Compatibilidad alta»: visible solo el nivel, para que quepa bajo el anillo */}
      <span><span className="visualmente-oculto">Compatibilidad </span>{mayusculaInicial(NIVELES_COMPATIBILIDAD[nivel].replace('Compatibilidad ', ''))}</span>
    </div>
  )
}
