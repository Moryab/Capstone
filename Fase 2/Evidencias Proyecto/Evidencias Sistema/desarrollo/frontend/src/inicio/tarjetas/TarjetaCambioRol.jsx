import { NOMBRES_ROL, SIN_CAMBIO_CON_CONVIVENCIA, useCambioRol } from '../../rol/CambioRol.jsx'
import { IconoBuscador, IconoOferente } from '../../rol/iconos.jsx'
import { useSesion } from '../../sesion/SesionContext.jsx'
import { Tarjeta } from '../comunes.jsx'

const ICONOS = { buscador: IconoBuscador, oferente: IconoOferente }

// Lo que se le propone según el rol al que pasaría
const TEXTOS = {
  oferente: {
    titulo: '¿Ahora tienes un espacio para ofrecer?',
    texto: 'Cambia a oferente para publicar tu habitación o departamento. Antes de confirmar te mostramos qué cambia.',
  },
  buscador: {
    titulo: '¿Ahora buscas dónde vivir?',
    texto: 'Cambia a buscador y RoomMatch te propondrá alojamientos compatibles. Antes de confirmar te mostramos qué cambia.',
  },
}

// Dos flechas opuestas: «cambiar de un rol al otro». Giran al pasar el mouse por la tarjeta
const IconoCambio = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
    strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5" />
  </svg>
)

/**
 * Cambio de rol a mano desde el inicio (también está en Configuración). Muestra el rol de hoy y
 * abre el mismo modal de confirmación. Con una convivencia activa explica por qué no se puede.
 */
export default function TarjetaCambioRol() {
  const { usuario } = useSesion()
  const { abrir } = useCambioRol()
  if (usuario.rol !== 'estudiante' || !usuario.modo) return null

  const destino = usuario.modo === 'buscador' ? 'oferente' : 'buscador'
  const Actual = ICONOS[usuario.modo]
  const Destino = ICONOS[destino]
  const bloqueado = Boolean(usuario.con_convivencia)

  return (
    <Tarjeta className="i-area-rol" cuerpo={`i-rol${bloqueado ? ' bloqueado' : ''}`} etiqueta="i-titulo-rol">
      <div className="i-rol-iconos" aria-hidden="true">
        <span className="i-rol-icono actual"><Actual tamano={30} /></span>
        <IconoCambio className="i-rol-flechas" />
        <span className="i-rol-icono destino"><Destino tamano={30} /></span>
      </div>

      <div className="i-rol-texto">
        <p className="i-rol-hoy">Tu rol hoy: <strong>{NOMBRES_ROL[usuario.modo]}</strong></p>
        <h2 id="i-titulo-rol">{TEXTOS[destino].titulo}</h2>
        <p className="i-rol-desc">{bloqueado ? `${SIN_CAMBIO_CON_CONVIVENCIA}.` : TEXTOS[destino].texto}</p>
      </div>

      <button type="button" className="i-rol-boton" onClick={() => abrir(destino)} aria-haspopup="dialog"
        disabled={bloqueado}>
        <IconoCambio /> Cambiar a {destino}
      </button>
    </Tarjeta>
  )
}
