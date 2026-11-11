import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import './avisoBreve.css'

const DURACION_MS = 3600

const AvisoContext = createContext({ avisar: () => {} })
/** `avisar(texto, { tipo })` muestra un aviso breve abajo a la derecha. `tipo`: 'exito' o 'error' */
export const useAvisoBreve = () => useContext(AvisoContext)

/**
 * Aviso breve al completar una acción (guardar, exportar, aprobar…): un check que se dibuja y un
 * texto corto. Se va solo; al pasar el mouse o con el foco se queda mientras se lee. El lector de
 * pantalla lo anuncia por la región aria-live, que siempre está en la página.
 */
export function AvisoBreveProvider({ children }) {
  const [aviso, setAviso] = useState(null)
  const temporizador = useRef(null)
  const pausado = useRef(false)

  const cerrar = useCallback(() => setAviso(null), [])
  const programar = useCallback(() => {
    clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => !pausado.current && cerrar(), DURACION_MS)
  }, [cerrar])

  const avisar = useCallback((texto, { tipo = 'exito' } = {}) => {
    setAviso({ texto, tipo, id: Date.now() })
    programar()
  }, [programar])

  useEffect(() => () => clearTimeout(temporizador.current), [])

  const pausar = (valor) => {
    pausado.current = valor
    if (!valor) programar()
  }

  return (
    <AvisoContext.Provider value={{ avisar }}>
      {children}
      <div className="aviso-breve-zona" aria-live="polite" role="status">
        {aviso && (
          <div key={aviso.id} className="aviso-breve" data-tipo={aviso.tipo}
            onMouseEnter={() => pausar(true)} onMouseLeave={() => pausar(false)}>
            <svg className="aviso-breve-icono" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              {aviso.tipo === 'error'
                ? <path d="M12 7v6M12 16.5v.5" />
                : <path className="aviso-breve-check" d="M7.5 12.5l3 3 6-6.5" pathLength="1" />}
            </svg>
            <p>{aviso.texto}</p>
            <button type="button" onClick={cerrar} aria-label="Cerrar aviso"
              onFocus={() => pausar(true)} onBlur={() => pausar(false)}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        )}
      </div>
    </AvisoContext.Provider>
  )
}
