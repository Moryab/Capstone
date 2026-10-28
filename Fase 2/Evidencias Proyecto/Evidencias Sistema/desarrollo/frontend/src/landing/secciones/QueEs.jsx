import { useRef } from 'react'
import { aparecer, useAnimacion } from '../animaciones.js'
import { Encabezado, Inclinable } from '../componentes.jsx'

const IDEAS = [
  {
    titulo: 'Match por convivencia',
    texto: 'Te conectamos con estudiantes que comparten tus horarios, tu nivel de orden y tu forma de vivir. No solo con quien tenga una pieza libre.',
    icono: (
      <>
        <circle cx="8" cy="8" r="3.2" />
        <circle cx="16" cy="8" r="3.2" />
        <path d="M2.5 19a5.5 5.5 0 0 1 11 0M10.5 19a5.5 5.5 0 0 1 11 0" />
      </>
    ),
  },
  {
    titulo: 'Alojamiento cerca de tu sede',
    texto: 'Revisa habitaciones y departamentos publicados por otros estudiantes y filtra por precio, comuna, cercanía y reglas de la casa.',
    icono: (
      <>
        <path d="M3 11l9-7 9 7" />
        <path d="M5 10v10h14V10" />
        <path d="M10 20v-6h4v6" />
      </>
    ),
  },
  {
    titulo: 'Te acompañamos después',
    texto: 'Cuando hacen match registramos su convivencia, y al mes te preguntamos cómo va para mejorar tus próximas recomendaciones.',
    icono: (
      <>
        <path d="M12 21s-7.5-4.6-9.5-9.4C1 7.9 3.4 4.5 7 4.5c2.1 0 3.6 1.1 5 2.8 1.4-1.7 2.9-2.8 5-2.8 3.6 0 6 3.4 4.5 7.1C19.5 16.4 12 21 12 21z" />
        <path d="M8.5 12l2.4 2.4 4.6-4.6" />
      </>
    ),
  },
]

export default function QueEs() {
  const ref = useRef(null)

  useAnimacion(ref, () => {
    aparecer(ref.current.querySelectorAll('.l-encabezado > *'), { disparador: ref.current, separacion: 0.1 })
    aparecer(ref.current.querySelectorAll('.l-idea'), { disparador: ref.current.querySelector('.l-ideas'), separacion: 0.15, desplazamiento: 60 })
  })

  return (
    <section id="que-es" className="l-seccion" ref={ref} aria-labelledby="que-es-titulo" tabIndex={-1}>
      <div className="l-contenedor">
        <Encabezado id="que-es-titulo" etiqueta="¿Qué es RoomMatch?"
          titulo="Compartir casa es más fácil con la persona correcta"
          bajada="RoomMatch es una plataforma para estudiantes que reúne, en un solo lugar, la búsqueda de roomie y la de alojamiento." />
        <div className="l-ideas">
          {IDEAS.map(({ titulo, texto, icono }, i) => (
            <Inclinable key={titulo} className="l-idea">
              <span className="l-idea-numero" aria-hidden="true">0{i + 1}</span>
              <span className="l-icono-caja" aria-hidden="true">
                <svg viewBox="0 0 24 24">{icono}</svg>
              </span>
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </Inclinable>
          ))}
        </div>
      </div>
    </section>
  )
}
