import { useEffect, useRef, useState } from 'react'

const ESPERA_MS = 350

/**
 * Buscador que filtra mientras se escribe: espera un momento sin teclear (debounce) antes de
 * avisar, así no se pide al servidor con cada letra. Enter busca de inmediato y × lo vacía.
 * Si el valor cambia desde afuera (por ejemplo, al quitar el chip del filtro), se actualiza.
 */
export default function Buscador({ valor, alBuscar, etiqueta, placeholder = 'Buscar…' }) {
  const [texto, setTexto] = useState(valor)
  const temporizador = useRef(null)
  const ultimo = useRef(valor)

  // Valor nuevo desde afuera (chip quitado, «Limpiar todo»): se refleja en el campo
  useEffect(() => {
    if (valor !== ultimo.current) {
      ultimo.current = valor
      setTexto(valor)
    }
  }, [valor])
  useEffect(() => () => clearTimeout(temporizador.current), [])

  const avisar = (nuevo) => {
    clearTimeout(temporizador.current)
    const limpio = nuevo.trim()
    if (limpio === ultimo.current) return
    ultimo.current = limpio
    alBuscar(limpio)
  }
  const cambiar = (nuevo) => {
    setTexto(nuevo)
    clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => avisar(nuevo), ESPERA_MS)
  }

  return (
    <label className="a-buscador">
      <span className="a-campo-etiqueta">{etiqueta}</span>
      <span className="a-buscador-campo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" />
        </svg>
        <input type="search" value={texto} maxLength={100} placeholder={placeholder}
          onChange={(e) => cambiar(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); avisar(texto) } }} />
        {texto && (
          <button type="button" onClick={() => { setTexto(''); avisar('') }} aria-label="Vaciar la búsqueda">×</button>
        )}
      </span>
    </label>
  )
}
