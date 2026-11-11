import { PASOS_HABITOS, PASOS_PERFIL } from './datos.js'

const CLAVES = [...PASOS_PERFIL, ...PASOS_HABITOS].map((p) => p.clave)

// Fondo a pantalla completa y uniforme: la ciudad de RoomMatch cubre toda la pantalla y encima va
// un tono suave que cambia según la pregunta. Cada tono es una capa y solo cambia su opacidad
export default function Fondo({ clave = null }) {
  return (
    <div className="c-fondo" aria-hidden="true">
      <div className="c-fondo-ciudad" />
      <div className={`c-fondo-capa base${clave === null ? ' activa' : ''}`} />
      {CLAVES.map((c) => <div key={c} className={`c-fondo-capa ${c}${clave === c ? ' activa' : ''}`} />)}
    </div>
  )
}
