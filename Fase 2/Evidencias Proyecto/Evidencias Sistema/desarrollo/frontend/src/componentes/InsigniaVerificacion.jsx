import { IconoVerificado } from './Iconos.jsx'

// HU-23: va junto al nombre del estudiante en su perfil, sus publicaciones, la lista de posibles
// roomies y las propuestas de match. Solo un administrador la otorga o la quita (HU-22), así que
// refleja `verificado` tal como lo entrega la API: si se revoca, deja de aparecer en todas las vistas
export default function InsigniaVerificacion({ verificado }) {
  if (verificado) {
    return (
      <span className="insignia-verificado" title="Un administrador revisó su comprobante de alumno regular">
        <IconoVerificado /> Estudiante verificado
      </span>
    )
  }
  return (
    <span className="insignia-sin-verificar" title="Aún no acredita su condición de estudiante">
      Sin verificar
    </span>
  )
}
