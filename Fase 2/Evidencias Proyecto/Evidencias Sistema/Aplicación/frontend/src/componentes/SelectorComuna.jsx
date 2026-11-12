import { COMUNAS_CHILE } from '../comunasChile.js'
import ListaBuscable from './ListaBuscable.jsx'

const comunasDe = (region) => COMUNAS_CHILE.filter(([, r]) => r === region).map(([comuna]) => ({ valor: comuna }))

/**
 * Al cambiar la región de origen: si la ciudad elegida no es de la nueva región, se limpia.
 * Devuelve los cambios para el formulario ({ region_origen, ciudad_origen? }).
 */
export function cambiosDeRegion(region, ciudad) {
  const sigue = COMUNAS_CHILE.some(([c, r]) => c === ciudad && r === region)
  return { region_origen: region, ...(!sigue && { ciudad_origen: '' }) }
}

/**
 * Ciudad de origen: primero se elige la región (otro campo) y aquí se busca entre las comunas de esa
 * región. `alCambiar({ ciudad_origen })`.
 */
export default function SelectorComuna({ id = 'ciudad_origen', region, valor, alCambiar, error }) {
  if (!region) {
    return (
      <div className="campo">
        <label htmlFor={id}>Ciudad de origen</label>
        <input id={id} disabled placeholder="Primero elige tu región" />
      </div>
    )
  }
  const opciones = comunasDe(region)
  // Escrita antes de que existiera la lista (por ejemplo «san pedro»): se conserva hasta elegir una
  const antigua = Boolean(valor && !opciones.some((o) => o.valor === valor))
  return (
    <ListaBuscable id={id} nombre="ciudad_origen" etiqueta="Ciudad de origen" valor={valor} error={error}
      opciones={opciones} alElegir={(o) => alCambiar({ ciudad_origen: o.valor })}
      placeholder="Escribe para buscar tu comuna"
      ayuda={antigua ? 'Elígela de la lista de comunas de tu región.'
        : `${opciones.length} comunas en esta región. Si eres de un pueblo, elige su comuna.`} />
  )
}
