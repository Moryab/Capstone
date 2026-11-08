import { useLayoutEffect, useRef, useState } from 'react'
import { mayusculaInicial } from '../../../inicio/utilidades.js'
import { gsap, prefiereSinMovimiento } from '../../../landing/animaciones.js'
import { alEnfocar } from '../ui/animaciones.js'

// Tres tonos de la misma familia teal de la marca: distinguen las series sin sugerir «mejor o peor»
export const SERIES_SEMANA = [
  { clave: 'publicaciones', texto: 'Publicaciones', singular: 'publicación', clase: 't1' },
  { clave: 'registros', texto: 'Registros', singular: 'registro', clase: 't2' },
  { clave: 'reportes', texto: 'Reportes', singular: 'reporte', clase: 't3' },
]

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`
const deIso = (texto) => {
  const [a, m, d] = texto.split('-').map(Number)
  return new Date(a, m - 1, d)
}
const diaCorto = (texto) => deIso(texto).toLocaleDateString('es-CL', { weekday: 'short' }).replace('.', '')
export const diaLargo = (texto) => mayusculaInicial(deIso(texto).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }))

/**
 * Lo nuevo de los últimos 7 días (GET /admin/resumen) en barras apiladas: total de la semana por
 * serie y el detalle de cada día al pasar el cursor o con el foco.
 * Las barras crecen desde la base al cargar (con «reducir movimiento» aparecen completas).
 */
export default function Semana({ actividad }) {
  const [activo, setActivo] = useState(null)
  const grafico = useRef(null)
  const totalDe = (d) => SERIES_SEMANA.reduce((t, s) => t + d[s.clave], 0)
  const totales = Object.fromEntries(SERIES_SEMANA.map((s) => [s.clave, actividad.reduce((t, d) => t + d[s.clave], 0)]))
  const maximo = Math.max(1, ...actividad.map(totalDe))

  useLayoutEffect(() => {
    if (!actividad.length || prefiereSinMovimiento()) return undefined
    // Esperan en cero y crecen cuando la tarjeta se enfoca (transición de entrada del admin)
    const barras = grafico.current.querySelectorAll('.s-barra')
    gsap.set(barras, { scaleY: 0 })
    let tween = null
    const dejarDeEsperar = alEnfocar(grafico.current, () => {
      tween = gsap.to(barras, { scaleY: 1, duration: 0.7, ease: 'power3.out', stagger: 0.06, delay: 0.12, clearProps: 'transform' })
    })
    return () => {
      dejarDeEsperar()
      tween?.kill()
      gsap.set(barras, { clearProps: 'transform' })
    }
  }, [actividad.length])

  return (
    <div className="s-semana">
      <ul className="s-totales">
        {SERIES_SEMANA.map((s) => (
          <li key={s.clave}>
            <span className={`s-muestra ${s.clase}`} aria-hidden="true" />
            <b>{totales[s.clave]}</b> {totales[s.clave] === 1 ? s.singular : s.texto.toLowerCase()}
          </li>
        ))}
      </ul>
      <ul ref={grafico} className="s-barras" aria-label="Nuevos por día, últimos 7 días">
        {actividad.map((d, i) => {
          const total = totalDe(d)
          const esHoy = i === actividad.length - 1
          return (
            <li key={d.dia} className="s-dia" tabIndex={0} data-activo={activo === i} data-hoy={esHoy || undefined}
              aria-label={`${diaLargo(d.dia)}: ${SERIES_SEMANA.map((s) => plural(d[s.clave], s.singular, s.texto.toLowerCase())).join(', ')}`}
              onPointerEnter={() => setActivo(i)} onPointerLeave={() => setActivo(null)}
              onFocus={() => setActivo(i)} onBlur={() => setActivo(null)}>
              <span className="s-pista" aria-hidden="true">
                <span className="s-barra" style={{ '--alto': total / maximo }}>
                  {SERIES_SEMANA.map((s) => d[s.clave] > 0 && <span key={s.clave} className={`s-tramo ${s.clase}`} style={{ flexGrow: d[s.clave] }} />)}
                </span>
              </span>
              <span className="s-dia-nombre" aria-hidden="true">{esHoy ? 'Hoy' : diaCorto(d.dia)}</span>
              {activo === i && (
                <span className="g-tooltip s-tooltip" role="tooltip">
                  <strong>{diaLargo(d.dia)}</strong>
                  {SERIES_SEMANA.map((s) => <span key={s.clave}><span className={`s-muestra ${s.clase}`} aria-hidden="true" />{s.texto}<b>{d[s.clave]}</b></span>)}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
