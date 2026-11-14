import { useEffect, useRef, useState } from 'react'
import './esqueleto.css'

/*
 * Skeletons de toda la plataforma: la forma del contenido mientras llegan los datos, con un brillo
 * menta suave que la recorre. Ocupan el mismo lugar que el contenido real, así nada salta al cargar.
 *
 * Anti-parpadeo, en dos partes:
 * - Al aparecer, el skeleton espera 150 ms invisible (pero ocupando su espacio, CSS): si los datos
 *   llegan antes, nunca se ve.
 * - Si se alcanzó a ver, se mantiene al menos 300 ms (useCargaVisible), para que no destelle.
 * Al llegar el contenido entra con un fundido corto (<Carga>), solo si antes hubo skeleton.
 */

/** Pieza base: una línea, un círculo o un bloque. `ancho` y `alto` aceptan cualquier medida CSS */
export function Esqueleto({ forma = 'linea', ancho, alto, className = '', style }) {
  return (
    <span className={`esq esq-${forma} ${className}`.trim()} aria-hidden="true"
      style={{ width: ancho, height: alto, ...style }} />
  )
}

/** Párrafo: varias líneas, la última más corta */
export function EsqueletoTexto({ lineas = 3, className = '' }) {
  return (
    <span className={`esq-texto ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: lineas }, (_, i) => (
        <Esqueleto key={i} ancho={i === lineas - 1 ? '60%' : `${92 - (i % 2) * 8}%`} />
      ))}
    </span>
  )
}

/** Foto redonda con nombre y una línea debajo (filas de listas, autores, contactos) */
export function EsqueletoPersona({ tamano = 46, className = '' }) {
  return (
    <span className={`esq-persona ${className}`.trim()} aria-hidden="true">
      <Esqueleto forma="circulo" ancho={tamano} alto={tamano} />
      <span className="esq-persona-textos">
        <Esqueleto ancho="58%" alto={13} />
        <Esqueleto ancho="38%" alto={10} />
      </span>
    </span>
  )
}

/** Tarjeta: una imagen arriba (opcional) y texto debajo */
export function EsqueletoTarjeta({ imagen = '4 / 3', lineas = 3, className = '' }) {
  return (
    <span className={`esq-tarjeta ${className}`.trim()} aria-hidden="true">
      {imagen && <Esqueleto forma="bloque" style={{ aspectRatio: imagen, width: '100%' }} />}
      <EsqueletoTexto lineas={lineas} />
    </span>
  )
}

/** Filas de una lista o tabla, cada una con persona y dos datos */
export function EsqueletoFilas({ filas = 5, className = '' }) {
  return (
    <span className={`esq-filas ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: filas }, (_, i) => (
        <span key={i} className="esq-fila">
          <EsqueletoPersona tamano={40} />
          <Esqueleto ancho={`${18 + ((i * 7) % 10)}%`} />
          <Esqueleto ancho="12%" />
        </span>
      ))}
    </span>
  )
}

/** Burbujas de chat, alternadas entre la otra persona y la propia */
export function EsqueletoBurbujas({ cantidad = 4, className = '' }) {
  return (
    <span className={`esq-burbujas ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: cantidad }, (_, i) => (
        <Esqueleto key={i} forma="bloque" className={i % 3 === 1 ? 'esq-burbuja propia' : 'esq-burbuja'}
          ancho={`${30 + ((i * 13) % 26)}%`} alto={44} />
      ))}
    </span>
  )
}

/**
 * ¿Se muestra el skeleton? `cargando` es si faltan los datos. Si la carga dura menos que `retraso`
 * (el skeleton no se alcanzó a ver), se pasa directo al contenido; si se vio, dura al menos `minimo`.
 */
export function useCargaVisible(cargando, { retraso = 150, minimo = 300 } = {}) {
  const inicio = useRef(cargando ? Date.now() : null)
  const [mostrar, setMostrar] = useState(cargando)

  useEffect(() => {
    if (cargando) {
      inicio.current = Date.now()
      setMostrar(true)
      return undefined
    }
    const visibleHace = Date.now() - (inicio.current ?? 0) - retraso
    if (visibleHace <= 0) {
      setMostrar(false) // nunca se alcanzó a ver
      return undefined
    }
    const espera = setTimeout(() => setMostrar(false), Math.max(0, minimo - visibleHace))
    return () => clearTimeout(espera)
  }, [cargando, retraso, minimo])

  return mostrar
}

/**
 * Muestra `esqueleto` mientras `listo` es falso y luego el contenido, con un fundido corto solo si
 * hubo skeleton (con datos en caché el contenido aparece directo, sin animación).
 * `etiqueta` es lo que anuncia el lector de pantalla mientras carga.
 */
export function Carga({ listo, esqueleto, etiqueta = 'Cargando', children }) {
  const mostrar = useCargaVisible(!listo)
  const huboEsqueleto = useRef(!listo)
  if (!listo) huboEsqueleto.current = true // también si vuelve a cargar (por ejemplo, al reintentar)
  if (!listo || mostrar) {
    return <div className="esq-zona" role="status" aria-label={etiqueta}>{esqueleto}</div>
  }
  return huboEsqueleto.current ? <div className="esq-llega">{children}</div> : children
}

/** Error al cargar: el mensaje y, si se puede, «Reintentar». Nunca se confunde con el estado vacío */
export function ErrorCarga({ mensaje, alReintentar, className = '' }) {
  return (
    <div className={`esq-error ${className}`.trim()} role="alert">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5v.01" /></svg>
      <p>{mensaje || 'No pudimos cargar esta información.'}</p>
      {alReintentar && <button type="button" className="boton secundario" onClick={alReintentar}>Reintentar</button>}
    </div>
  )
}
