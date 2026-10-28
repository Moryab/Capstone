import { useRef } from 'react'
import { aparecer, gsap, useAnimacion } from '../animaciones.js'
import { Encabezado } from '../componentes.jsx'

// Lo que hace la plataforma después del match (HU-17 a HU-19). Es RoomMatch quien propone el match
const ETAPAS = [
  { titulo: 'RoomMatch te propone un match', texto: 'Cuando encontramos a un estudiante compatible contigo, te lo sugerimos como posible roomie.' },
  { titulo: 'Ambos deciden', texto: 'Cada uno revisa el perfil del otro y decide si acepta. Si los dos aceptan, el match queda confirmado y ambos reciben una notificación.' },
  { titulo: 'Comienza la convivencia', texto: 'RoomMatch registra la fecha de inicio de su convivencia.' },
  { titulo: 'Evaluación al mes', texto: 'A los 30 días te preguntamos cómo va, con una nota de 1 a 5. Si no respondes, te lo recordamos a los 7 días.' },
  { titulo: 'Mejores recomendaciones', texto: 'Si no funcionó, nos cuentas por qué y usamos esas razones para mejorar tus próximas sugerencias.' },
]

export default function PostMatch() {
  const ref = useRef(null)

  useAnimacion(ref, ({ escritorio }) => {
    const q = gsap.utils.selector(ref)
    const linea = q('.l-tiempo')[0]
    aparecer(q('.l-encabezado > *'), { disparador: ref.current, separacion: 0.1 })

    // La línea se dibuja a medida que bajas
    gsap.from(q('.l-tiempo-linea span'), {
      scaleY: 0,
      ease: 'none',
      scrollTrigger: { trigger: linea, start: 'top 70%', end: 'bottom 60%', scrub: 0.6 },
    })
    q('.l-etapa').forEach((etapa, i) => {
      const lado = escritorio ? (i % 2 === 0 ? -50 : 50) : 30
      gsap.from(etapa.querySelector('.l-etapa-tarjeta'), {
        x: lado,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: etapa, start: 'top 78%', once: true },
      })
      gsap.from(etapa.querySelector('.l-etapa-punto'), {
        scale: 0,
        duration: 0.6,
        ease: 'back.out(2.5)',
        scrollTrigger: { trigger: etapa, start: 'top 78%', once: true },
      })
    })
  })

  return (
    <section id="despues-del-match" className="l-seccion l-post" ref={ref} aria-labelledby="post-titulo" tabIndex={-1}>
      <div className="l-contenedor">
        <Encabezado id="post-titulo" etiqueta="Después del match"
          titulo="Te acompañamos también después del match"
          bajada="Encontrar roomie es el comienzo. RoomMatch sigue presente para saber si la convivencia funciona." />
        <div className="l-tiempo">
          <span className="l-tiempo-linea" aria-hidden="true"><span /></span>
          <ol>
            {ETAPAS.map(({ titulo, texto }, i) => (
              <li key={titulo} className="l-etapa">
                <span className="l-etapa-punto" aria-hidden="true">{i + 1}</span>
                <div className="l-etapa-tarjeta">
                  <h3>{titulo}</h3>
                  <p>{texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
