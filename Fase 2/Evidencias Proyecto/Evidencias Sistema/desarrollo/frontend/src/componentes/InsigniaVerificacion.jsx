import { IconoVerificado } from './Iconos.jsx'

/**
 * EP-02 · HU-23: insignia junto al nombre de un estudiante. Ya está puesta en el perfil, en las
 * tarjetas de «Posibles roomies», en las propuestas de match y en el detalle de un alojamiento,
 * así que la historia se completa solo aquí (por ejemplo, la marca «Sin verificar» de CA-23.2).
 */
export default function InsigniaVerificacion({ verificado }) {
  if (!verificado) return null
  return (
    <span className="insignia-verificado" title="Estudiante con su condición acreditada">
      <IconoVerificado /> Verificado
    </span>
  )
}
