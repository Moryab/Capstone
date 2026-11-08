import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { mayusculaInicial, momentoDelDia, SALUDOS } from '../../../inicio/utilidades.js'
import { gsap, prefiereSinMovimiento } from '../../../landing/animaciones.js'
import { useResumenAdmin } from '../../../marco/ResumenAdmin.jsx'
import { useSesion } from '../../../sesion/SesionContext.jsx'
import { ICONOS_ESTADO } from '../ui/componentes.jsx'

// Lo que espera revisión, con su acceso directo (los reportes ya filtrados por tipo)
const POR_REVISAR = [
  { clave: 'verificaciones_pendientes', texto: 'Verificaciones', a: '/admin/verificaciones', icono: 'check' },
  { clave: 'reportes_pendientes_perfiles', texto: 'Perfiles reportados', a: '/admin/reportes?tipo=usuario', icono: 'lupa' },
  { clave: 'reportes_pendientes_publicaciones', texto: 'Publicaciones reportadas', a: '/admin/reportes?tipo=publicacion', icono: 'ojo' },
]

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`
const ETIQUETAS = { manana: 'Mañana', tarde: 'Tarde', noche: 'Noche' }
const hora = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit' })

/*
 * Arco del día: como un reloj de sol. Bajo el arco hay un cielo en degradado según el momento; el sol
 * (de 6:00 a 20:00) o la luna (de 20:00 a 6:00), con su halo, está en la posición real de la hora, y en
 * el horizonte un pequeño barrio cuyas ventanas se encienden de noche. Es distinto de la escena del
 * inicio de los estudiantes, que es un paisaje a todo el ancho.
 */
const CENTRO = { x: 150, y: 132 }
const RADIO = { x: 126, y: 108 }
const ARCO = `M${CENTRO.x - RADIO.x},${CENTRO.y} A${RADIO.x},${RADIO.y} 0 0 1 ${CENTRO.x + RADIO.x},${CENTRO.y}`
// Avance sobre el arco (0: horizonte izquierdo, 1: horizonte derecho) según la hora
function avanceDe(fecha) {
  const h = fecha.getHours() + fecha.getMinutes() / 60
  if (h >= 6 && h < 20) return (h - 6) / 14
  return ((h - 20 + 24) % 24) / 10
}
const puntoDe = (t) => ({
  x: CENTRO.x - RADIO.x * Math.cos(Math.PI * t),
  y: CENTRO.y - RADIO.y * Math.sin(Math.PI * t),
})
// Marcas de hora en el inicio, la mitad y el final del tramo
const MARCAS = { dia: ['6:00', '13:00', '20:00'], noche: ['20:00', '1:00', '6:00'] }
const ESTRELLAS = [[46, 40, 1.5], [88, 22, 1.1], [214, 30, 1.7], [252, 64, 1.1], [180, 14, 1.2], [26, 88, 1], [278, 100, 1.3], [120, 52, 0.9], [236, 96, 0.9]]
// Barrio en el horizonte: [x, ancho, alto del muro, ventanas]
const CASAS = [[44, 30, 18, 1], [80, 26, 14, 1], [128, 44, 26, 2], [184, 28, 16, 1], [222, 34, 20, 1]]

function ArcoDelDia({ ahora, momento }) {
  const astro = useRef(null)
  const id = useId()
  const noche = momento === 'noche'
  const avance = avanceDe(ahora)
  const destino = puntoDe(avance)

  // Al entrar, el sol o la luna recorre el arco desde el horizonte hasta la hora actual
  useLayoutEffect(() => {
    const el = astro.current
    if (prefiereSinMovimiento()) return undefined
    const estado = { t: 0 }
    const tween = gsap.to(estado, {
      t: avance,
      duration: 1.6,
      ease: 'power3.out',
      delay: 0.2,
      onUpdate: () => {
        const p = puntoDe(estado.t)
        el.setAttribute('transform', `translate(${p.x} ${p.y})`)
      },
    })
    return () => tween.kill()
    // Solo al entrar: después la posición la da el render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const marcas = noche ? MARCAS.noche : MARCAS.dia
  return (
    <figure className="h-arco">
      <svg viewBox="0 0 300 168" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-cielo`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="h-cielo-alto" />
            <stop offset="1" className="h-cielo-bajo" />
          </linearGradient>
          <radialGradient id={`${id}-halo`}>
            <stop offset="0" className="h-halo-centro" />
            <stop offset="1" className="h-halo-borde" />
          </radialGradient>
        </defs>

        {/* Cielo bajo el arco */}
        <path className="h-cielo" d={`${ARCO} Z`} fill={`url(#${id}-cielo)`} />
        {noche && ESTRELLAS.map(([x, y, r], i) => (
          <circle key={`${x}-${y}`} className="h-estrella" cx={x} cy={y} r={r} style={{ animationDelay: `${i * 0.35}s` }} />
        ))}

        {/* El arco: recorrido completo tenue y el tramo ya recorrido más marcado */}
        <path className="h-arco-pista" d={ARCO} />
        <path className="h-arco-recorrido" d={ARCO} pathLength="1" style={{ strokeDasharray: `${avance} 1` }} />
        {[0, 0.5, 1].map((t, i) => {
          const p = puntoDe(t)
          return (
            <g key={t} className="h-marca">
              <circle cx={p.x} cy={p.y} r="2.6" />
              <text x={p.x} y={t === 0.5 ? p.y - 8 : CENTRO.y + 16} textAnchor="middle">{marcas[i]}</text>
            </g>
          )
        })}

        {/* Barrio en el horizonte: de noche se encienden las ventanas */}
        <g className="h-barrio" data-noche={noche || undefined}>
          {CASAS.map(([x, ancho, alto, ventanas]) => {
            const base = CENTRO.y
            const techo = base - alto - ancho * 0.42
            return (
              <g key={x}>
                <path className="h-casa" d={`M${x} ${base} V${base - alto} L${x + ancho / 2} ${techo} L${x + ancho} ${base - alto} V${base} Z`} />
                {Array.from({ length: ventanas }, (_, v) => (
                  <rect key={v} className="h-ventana" x={x + (ancho / (ventanas + 1)) * (v + 1) - 3.5} y={base - alto + 4} width="7" height="6" rx="1.2" />
                ))}
              </g>
            )
          })}
        </g>
        <line className="h-horizonte" x1="4" x2="296" y1={CENTRO.y} y2={CENTRO.y} />

        <g ref={astro} className="h-astro" transform={`translate(${destino.x} ${destino.y})`}>
          <circle r="34" fill={`url(#${id}-halo)`} />
          {noche ? (
            <path className="h-luna" d="M5 -13 A14 14 0 1 0 5 13 A11 11 0 1 1 5 -13 Z" />
          ) : (
            <>
              <g className="h-rayos">
                {Array.from({ length: 12 }, (_, i) => (
                  <line key={i} x1="0" y1="-17" x2="0" y2="-22" transform={`rotate(${i * 30})`} />
                ))}
              </g>
              <circle r="12.5" className="h-sol" />
            </>
          )}
        </g>
      </svg>
      <figcaption>
        <span className="h-reloj">{hora.format(ahora)}</span>
        <span className="h-momento">{ETIQUETAS[momento]}</span>
      </figcaption>
    </figure>
  )
}

