import { useRef } from 'react'
import { gsap, ScrollTrigger, useAnimacion } from '../animaciones.js'
import { Encabezado } from '../componentes.jsx'

// Todo esto existe o está definido en los criterios de aceptación (CA-16.3, HU-21, HU-23, CA-01.5, CA-02.5)
const PUNTOS = [
  {
    titulo: 'Tus datos personales, protegidos',
    texto: 'Tu correo, teléfono, RUT y dirección nunca aparecen en tu perfil. Los demás solo ven lo necesario para conocerte.',
    icono: <><rect x="4" y="10.5" width="16" height="10" rx="2.5" pathLength="1" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" pathLength="1" /><path d="M12 14.5v2.5" pathLength="1" /></>,
  },
  {
    titulo: 'Estudiantes verificados',
    texto: 'Puedes acreditar que eres estudiante con tu certificado de alumno regular. Ese documento solo lo ven tú y los administradores.',
    icono: <><path d="M12 2.5l7.5 3v6c0 4.6-3.2 8.3-7.5 9.9-4.3-1.6-7.5-5.3-7.5-9.9v-6z" pathLength="1" /><path d="M8.5 12l2.5 2.5 4.5-4.8" pathLength="1" /></>,
  },
  {
    titulo: 'Reporta lo que no esté bien',
    texto: 'Si un perfil o una publicación te parece falso o inapropiado, lo reportas y el equipo de moderación lo revisa.',
    icono: <><path d="M5 21V4" pathLength="1" /><path d="M5 4.5h11l-2 4 2 4H5" pathLength="1" /></>,
  },
  {
    titulo: 'Tu cuenta protegida',
    texto: 'Tu contraseña se guarda cifrada y tu sesión se cierra sola tras un rato sin actividad.',
    icono: <><circle cx="8" cy="15" r="4" pathLength="1" /><path d="M11 12l8.5-8.5M16.5 6.5l2.5 2.5M14.5 8.5l2 2" pathLength="1" /></>,
  },
]

export default function Seguridad() {
  const ref = useRef(null)

  useAnimacion(ref, () => {
    const q = gsap.utils.selector(ref)
    // Los íconos parten sin dibujar solo cuando hay animación; sin ella se ven completos
    ref.current.classList.add('animado')
    gsap.from(q('.l-encabezado > *'), {
      y: 30, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1,
      scrollTrigger: { trigger: ref.current, start: 'top 80%', once: true },
    })
    const lotes = ScrollTrigger.batch(q('.l-seguro'), {
      start: 'top 85%',
      once: true,
      onEnter: (elementos) => {
        gsap.from(elementos, { y: 40, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12 })
        elementos.forEach((el, i) => setTimeout(() => el.classList.add('visible'), 250 + i * 120))
      },
    })
    return () => {
      lotes.forEach((st) => st.kill())
      ref.current?.classList.remove('animado')
    }
  })

  return (
    <section id="seguridad" className="l-seccion l-seguridad" ref={ref} aria-labelledby="seg-titulo" tabIndex={-1}>
      <div className="l-contenedor">
        <Encabezado id="seg-titulo" claro etiqueta="Seguridad y confianza"
          titulo="Pensado para tu tranquilidad"
          bajada="Vas a compartir casa con alguien: tu seguridad y tu privacidad van primero." />
        <ul className="l-seguros">
          {PUNTOS.map(({ titulo, texto, icono }) => (
            <li key={titulo} className="l-seguro">
              <span className="l-seguro-icono" aria-hidden="true">
                <svg viewBox="0 0 24 24">{icono}</svg>
              </span>
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
