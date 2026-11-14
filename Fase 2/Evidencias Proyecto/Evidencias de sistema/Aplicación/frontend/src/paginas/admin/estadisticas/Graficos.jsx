import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { gsap, prefiereSinMovimiento } from '../../../landing/animaciones.js'
import { alEnfocar, useCifraAnimada } from '../ui/animaciones.js'

/*
 * Gráficos del panel en SVG/HTML propio. Las barras y rellenos se dibujan con transform (scaleX o
 * scaleY) para que GSAP pueda animarlos sin recalcular el diseño. Todo tiene su versión en texto:
 * tooltips accesibles con el teclado y «Ver como tabla».
 */

const numero = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 })
export const pct = (valor) => (valor == null ? '—' : `${numero.format(valor)} %`)
export const nombreMes = (clave, largo = false) => {
  const [anio, mes] = clave.split('-').map(Number)
  const texto = new Date(anio, mes - 1, 1).toLocaleDateString('es-CL', largo ? { month: 'long', year: 'numeric' } : { month: 'short', year: '2-digit' })
  return largo ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto
}

// Máximo «redondo» para el eje: 1, 2, 5, 10, 20, 50…
function maximoEje(valor) {
  if (valor <= 4) return Math.max(valor, 1)
  const potencia = 10 ** Math.floor(Math.log10(valor))
  const paso = [1, 2, 5, 10].find((p) => p * potencia >= valor)
  return paso * potencia
}
const marcasEje = (maximo) => (maximo <= 4 ? Array.from({ length: maximo + 1 }, (_, i) => i) : [0, maximo / 2, maximo])

// ---------- Meta (CA-20.1): el valor frente a la meta, con el estado escrito ----------
// Con `maximo` la meta es un tope (menos es mejor, como los reportes). Una meta tan baja como 5 % se
// vería pegada al borde en una pista de 0 a 100 %, por eso la pista llega solo hasta `escala`
export function Meta({ valor, meta, detalle, maximo = false, escala = 100 }) {
  const cumple = valor != null && (maximo ? valor < meta : valor >= meta)
  const cifra = useCifraAnimada(valor, pct)
  const tope = Math.max(escala, valor ?? 0)
  const textoMeta = maximo ? `Meta bajo ${meta} %` : `Meta ${meta} %`
  return (
    <div className="g-meta">
      <p ref={cifra} className="g-cifra">{pct(valor)}</p>
      <div className="g-meta-pista" role="img" aria-label={`${pct(valor)} frente a una meta ${maximo ? 'bajo el' : 'de'} ${meta} %`}>
        <span className="g-meta-valor" data-cumple={cumple} style={{ '--avance': Math.min(valor ?? 0, tope) / tope }} />
        <span className="g-meta-marca" style={{ left: `${(100 * meta) / tope}%` }}><span>{textoMeta}</span></span>
      </div>
      <p className="g-meta-estado" data-cumple={cumple}>
        <span aria-hidden="true">{cumple ? '▲' : '▼'}</span> {cumple ? 'Meta cumplida' : 'Bajo la meta'}
        <span className="g-detalle"> · {detalle}</span>
      </p>
    </div>
  )
}

// ---------- Barras por mes (CA-20.2), con tooltip al pasar el cursor o con el foco ----------
const SERIES_BARRAS = [
  { clave: 'exitosos', texto: 'Exitosos', clase: 'exitoso' },
  { clave: 'no_exitosos', texto: 'No exitosos', clase: 'no-exitoso' },
]

