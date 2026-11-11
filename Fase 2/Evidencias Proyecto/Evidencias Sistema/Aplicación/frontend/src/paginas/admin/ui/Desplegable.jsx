import { useEffect, useId, useRef, useState } from 'react'

const Chevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 10l5 5 5-5" />
  </svg>
)
const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
)

/**
 * Desplegable propio para los filtros del admin (reemplaza al <select> nativo, cuya lista no se
 * puede diseñar). Botón semitransparente y lista con efecto vidrio.
 * Accesible: botón con aria-haspopup="listbox" y lista role="listbox"; flechas, Inicio/Fin, Enter o
 * Espacio para elegir, Escape para cerrar y escribir una letra salta a la opción que empieza con ella.
 * `variante`: 'campo' (barras de filtros), 'compacto' (cabecera de las tarjetas) o 'cabecera' (título
 * de una columna de tabla). `textoBoton` reemplaza el texto del botón (la opción elegida).
 */
export default function Desplegable({
  valor, opciones, alCambiar, etiqueta, idEtiqueta, variante = 'campo', alinear = 'izquierda', className = '', textoBoton,
}) {
  const [abierto, setAbierto] = useState(false)
  // En una tabla con scroll la lista se recortaría: en la cabecera flota sobre la página (fixed)
  const [posicion, setPosicion] = useState(null)
  const [activo, setActivo] = useState(0)
  const raiz = useRef(null)
  const boton = useRef(null)
  const lista = useRef(null)
  const id = useId()
  const indiceElegido = Math.max(0, opciones.findIndex((o) => o.valor === valor))
  const elegido = opciones[indiceElegido]

  // Al abrir, la opción activa es la elegida y la lista recibe el foco
  const abrir = (indice = indiceElegido) => {
    setActivo(indice)
    if (variante === 'cabecera') {
      const caja = boton.current.getBoundingClientRect()
      setPosicion({ top: caja.bottom + 6, left: Math.min(caja.left, window.innerWidth - 236) })
    }
    setAbierto(true)
  }
  useEffect(() => {
    if (abierto) lista.current?.focus()
  }, [abierto])

  // Cerrar al hacer clic afuera
  useEffect(() => {
    if (!abierto) return undefined
    const fuera = (e) => !raiz.current?.contains(e.target) && setAbierto(false)
    document.addEventListener('pointerdown', fuera)
    return () => document.removeEventListener('pointerdown', fuera)
  }, [abierto])

  // Flotando, si la página o la tabla se desplazan la lista se cierra (quedaría desalineada)
  useEffect(() => {
    if (!abierto || variante !== 'cabecera') return undefined
    const alDesplazar = (e) => !lista.current?.contains(e.target) && setAbierto(false)
    window.addEventListener('scroll', alDesplazar, true)
    window.addEventListener('resize', alDesplazar)
    return () => {
      window.removeEventListener('scroll', alDesplazar, true)
      window.removeEventListener('resize', alDesplazar)
    }
  }, [abierto, variante])

  // La opción activa queda a la vista si la lista tiene scroll
  useEffect(() => {
    if (abierto) lista.current?.querySelector(`[data-indice="${activo}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [abierto, activo])

  const cerrar = (devolverFoco = true) => {
    setAbierto(false)
    if (devolverFoco) boton.current?.focus()
  }
  const elegir = (indice) => {
    const opcion = opciones[indice]
    if (opcion && opcion.valor !== valor) alCambiar(opcion.valor)
    cerrar()
  }

  const teclasBoton = (e) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault()
      abrir(e.key === 'ArrowUp' ? Math.max(0, indiceElegido - 1) : indiceElegido)
    }
  }
  const teclasLista = (e) => {
    const ultimo = opciones.length - 1
    const mover = { ArrowDown: Math.min(ultimo, activo + 1), ArrowUp: Math.max(0, activo - 1), Home: 0, End: ultimo }
    if (e.key in mover) {
      e.preventDefault()
      setActivo(mover[e.key])
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      elegir(activo)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cerrar()
    } else if (e.key === 'Tab') {
      cerrar(false)
    } else if (e.key.length === 1) {
      // Escribir una letra salta a la siguiente opción que empieza con ella
      const letra = e.key.toLowerCase()
      const orden = [...opciones.slice(activo + 1), ...opciones.slice(0, activo + 1)]
      const encontrada = orden.find((o) => o.texto.toLowerCase().startsWith(letra))
      if (encontrada) setActivo(opciones.indexOf(encontrada))
    }
  }

  return (
    <div ref={raiz} className={`a-desplegable a-desplegable-${variante} ${className}`.trim()} data-abierto={abierto || undefined}>
      <button ref={boton} type="button" className="a-desplegable-boton" aria-haspopup="listbox" aria-expanded={abierto}
        aria-controls={abierto ? `${id}-lista` : undefined}
        aria-label={idEtiqueta ? undefined : `${etiqueta}: ${elegido?.texto ?? ''}`}
        aria-labelledby={idEtiqueta ? `${idEtiqueta} ${id}-valor` : undefined}
        onClick={() => (abierto ? cerrar() : abrir())} onKeyDown={teclasBoton}>
        <span id={`${id}-valor`} className="a-desplegable-valor">{textoBoton ?? elegido?.texto}</span>
        <Chevron />
      </button>
      {abierto && (
        <ul ref={lista} id={`${id}-lista`} role="listbox" tabIndex={-1} className="a-desplegable-lista" data-alinear={alinear}
          style={variante === 'cabecera' && posicion ? { position: 'fixed', top: posicion.top, left: posicion.left, right: 'auto' } : undefined}
          aria-label={etiqueta} aria-activedescendant={`${id}-op-${activo}`} onKeyDown={teclasLista}>
          {opciones.map((o, i) => (
            <li key={o.valor} id={`${id}-op-${i}`} role="option" data-indice={i} aria-selected={o.valor === valor}
              data-activa={i === activo || undefined} onPointerEnter={() => setActivo(i)}
              onPointerDown={(e) => e.preventDefault()} onClick={() => elegir(i)}>
              <span>{o.texto}</span>
              {o.valor === valor && <Check />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Desplegable con su etiqueta visible arriba (barras de filtros)
export function CampoDesplegable({ etiqueta, ...props }) {
  const id = useId()
  return (
    <div className="a-campo">
      <span id={id} className="a-campo-etiqueta">{etiqueta}</span>
      <Desplegable etiqueta={etiqueta} idEtiqueta={id} {...props} />
    </div>
  )
}

/**
 * Filtro en el título de una columna. Con un filtro aplicado el título se pinta y aparece un punto que
 * no ocupa espacio (así la columna no cambia de ancho); el valor elegido se ve en los chips de
 * «Filtros activos» y el lector de pantalla lo oye: «Filtrar por rol: Oferente».
 */
export function FiltroColumna({ etiqueta, valor, opciones, alCambiar }) {
  return (
    <Desplegable variante="cabecera" etiqueta={`Filtrar por ${etiqueta.toLowerCase()}`} valor={valor}
      opciones={opciones} alCambiar={alCambiar} className={valor ? 'filtrando' : ''}
      textoBoton={<span className="a-filtro-columna-nombre">{etiqueta}</span>} />
  )
}
