import { useRef } from 'react'
import { aparecer, contar, gsap, useAnimacion } from '../animaciones.js'
import { Encabezado } from '../componentes.jsx'

// Valores de ejemplo. Las categorías son las del cuestionario de hábitos (CA-13.1)
const CATEGORIAS = [
  { nombre: 'Horarios de sueño y estudio', valor: 95 },
  { nombre: 'Orden y limpieza', valor: 90 },
  { nombre: 'Ruido', valor: 88 },
  { nombre: 'Visitas', valor: 82 },
  { nombre: 'Fumar', valor: 100 },
  { nombre: 'Mascotas', valor: 96 },
]
const TOTAL = 92

export default function Compatibilidad() {
  const ref = useRef(null)

  useAnimacion(ref, () => {
    const q = gsap.utils.selector(ref)
    const medidor = q('.l-medidor')[0]
    aparecer(q('.l-compat-texto > *'), { disparador: ref.current, separacion: 0.1 })

    const tl = gsap.timeline({ scrollTrigger: { trigger: medidor, start: 'top 75%', once: true } })
    tl.from(q('.l-medidor-arco'), { strokeDashoffset: 100, duration: 1.8, ease: 'power3.out' })
      .add(contar(q('.l-medidor [data-valor]')[0], { duracion: 1.8 }), '<')
      .from(q('.l-barra-relleno'), { scaleX: 0, duration: 1.2, ease: 'power3.out', stagger: 0.1 }, '<0.2')

    q('.l-barra [data-valor]').forEach((numero, i) => tl.add(contar(numero, { duracion: 1.2 }), 0.2 + i * 0.1))
  })

  return (
    <section id="compatibilidad" className="l-seccion l-compat" ref={ref} aria-labelledby="compat-titulo" tabIndex={-1}>
      <div className="l-contenedor l-compat-grid">
        <div className="l-compat-texto">
          <Encabezado id="compat-titulo" etiqueta="Compatibilidad"
            titulo="Un porcentaje que sí te dice algo"
            bajada="Compartir casa es más fácil cuando sus rutinas se parecen. Por eso comparamos tus respuestas con las de otros estudiantes, categoría por categoría." />
          <ul className="l-compat-puntos">
            <li><strong>De 0 a 100 %.</strong> Mientras más se parecen sus hábitos, más alto el porcentaje.</li>
            <li><strong>Sabes en qué coinciden.</strong> Ves las categorías donde se parecen y en las que no.</li>
            <li><strong>Lo imprescindible pesa más.</strong> Marca hasta 3 categorías que no negocias.</li>
          </ul>
        </div>

        <div className="l-compat-tarjeta">
          <span className="l-etiqueta-ejemplo">Ejemplo</span>
          <div className="l-medidor" role="img" aria-label={`Compatibilidad de ejemplo: ${TOTAL} %`}>
            <svg viewBox="0 0 200 200" aria-hidden="true">
              <defs>
                <linearGradient id="arco-compat" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#3fd1b8" />
                  <stop offset="1" stopColor="#12766b" />
                </linearGradient>
              </defs>
              <circle className="l-medidor-fondo" cx="100" cy="100" r="84" pathLength="100" />
              <circle className="l-medidor-arco" cx="100" cy="100" r="84" pathLength="100"
                stroke="url(#arco-compat)" style={{ strokeDashoffset: 100 - TOTAL }} />
            </svg>
            <div className="l-medidor-valor" aria-hidden="true">
              <strong><span data-valor={TOTAL}>{TOTAL}</span>%</strong>
              <span>compatibles</span>
            </div>
          </div>

          <ul className="l-barras">
            {CATEGORIAS.map(({ nombre, valor }) => (
              <li key={nombre} className="l-barra">
                <div className="l-barra-texto">
                  <span>{nombre}</span>
                  <span><span data-valor={valor}>{valor}</span>%</span>
                </div>
                <div className="l-barra-fondo" aria-hidden="true">
                  <span className="l-barra-relleno" style={{ width: `${valor}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
