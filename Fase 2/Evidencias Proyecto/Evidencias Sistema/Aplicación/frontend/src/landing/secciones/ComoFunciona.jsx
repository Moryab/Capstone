import { useRef, useState } from 'react'
import { aparecer, ScrollTrigger, useAnimacion } from '../animaciones.js'
import { Encabezado } from '../componentes.jsx'
import { IlustracionPaso } from '../ilustraciones.jsx'

const PASOS = [
  {
    titulo: 'Crea tu perfil',
    texto: 'Regístrate, cuéntanos qué estudias y en qué sede, y sube tu foto para que te conozcan.',
  },
  {
    titulo: 'Cuenta tu estilo de convivencia',
    texto: 'Responde un cuestionario corto: horarios, orden, ruido, visitas, fumar y mascotas. Marca hasta 3 como imprescindibles.',
  },
  {
    titulo: 'Descubre a tus compatibles',
    texto: 'Te mostramos estudiantes ordenados por porcentaje de compatibilidad y en qué coinciden contigo.',
  },
  {
    titulo: 'Acepta tu match',
    texto: 'RoomMatch te propone un match con quien más coincides. Si ambos aceptan, el match queda confirmado.',
  },
]

// En escritorio la sección queda fija mientras avanzan los pasos y cambia la ilustración.
// En móvil (o con "reducir movimiento") es una lista normal con una ilustración por paso.
// Qué diseño se usa lo decide el CSS con las mismas condiciones, así GSAP mide la forma final
export default function ComoFunciona() {
  const ref = useRef(null)
  const fijo = useRef(null)
  const linea = useRef(null)
  const [activo, setActivo] = useState(0)

  useAnimacion(ref, ({ escritorio }) => {
    aparecer(ref.current.querySelectorAll('.l-encabezado > *'), { disparador: ref.current, separacion: 0.1 })

    if (!escritorio) {
      ref.current.querySelectorAll('.l-paso').forEach((paso) => aparecer(paso, { disparador: paso }))
      return undefined
    }

    const disparador = ScrollTrigger.create({
      trigger: fijo.current,
      start: 'top top',
      end: () => `+=${window.innerHeight * PASOS.length * 0.8}`,
      pin: true,
      onUpdate: (st) => {
        setActivo(Math.min(PASOS.length - 1, Math.floor(st.progress * PASOS.length)))
        linea.current.style.transform = `scaleY(${st.progress})`
      },
    })
    return () => {
      disparador.kill()
      setActivo(0)
    }
  })

  return (
    <section id="como-funciona" className="l-seccion l-como" ref={ref}
      aria-labelledby="como-titulo" tabIndex={-1}>
      <div className="l-como-fijo" ref={fijo}>
        <div className="l-contenedor l-como-grid">
          <div>
            <Encabezado id="como-titulo" etiqueta="Cómo funciona" titulo="Tu match en 4 pasos" />
            <div className="l-pasos-caja">
              <span className="l-pasos-riel" aria-hidden="true"><span ref={linea} /></span>
              <ol className="l-pasos">
                {PASOS.map(({ titulo, texto }, i) => (
                  <li key={titulo} className={`l-paso${i === activo ? ' activo' : ''}${i < activo ? ' hecho' : ''}`}>
                    <span className="l-paso-numero" aria-hidden="true">{i + 1}</span>
                    <div>
                      <h3>{titulo}</h3>
                      <p>{texto}</p>
                      <IlustracionPaso numero={i} className="l-paso-ilus-movil" />
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="l-como-visual" aria-hidden="true">
            {PASOS.map(({ titulo }, i) => (
              <IlustracionPaso key={titulo} numero={i} className={`l-como-panel${i === activo ? ' activo' : ''}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
