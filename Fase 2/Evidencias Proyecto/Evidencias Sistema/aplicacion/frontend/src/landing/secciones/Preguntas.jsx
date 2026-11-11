import { useId, useRef, useState } from 'react'
import { aparecer, gsap, useAnimacion } from '../animaciones.js'
import { Encabezado } from '../componentes.jsx'

const PREGUNTAS = [
  {
    pregunta: '¿Quién puede usar RoomMatch?',
    respuesta: 'Estudiantes de educación superior. Con la misma cuenta puedes buscar roomie, buscar alojamiento o publicar el tuyo.',
  },
  {
    pregunta: '¿Cómo se calcula la compatibilidad?',
    respuesta: 'Comparamos tus respuestas del cuestionario de hábitos con las de otros estudiantes, categoría por categoría, y obtenemos un porcentaje de 0 a 100. Las categorías que marques como imprescindibles pesan más.',
  },
  {
    pregunta: '¿Qué ven los demás de mi perfil?',
    respuesta: 'Tu nombre, foto, institución, carrera, descripción y hábitos de convivencia. Tu correo, teléfono, RUT y dirección no se muestran.',
  },
  {
    pregunta: '¿Puedo publicar mi habitación o departamento?',
    respuesta: 'Sí. Indicas el costo mensual, la comuna, los gastos y las reglas de la casa, y puedes subir hasta 5 fotos.',
  },
  {
    pregunta: '¿Qué pasa si la convivencia no funciona?',
    respuesta: 'Al mes de empezar a vivir juntos te pedimos evaluar la convivencia. Si no funcionó, nos cuentas las razones y las usamos para darte mejores recomendaciones.',
  },
]

function Pregunta({ pregunta, respuesta }) {
  const [abierta, setAbierta] = useState(false)
  const id = useId()
  return (
    <li className={`l-pregunta${abierta ? ' abierta' : ''}`}>
      <h3>
        <button type="button" aria-expanded={abierta} aria-controls={`${id}-r`} id={`${id}-p`}
          onClick={() => setAbierta(!abierta)}>
          <span>{pregunta}</span>
          <span className="l-pregunta-signo" aria-hidden="true" />
        </button>
      </h3>
      {/* La altura se anima con grid (0fr → 1fr); `inert` evita llegar con Tab al texto oculto */}
      <div className="l-respuesta" id={`${id}-r`} role="region" aria-labelledby={`${id}-p`} inert={!abierta}>
        <div><p>{respuesta}</p></div>
      </div>
    </li>
  )
}

export default function Preguntas() {
  const ref = useRef(null)

  useAnimacion(ref, () => {
    const q = gsap.utils.selector(ref)
    aparecer(q('.l-encabezado > *'), { disparador: ref.current, separacion: 0.1 })
    aparecer(q('.l-pregunta'), { disparador: q('.l-preguntas')[0], separacion: 0.08, desplazamiento: 24 })
  })

  return (
    <section id="preguntas" className="l-seccion" ref={ref} aria-labelledby="faq-titulo" tabIndex={-1}>
      <div className="l-contenedor l-faq-grid">
        <Encabezado id="faq-titulo" etiqueta="Preguntas frecuentes" titulo="Lo que más nos preguntan" />
        <ul className="l-preguntas">
          {PREGUNTAS.map((p) => <Pregunta key={p.pregunta} {...p} />)}
        </ul>
      </div>
    </section>
  )
}
