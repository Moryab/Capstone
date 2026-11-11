import { useRef } from 'react'
import { Link } from 'react-router-dom'
import ciudad from '../../assets/roommatch-bg.svg'
import { contar, gsap, useAnimacion } from '../animaciones.js'
import { EnlaceSeccion, Palabras } from '../componentes.jsx'

const PERFILES = [
  { clase: 'a', iniciales: 'CR', nombre: 'Camila, 21', carrera: 'Psicología', chips: ['Madrugadora', 'Muy ordenada', 'Ama los gatos'] },
  { clase: 'b', iniciales: 'MS', nombre: 'Matías, 22', carrera: 'Ing. Civil Informática', chips: ['Duerme temprano', 'Orden alto', 'Sin fumar'] },
]

function TarjetaPerfil({ clase, iniciales, nombre, carrera, chips }) {
  return (
    <div className={`l-perfil l-perfil-${clase}`}>
      <div className="l-perfil-cabeza">
        <span className="l-avatar">{iniciales}</span>
        <div>
          <strong>{nombre}</strong>
          <span>{carrera}</span>
        </div>
      </div>
      <ul className="l-chips">
        {chips.map((chip) => <li key={chip}>{chip}</li>)}
      </ul>
    </div>
  )
}

export default function Hero() {
  const ref = useRef(null)

  useAnimacion(ref, ({ escritorio }) => {
    const q = gsap.utils.selector(ref)

    // Texto: título palabra por palabra y luego el resto
    const entrada = gsap.timeline({ defaults: { ease: 'power3.out' } })
    entrada
      .from(q('.l-hero-titulo .l-palabra-in'), { yPercent: 110, duration: 0.9, stagger: 0.07 })
      .from(q('.l-hero-anim'), { y: 24, opacity: 0, duration: 0.8, stagger: 0.1 }, '-=0.5')

    // Visual: las tarjetas llegan, se acercan, aparece el corazón y sube el porcentaje
    const match = gsap.timeline({ delay: 0.35, defaults: { ease: 'power3.out' } })
    match
      .from(q('.l-perfil-a'), { x: -90, opacity: 0, duration: 1 })
      .from(q('.l-perfil-b'), { x: 90, opacity: 0, duration: 1 }, '<0.1')
      .to(q('.l-perfil-a'), { x: 18, duration: 0.9, ease: 'power2.inOut' })
      .to(q('.l-perfil-b'), { x: -18, duration: 0.9, ease: 'power2.inOut' }, '<')
      .from(q('.l-hero-conexion path'), { strokeDashoffset: 1, duration: 0.9, ease: 'power2.inOut' }, '<0.2')
      .from(q('.l-hero-corazon'), { scale: 0, opacity: 0, duration: 0.7, ease: 'back.out(2.2)' }, '-=0.3')
      .from(q('.l-hero-porcentaje'), { y: 16, opacity: 0, duration: 0.6 }, '-=0.2')
      .add(contar(q('[data-contador]')[0], { duracion: 1.4 }), '<')
      .from(q('.l-etiqueta-ejemplo'), { opacity: 0, duration: 0.5 }, '-=0.6')

    // Después, todo flota suavemente
    gsap.to(q('.l-hero-corazon'), { y: -8, duration: 2.2, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 3 })
    gsap.to(q('.l-perfil-a'), { y: -6, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 3 })
    gsap.to(q('.l-perfil-b'), { y: 6, duration: 3.4, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 3 })

    if (!escritorio) return undefined

    // Parallax con el mouse: cada capa se mueve según su profundidad
    const capas = q('[data-profundidad]').map((el) => ({
      x: gsap.quickTo(el, 'x', { duration: 1.2, ease: 'power3.out' }),
      y: gsap.quickTo(el, 'y', { duration: 1.2, ease: 'power3.out' }),
      profundidad: Number(el.dataset.profundidad),
    }))
    const mover = (e) => {
      const dx = e.clientX / window.innerWidth - 0.5
      const dy = e.clientY / window.innerHeight - 0.5
      capas.forEach((c) => {
        c.x(dx * c.profundidad)
        c.y(dy * c.profundidad)
      })
    }
    const seccion = ref.current
    seccion.addEventListener('pointermove', mover)
    return () => seccion.removeEventListener('pointermove', mover)
  })

  return (
    <section className="l-hero" ref={ref} aria-labelledby="hero-titulo">
      <div className="l-hero-capas" aria-hidden="true">
        <div className="l-capa l-capa-brillos" data-profundidad="30" />
        <img className="l-capa l-capa-ciudad" src={ciudad} alt="" data-profundidad="14" />
      </div>

      <div className="l-contenedor l-hero-grid">
        <div className="l-hero-texto">
          <p className="l-etiqueta l-hero-anim">Para estudiantes que buscan dónde y con quién vivir</p>
          <h1 id="hero-titulo" className="l-hero-titulo">
            <Palabras texto="Encuentra tu hogar." />
            <br />
            <Palabras texto="Encuentra a" />
            <span className="l-resaltado"><Palabras texto="tu roomie." /></span>
          </h1>
          <p className="l-hero-sub l-hero-anim">
            RoomMatch te conecta con estudiantes que comparten tu forma de vivir y te ayuda a encontrar
            alojamiento cerca de tu sede.
          </p>
          <div className="l-hero-ctas l-hero-anim">
            <Link to="/registro" className="l-boton l-boton-grande">Crear mi cuenta</Link>
            <EnlaceSeccion id="como-funciona" className="l-boton l-boton-grande l-boton-claro">
              Cómo funciona
            </EnlaceSeccion>
          </div>
          <ul className="l-hero-puntos l-hero-anim">
            <li>Match por convivencia</li>
            <li>Alojamiento</li>
            <li>Seguimiento después del match</li>
          </ul>
        </div>

        <div className="l-hero-visual" data-profundidad="-18" role="img"
          aria-label="Ejemplo: dos perfiles de estudiantes hacen match con 92 % de compatibilidad">
          <svg className="l-hero-conexion" viewBox="0 0 400 400" aria-hidden="true">
            <path d="M120 150 C 190 60, 250 300, 300 260" pathLength="1" />
          </svg>
          {PERFILES.map((perfil) => <TarjetaPerfil key={perfil.clase} {...perfil} />)}
          <div className="l-hero-corazon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.5-9.4C1 7.9 3.4 4.5 7 4.5c2.1 0 3.6 1.1 5 2.8 1.4-1.7 2.9-2.8 5-2.8 3.6 0 6 3.4 4.5 7.1C19.5 16.4 12 21 12 21z" /></svg>
          </div>
          <div className="l-hero-porcentaje" aria-hidden="true">
            <strong><span data-contador data-valor="92">92</span>%</strong>
            <span>compatibles</span>
          </div>
          <span className="l-etiqueta-ejemplo" aria-hidden="true">Perfiles de ejemplo</span>
        </div>
      </div>
    </section>
  )
}
