import { useEffect, useState } from 'react'
import { api } from '../api.js'
import ListaBuscable, { normalizar } from './ListaBuscable.jsx'

// Las carreras de cada institución se piden una vez por sesión
const cache = new Map()

/**
 * Carrera del estudiante: se busca escribiendo y se elige de la lista de su institución (oferta del
 * SIES). Si no está, «No encuentro mi carrera» deja escribirla a mano (`otra`). Al cambiar de
 * institución el formulario la limpia. `alCambiar({ carrera, carrera_otra })`.
 */
export default function SelectorCarrera({ id = 'carrera', institucionId, valor, otra, alCambiar, error }) {
  const [cargadas, setCargadas] = useState({ id: null, lista: null })

  useEffect(() => {
    if (!institucionId || cache.has(institucionId)) return undefined
    let vigente = true
    api(`/catalogos/carreras/${institucionId}`)
      .then(({ carreras }) => {
        cache.set(institucionId, carreras)
        if (vigente) setCargadas({ id: institucionId, lista: carreras })
      })
      .catch(() => vigente && setCargadas({ id: institucionId, lista: [] }))
    return () => { vigente = false }
  }, [institucionId])
  const lista = cache.get(institucionId) ?? (cargadas.id === institucionId ? cargadas.lista : null)

  if (!institucionId) {
    return (
      <div className="campo">
        <label htmlFor={id}>Carrera</label>
        <input id={id} disabled placeholder="Primero elige tu institución" />
      </div>
    )
  }

  const enfocar = () => requestAnimationFrame(() => document.getElementById(id)?.focus())

  // Escrita a mano: un campo de texto normal, con la vuelta a la lista
  if (otra) {
    return (
      <div className="campo">
        <label htmlFor={id}>Carrera</label>
        <input id={id} name="carrera" value={valor} maxLength={100} required aria-invalid={Boolean(error)}
          aria-describedby={`${id}-ayuda`} placeholder="Escribe el nombre de tu carrera"
          onChange={(e) => alCambiar({ carrera: e.target.value, carrera_otra: true })} />
        <p className="campo-ayuda" id={`${id}-ayuda`}>
          No está en la lista de tu institución: la revisaremos para agregarla.{' '}
          <button type="button" className="enlace-boton" onClick={() => { alCambiar({ carrera: '', carrera_otra: false }); enfocar() }}>
            Buscar en la lista
          </button>
        </p>
        {error && <p className="campo-error" role="alert">{error}</p>}
      </div>
    )
  }

  // Escrita antes de que existiera la lista: se conserva, pero se invita a elegirla de la lista
  const antigua = Boolean(valor && lista && !lista.some((c) => normalizar(c) === normalizar(valor)))
  return (
    <ListaBuscable id={id} nombre="carrera" etiqueta="Carrera" valor={valor} error={error}
      opciones={lista && lista.map((c) => ({ valor: c }))}
      alElegir={(o) => alCambiar({ carrera: o.valor, carrera_otra: false })}
      extra={{ texto: 'No encuentro mi carrera', alElegir: (escrito) => { alCambiar({ carrera: escrito, carrera_otra: true }); enfocar() } }}
      placeholder="Escribe para buscar tu carrera"
      ayuda={!lista ? 'Cargando las carreras de tu institución…'
        : antigua ? 'Elígela de la lista para que se vea con su nombre oficial.'
          : `${lista.length} carreras de tu institución. Escribe parte del nombre para filtrarlas.`} />
  )
}