export function BarrasMes({ meses }) {
  const [activo, setActivo] = useState(null)
  const maximo = maximoEje(Math.max(1, ...meses.flatMap((m) => [m.exitosos, m.no_exitosos])))
  const resumen = (m) => `${nombreMes(m.mes, true)}: ${m.exitosos} exitosos, ${m.no_exitosos} no exitosos`

  return (
    <div className="g-barras-zona">
      <ul className="g-leyenda">
        {SERIES_BARRAS.map((s) => <li key={s.clave}><span className={`g-muestra ${s.clase}`} aria-hidden="true" /> {s.texto}</li>)}
      </ul>
      <div className="g-barras">
        <div className="g-eje" aria-hidden="true">
          {marcasEje(maximo).map((v) => <span key={v} style={{ bottom: `${(v / maximo) * 100}%` }}>{v}</span>)}
        </div>
        <ul className="g-columnas" aria-label="Resultado de los match por mes">
          {meses.map((m, i) => (
            <li key={m.mes} className="g-mes" tabIndex={0} aria-label={resumen(m)}
              onPointerEnter={() => setActivo(i)} onPointerLeave={() => setActivo(null)}
              onFocus={() => setActivo(i)} onBlur={() => setActivo(null)} data-activo={activo === i}>
              <div className="g-mes-barras" aria-hidden="true">
                {SERIES_BARRAS.map((s) => (
                  <span key={s.clave} className={`g-barra ${s.clase}`} style={{ '--alto': m[s.clave] / maximo, '--i': i }} />
                ))}
              </div>
              <span className="g-mes-nombre" aria-hidden="true">{nombreMes(m.mes)}</span>
              {activo === i && (
                <div className="g-tooltip" role="tooltip">
                  <strong>{nombreMes(m.mes, true)}</strong>
                  {SERIES_BARRAS.map((s) => (
                    <span key={s.clave}><span className={`g-muestra ${s.clase}`} aria-hidden="true" />{s.texto}<b>{m[s.clave]}</b></span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ---------- Líneas: evolución mensual ----------
export const SERIES_LINEAS = [
  { clave: 'exitosos', texto: 'Match exitosos', clase: 'exitoso' },
  { clave: 'no_exitosos', texto: 'Match no exitosos', clase: 'no-exitoso' },
  { clave: 'registros', texto: 'Registros nuevos', clase: 'registros' },
]
const ALTO = 260
const MARGEN = { izq: 36, der: 16, arriba: 14, abajo: 30 }

/**
 * Leyenda interactiva: al pasar el cursor (o con el foco) una serie se resalta y las demás quedan
 * semitransparentes; al hacer clic se activa o desactiva, pero nunca quedan todas apagadas. Una
 * línea vertical sigue al cursor (o a las flechas del teclado) con el detalle de todas las series.
 */
export function Lineas({ serie, activas, alCambiarActivas }) {
  const zona = useRef(null)
  const [ancho, setAncho] = useState(640)
  const [resaltada, setResaltada] = useState(null)
  const [indice, setIndice] = useState(null)
  const [aviso, setAviso] = useState('')
  const idAyuda = useId()
  const idRecorte = `g-recorte-${useId().replace(/[^\w-]/g, '')}`
  const lienzo = useRef(null)
  const recorte = useRef(null)
  const trazosPrevios = useRef({}) // forma de cada línea en el render anterior, para animar el cambio
  const enCurso = useRef([]) // animaciones de las líneas en marcha (para cortarlas si cambia el ancho)

  useEffect(() => {
    const obs = new ResizeObserver(([e]) => setAncho(Math.max(280, Math.round(e.contentRect.width))))
    obs.observe(zona.current)
    return () => obs.disconnect()
  }, [])

  const visibles = SERIES_LINEAS.filter((s) => activas.includes(s.clave))
  const firma = JSON.stringify(serie) + activas.join()

  /*
   * Al entrar, las líneas se dibujan de izquierda a derecha (un recorte que se abre). Al cambiar un
   * filtro, cada línea pasa de su forma anterior a la nueva si tiene los mismos puntos; si cambió la
   * cantidad de meses, se vuelve a dibujar. Una serie que se activa aparece con un fundido.
   */
  useLayoutEffect(() => {
    const svg = lienzo.current
    const rect = recorte.current
    // La forma que corresponde a cada línea según React (data-d), no la que haya en pantalla: a mitad de
    // una animación el «d» del DOM es un valor intermedio, y una copia guardada puede ser de otro ancho
    const leer = () => Object.fromEntries([...svg.querySelectorAll('.g-serie')].map((g) => [g.dataset.serie, g.querySelector('.g-trazo').dataset.d]))
    const anteriores = trazosPrevios.current
    const nuevos = leer()
    trazosPrevios.current = nuevos
    if (prefiereSinMovimiento()) return undefined
    const anchoTotal = () => svg.viewBox.baseVal.width
    // Se anima la fracción visible y se aplica sobre el ancho del momento, por si cambia a la mitad
    const dibujar = (duracion) => {
      const avance = { v: 0 }
      rect.setAttribute('width', 0)
      return gsap.to(avance, { v: 1, duration: duracion, ease: 'power2.inOut', onUpdate: () => rect.setAttribute('width', avance.v * anchoTotal()) })
    }
    const animaciones = []
    const formas = [] // solo los cambios de forma de las líneas (no el dibujo de entrada)
    let dejarDeEsperar = () => {}
    let esperando = false
    if (Object.keys(anteriores).length === 0) {
      // Recién llegada: oculta hasta que su tarjeta se enfoca y entonces se dibuja
      rect.setAttribute('width', 0)
      esperando = true
      dejarDeEsperar = alEnfocar(svg, () => {
        esperando = false
        animaciones.push(dibujar(1.1))
      })
    } else {
      const puntos = (d) => d.split(/[ML]/).length
      let redibujar = false
      svg.querySelectorAll('.g-serie').forEach((g) => {
        const desde = anteriores[g.dataset.serie]
        const hasta = nuevos[g.dataset.serie]
        if (!desde) animaciones.push(gsap.from(g, { opacity: 0, duration: 0.3, clearProps: 'opacity' }))
        else if (puntos(desde) !== puntos(hasta)) redibujar = true
        else if (desde !== hasta) {
          const forma = gsap.fromTo(g.querySelector('.g-trazo'), { attr: { d: desde } }, { attr: { d: hasta }, duration: 0.5, ease: 'power3.inOut' })
          animaciones.push(forma)
          formas.push(forma)
        }
      })
      if (redibujar) animaciones.push(dibujar(0.8))
    }
    enCurso.current = formas
    return () => {
      // Cortadas antes de terminar (o el doble montaje de StrictMode): la próxima vez se parte igual
      dejarDeEsperar()
      if (esperando || animaciones.some((a) => a.progress() < 1)) trazosPrevios.current = anteriores
      animaciones.forEach((a) => a.kill())
      // Si se corta a la mitad, que nada quede recortado ni a medio camino. Cada línea vuelve a la forma
      // que React indica AHORA (data-d): antes se usaba la copia guardada al empezar, que podía ser de
      // otros datos o de otro ancho, y dejaba las líneas viejas y encogidas al cambiar un filtro
      rect.setAttribute('width', anchoTotal())
      svg.querySelectorAll('.g-serie .g-trazo').forEach((t) => { if (t.dataset.d) t.setAttribute('d', t.dataset.d) })
    }
    // Solo cuando cambian los datos o las series visibles, no al redimensionar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma])
  // Al cambiar el ancho: si una línea estaba cambiando de forma, termina de inmediato en su forma del
  // ancho nuevo (la animación iba hacia la del ancho anterior), y la referencia se actualiza sin animar.
  // El dibujo de entrada (el recorte que se abre) sigue: se mide sobre el ancho del momento
  useLayoutEffect(() => {
    const svg = lienzo.current
    enCurso.current.forEach((a) => a.kill())
    enCurso.current = []
    svg.querySelectorAll('.g-serie .g-trazo').forEach((t) => { if (t.dataset.d) t.setAttribute('d', t.dataset.d) })
    trazosPrevios.current = Object.fromEntries([...svg.querySelectorAll('.g-serie')].map((g) => [g.dataset.serie, g.querySelector('.g-trazo').dataset.d]))
    recorte.current?.setAttribute('width', ancho)
  }, [ancho])
  const maximo = maximoEje(Math.max(1, ...serie.flatMap((m) => visibles.map((s) => m[s.clave]))))
  const interior = ancho - MARGEN.izq - MARGEN.der
  const altoInterior = ALTO - MARGEN.arriba - MARGEN.abajo
  const x = (i) => MARGEN.izq + (serie.length === 1 ? interior / 2 : (i * interior) / (serie.length - 1))
  const y = (v) => MARGEN.arriba + altoInterior - (v / maximo) * altoInterior
  const trazo = (clave) => serie.map((m, i) => `${i ? 'L' : 'M'}${x(i)},${y(m[clave])}`).join(' ')
  const cada = Math.max(1, Math.ceil(serie.length / Math.max(2, Math.floor(interior / 70)))) // etiquetas sin encimarse

  const alternar = (clave) => {
    if (activas.includes(clave)) {
      if (activas.length === 1) {
        setAviso('Debe quedar al menos una serie visible')
        return
      }
      alCambiarActivas(activas.filter((c) => c !== clave))
    } else {
      alCambiarActivas(SERIES_LINEAS.map((s) => s.clave).filter((c) => c === clave || activas.includes(c)))
    }
    setAviso('')
  }

  const moverA = (clientX) => {
    const caja = zona.current.getBoundingClientRect()
    const rel = clientX - caja.left - MARGEN.izq
    const i = serie.length === 1 ? 0 : Math.round((rel / interior) * (serie.length - 1))
    setIndice(Math.min(serie.length - 1, Math.max(0, i)))
  }
  const teclas = (e) => {
    const destinos = { ArrowRight: (indice ?? -1) + 1, ArrowLeft: (indice ?? 1) - 1, Home: 0, End: serie.length - 1 }
    if (e.key === 'Escape') return setIndice(null)
    if (!(e.key in destinos)) return undefined
    e.preventDefault()
    return setIndice(Math.min(serie.length - 1, Math.max(0, destinos[e.key])))
  }

  const punto = indice != null ? serie[indice] : null
  const izquierdaTooltip = indice != null ? Math.min(Math.max(x(indice), 90), ancho - 90) : 0

  return (
    <div className="g-lineas-zona" data-resaltada={resaltada ?? undefined}>
      <ul className="g-leyenda interactiva" aria-label="Series del gráfico: clic para mostrar u ocultar">
        {SERIES_LINEAS.map((s) => (
          <li key={s.clave}>
            <button type="button" aria-pressed={activas.includes(s.clave)} onClick={() => alternar(s.clave)}
              onPointerEnter={() => setResaltada(s.clave)} onPointerLeave={() => setResaltada(null)}
              onFocus={() => setResaltada(s.clave)} onBlur={() => setResaltada(null)}>
              <span className={`g-muestra ${s.clase}`} aria-hidden="true" /> {s.texto}
            </button>
          </li>
        ))}
      </ul>
      <p className="visualmente-oculto" aria-live="polite">{aviso}</p>

      <div ref={zona} className="g-lineas" tabIndex={0} role="group"
        aria-label="Evolución mensual" aria-describedby={idAyuda}
        onPointerMove={(e) => moverA(e.clientX)} onPointerLeave={() => setIndice(null)}
        onKeyDown={teclas} onFocus={() => indice == null && setIndice(serie.length - 1)} onBlur={() => setIndice(null)}>
        <span id={idAyuda} className="visualmente-oculto">Usa las flechas izquierda y derecha para recorrer los meses.</span>
        <svg ref={lienzo} width={ancho} height={ALTO} viewBox={`0 0 ${ancho} ${ALTO}`} aria-hidden="true">
          <defs><clipPath id={idRecorte}><rect ref={recorte} x="0" y="0" width={ancho} height={ALTO} /></clipPath></defs>
          {marcasEje(maximo).map((v) => (
            <g key={v} className="g-rejilla">
              <line x1={MARGEN.izq} x2={ancho - MARGEN.der} y1={y(v)} y2={y(v)} />
              <text x={MARGEN.izq - 8} y={y(v) + 4} textAnchor="end">{v}</text>
            </g>
          ))}
          {/* Cada «cada» meses, y siempre el último; se salta el anterior si quedaría encima del último */}
          {serie.map((m, i) => ((i % cada === 0 && serie.length - 1 - i >= cada) || i === serie.length - 1) && (
            <text key={m.mes} className="g-eje-x" x={x(i)} y={ALTO - 8} textAnchor="middle">{nombreMes(m.mes)}</text>
          ))}
          {indice != null && <line className="g-guia" x1={x(indice)} x2={x(indice)} y1={MARGEN.arriba} y2={ALTO - MARGEN.abajo} />}
          <g clipPath={`url(#${idRecorte})`}>
          {visibles.map((s) => (
            <g key={s.clave} className={`g-serie ${s.clase}`} data-serie={s.clave}>
              {/* data-d: la forma que le corresponde, aunque una animación esté cambiando el «d» */}
              <path className="g-trazo" d={trazo(s.clave)} data-d={trazo(s.clave)} />
              {serie.map((m, i) => (
                <circle key={m.mes} className="g-punto" cx={x(i)} cy={y(m[s.clave])} r={indice === i ? 5.5 : serie.length === 1 ? 4.5 : 0} />
              ))}
            </g>
          ))}
          </g>
          {/* Zona invisible y gruesa sobre cada línea: al pasar el cursor por ella, se resalta
              igual que desde la leyenda */}
          {visibles.map((s) => (
            <path key={s.clave} className="g-trazo-zona" d={trazo(s.clave)}
              onPointerEnter={() => setResaltada(s.clave)} onPointerLeave={() => setResaltada(null)} />
          ))}
        </svg>
        {punto && (
          <div className="g-tooltip g-tooltip-lineas" style={{ left: izquierdaTooltip }} role="tooltip">
            <strong>{nombreMes(punto.mes, true)}</strong>
            {visibles.map((s) => (
              <span key={s.clave}><span className={`g-muestra ${s.clase}`} aria-hidden="true" />{s.texto}<b>{punto[s.clave]}</b></span>
            ))}
          </div>
        )}
        <p className="visualmente-oculto" aria-live="polite">
          {punto ? `${nombreMes(punto.mes, true)}: ${visibles.map((s) => `${s.texto} ${punto[s.clave]}`).join(', ')}` : ''}
        </p>
      </div>
    </div>
  )
}

// ---------- Análisis por categoría (EP-08): qué diferencias de hábitos fracasan más ----------
export const brechaDe = (d) => (d == null ? 'Sin comparación' : `${d > 0 ? '+' : ''}${numero.format(d)} pts`)

function BarraCategoria({ clase, texto, tasa, fracasos, casos }) {
  return (
    <span className={`g-cat-barra ${clase}`}>
      <span className="g-cat-texto">{texto}</span>
      <span className="g-cat-pista" aria-hidden="true"><span style={{ '--avance': (tasa ?? 0) / 100 }} /></span>
      <span className="g-cat-valor">{casos ? <>{pct(tasa)} <small>({fracasos} de {casos})</small></> : <small>Sin casos</small>}</span>
    </span>
  )
}

export function Categorias({ filas }) {
  return (
    <ol className="g-categorias">
      {filas.map((f) => (
        <li key={f.categoria}>
          <span className="g-cat-nombre">{f.etiqueta}</span>
          <span className="g-cat-brecha" data-sube={f.diferencia > 0 || undefined}
            title="Puntos que sube la tasa de fracaso cuando difieren">{brechaDe(f.diferencia)}</span>
          <BarraCategoria clase="difieren" texto="Difieren" tasa={f.tasa_fracaso_con_diferencia}
            fracasos={f.fracasos_con_diferencia} casos={f.casos_con_diferencia} />
          <BarraCategoria clase="coinciden" texto="Coinciden" tasa={f.tasa_fracaso_sin_diferencia}
            fracasos={f.fracasos_sin_diferencia} casos={f.casos_sin_diferencia} />
        </li>
      ))}
    </ol>
  )
}

// ---------- Ranking (CA-20.3): de más a menos frecuente ----------
export function Ranking({ filas }) {
  const total = filas.reduce((s, f) => s + f.cantidad, 0)
  const maximo = Math.max(1, ...filas.map((f) => f.cantidad))
  return (
    <ol className="g-ranking">
      {filas.map((f, i) => (
        <li key={f.etiqueta}>
          <span className="g-ranking-posicion" aria-hidden="true">{i + 1}</span>
          <span className="g-ranking-nombre">{f.etiqueta}</span>
          <span className="g-ranking-valor">{f.cantidad} <small>({pct((100 * f.cantidad) / total)})</small></span>
          <span className="g-ranking-pista" aria-hidden="true"><span style={{ '--avance': f.cantidad / maximo }} /></span>
        </li>
      ))}
    </ol>
  )
}