/**
 * Bienvenida del panel: saludo y, a la derecha, lo que espera revisión: una fila por tipo con su
 * cifra (o «Al día») y acceso directo. Lo nuevo de la semana va en su propia tarjeta (Semana.jsx).
 */
export default function Hero({ acciones }) {
  const { usuario } = useSesion()
  const { resumen } = useResumenAdmin()
  // La hora se actualiza cada minuto: mueve el sol o la luna y cambia el momento del día
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const intervalo = setInterval(() => setAhora(new Date()), 60000)
    return () => clearInterval(intervalo)
  }, [])
  const momento = momentoDelDia(ahora.getHours())
  const fecha = mayusculaInicial(ahora.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }))

  const pendientes = resumen ? POR_REVISAR.reduce((t, p) => t + (resumen[p.clave] ?? 0), 0) : 0

  return (
    <header className="h-hero" data-momento={momento}>
      <div className="h-texto">
        <p className="h-fecha">{fecha}</p>
        <h1>{SALUDOS[momento]}, {mayusculaInicial(usuario.nombre)}</h1>
        <p className="h-sub">
          {!resumen ? 'Revisando lo pendiente…'
            : pendientes === 0 ? 'No hay nada pendiente: todo está al día.'
              : `${plural(pendientes, 'solicitud espera', 'solicitudes esperan')} tu revisión.`}
        </p>
        {acciones && <div className="h-acciones">{acciones}</div>}
      </div>

      <ArcoDelDia ahora={ahora} momento={momento} />

      <section className="h-panel" aria-labelledby="h-titulo-revisar">
        <div className="h-revisar">
          <h2 id="h-titulo-revisar">Por revisar</h2>
          <ul>
            {POR_REVISAR.map((p) => {
              const n = resumen?.[p.clave] ?? 0
              return (
                <li key={p.clave}>
                  <Link to={p.a} className="h-fila" data-hay={n > 0 || undefined}>
                    <span className="h-fila-icono" aria-hidden="true">{ICONOS_ESTADO[p.icono]}</span>
                    <span className="h-fila-texto">{p.texto}</span>
                    {n > 0
                      ? <span className="h-fila-cifra">{n}<span className="visualmente-oculto"> por revisar</span></span>
                      : <span className="h-fila-aldia">{ICONOS_ESTADO.check} Al día</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </section>
    </header>
  )
}
