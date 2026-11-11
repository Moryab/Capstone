import { useEffect, useRef, useState } from 'react'

const ESPERA_MS = 350
const ES_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgentData?.platform ?? navigator.platform ?? '')

/**
 * Buscador que filtra mientras se escribe: espera un momento sin teclear (debounce) antes de
 * avisar, así no se pide al servidor con cada letra. Enter busca de inmediato y × lo vacía.
 * Si el valor cambia desde afuera (por ejemplo, al quitar el chip del filtro), se actualiza.
 * Ctrl + K (⌘ + K en Mac) lleva al buscador desde cualquier parte de la página; el atajo se ve a
 * la derecha mientras está vacío y, al escribir, ese mismo lugar lo ocupa la × (no se mueve nada).
 * `etiqueta` queda para el lector de pantalla; lo visible es el `placeholder`.
 */
export default function Buscador({ valor, alBuscar, etiqueta, placeholder = 'Buscar…' }) {
  const [texto, setTexto] = useState(valor)
  const temporizador = useRef(null)
  const ultimo = useRef(valor)
  const campo = useRef(null)

  // Valor nuevo desde afuera (chip quitado, «Limpiar todo»): se refleja en el campo
  useEffect(() => {
    if (valor !== ultimo.current) {
      ultimo.current = valor
      setTexto(valor)
    }
  }, [valor])
  useEffect(() => () => clearTimeout(temporizador.current), [])

  // Atajo de teclado para llegar al buscador
  useEffect(() => {
    const atajo = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        campo.current?.focus()
        campo.current?.select()
      }
    }
    document.addEventListener('keydown', atajo)
    return () => document.removeEventListener('keydown', atajo)
  }, [])

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
    <div className="a-buscador" role="search">
      <span className="a-buscador-campo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" />
        </svg>
        <input ref={campo} type="search" value={texto} maxLength={100} placeholder={placeholder} aria-label={etiqueta}
          aria-keyshortcuts={ES_MAC ? 'Meta+K' : 'Control+K'}
          onChange={(e) => cambiar(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); avisar(texto) }
            if (e.key === 'Escape' && texto) { e.preventDefault(); setTexto(''); avisar('') }
          }} />
        <span className="a-buscador-extremo">
          {texto ? (
            <button type="button" onClick={() => { setTexto(''); avisar(''); campo.current?.focus() }} aria-label="Vaciar la búsqueda">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" /></svg>
            </button>
          ) : (
            <kbd className="a-atajo" aria-hidden="true">{ES_MAC ? <><span>⌘</span>K</> : <>Ctrl<span>K</span></>}</kbd>
          )}
        </span>
      </span>
    </div>
  )
}
