import { useEffect, useId, useRef, useState } from 'react'
import './listaBuscable.css'

export const normalizar = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
// Cada palabra escrita debe aparecer: «ing civil inf» encuentra «Ingeniería Civil Informática»
const coincide = (texto, consulta) => {
  const t = normalizar(texto)
  return normalizar(consulta).split(/\s+/).filter(Boolean).every((p) => t.includes(p))
}

/**
 * Campo que se busca escribiendo y se elige de una lista (combobox accesible: flechas, Enter, Escape).
 * Lo usan la carrera (SelectorCarrera) y la comuna de origen (SelectorComuna).
 * - `opciones`: [{ valor, detalle? }] (null mientras se cargan); `valor`: lo elegido (texto).
 * - `alElegir(opcion)`. Si se sale del campo con un texto que no es una opción, vuelve a lo elegido.
 * - `extra`: { texto, alElegir(consulta) } opcional, siempre al final de la lista (por ejemplo,
 *   «No encuentro mi carrera»).
 */
export default function ListaBuscable({
  id, nombre, etiqueta, valor, opciones, alElegir, extra, placeholder, ayuda, error, maxResultados = 80,
}) {
  const [consulta, setConsulta] = useState(null) // null: no se está escribiendo (se muestra lo elegido)
  const [abierta, setAbierta] = useState(false)
  const [activa, setActiva] = useState(0)
  const listaRef = useRef(null)
  const idLista = useId()
  const idAyuda = `${id}-ayuda`

  const filtradas = opciones ? opciones.filter((o) => coincide(o.valor, consulta ?? '')) : []
  const visibles = filtradas.slice(0, maxResultados)
  const total = visibles.length + (extra ? 1 : 0)

  useEffect(() => {
    // La opción marcada con el teclado siempre a la vista
    listaRef.current?.querySelector('[data-activa]')?.scrollIntoView({ block: 'nearest' })
  }, [activa, abierta])

  const elegir = (opcion) => {
    alElegir(opcion)
    setConsulta(null)
    setAbierta(false)
  }
  const elegirExtra = () => {
    extra.alElegir(consulta ?? '')
    setConsulta(null)
    setAbierta(false)
  }
  const alSalir = () => {
    // Si lo escrito es justo una opción, se elige; si no, vuelve a lo que estaba
    if (consulta != null) {
      const exacta = opciones?.find((o) => normalizar(o.valor) === normalizar(consulta))
      if (exacta) elegir(exacta)
      else setConsulta(null)
    }
    setAbierta(false)
  }
  const teclas = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setAbierta(true)
      if (total) setActiva((i) => (i + (e.key === 'ArrowDown' ? 1 : -1) + total) % total)
    } else if (e.key === 'Enter') {
      // Enter elige de la lista; nunca envía el formulario desde aquí
      e.preventDefault()
      if (!abierta) setAbierta(true)
      else if (activa < visibles.length) elegir(visibles[activa])
      else if (extra) elegirExtra()
    } else if (e.key === 'Escape') {
      setConsulta(null)
      setAbierta(false)
    }
  }

  return (
    <div className="campo lb">
      <label htmlFor={id}>{etiqueta}</label>
      <div className="lb-caja">
        <input id={id} name={nombre} role="combobox" aria-expanded={abierta} aria-controls={idLista}
          aria-autocomplete="list" aria-activedescendant={abierta && total ? `${idLista}-${activa}` : undefined}
          aria-invalid={Boolean(error)} aria-describedby={idAyuda} autoComplete="off" required
          value={consulta ?? valor} placeholder={opciones ? placeholder : 'Cargando…'}
          onChange={(e) => { setConsulta(e.target.value); setAbierta(true); setActiva(0) }}
          onFocus={() => setAbierta(true)} onClick={() => setAbierta(true)} onBlur={alSalir} onKeyDown={teclas} />
        <span className="lb-flecha" aria-hidden="true" />
        {abierta && opciones && (
          // mousedown sin perder el foco: así el clic alcanza a elegir antes del blur
          <ul className="lb-lista" id={idLista} role="listbox" ref={listaRef} onMouseDown={(e) => e.preventDefault()}>
            {visibles.map((o, i) => (
              <li key={o.valor} id={`${idLista}-${i}`} role="option" aria-selected={o.valor === valor}
                data-activa={i === activa || undefined} onClick={() => elegir(o)} onMouseEnter={() => setActiva(i)}>
                <span>{o.valor}</span>
                {o.detalle && <small>{o.detalle}</small>}
              </li>
            ))}
            {filtradas.length > visibles.length && (
              <li className="lb-vacio" role="presentation">Escribe más para ver el resto ({filtradas.length - visibles.length} más)</li>
            )}
            {filtradas.length === 0 && <li className="lb-vacio" role="presentation">Nada coincide con «{consulta}»</li>}
            {extra && (
              <li id={`${idLista}-${visibles.length}`} role="option" aria-selected={false} className="lb-extra"
                data-activa={activa === visibles.length || undefined} onClick={elegirExtra}
                onMouseEnter={() => setActiva(visibles.length)}>
                {extra.texto}
              </li>
            )}
          </ul>
        )}
      </div>
      <p className="campo-ayuda" id={idAyuda}>{ayuda}</p>
      {error && <p className="campo-error" role="alert">{error}</p>}
    </div>
  )
}
