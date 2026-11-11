import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap, useAnimacion } from '../animaciones.js'
import { BotonMagnetico, Palabras } from '../componentes.jsx'

export default function CtaFinal() {
  const ref = useRef(null)

  useAnimacion(ref, () => {
    const q = gsap.utils.selector(ref)
    const tl = gsap.timeline({ scrollTrigger: { trigger: ref.current, start: 'top 65%', once: true } })
    tl.from(q('.l-palabra-in'), { yPercent: 110, duration: 0.9, ease: 'power3.out', stagger: 0.06 })
      .from(q('.l-cta-anim'), { y: 24, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.1 }, '-=0.5')

    // El fondo se desplaza un poco más lento que la página (parallax)
    gsap.fromTo(q('.l-cta-fondo'), { yPercent: -8 }, {
      yPercent: 8,
      ease: 'none',
      scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: true },
    })
  })

  return (
    <section className="l-cta" ref={ref} aria-labelledby="cta-titulo">
      <div className="l-cta-fondo" aria-hidden="true" />
      <div className="l-contenedor l-cta-contenido">
        <p className="l-etiqueta l-cta-anim">Empieza hoy</p>
        <h2 id="cta-titulo" className="l-cta-titulo">
          <Palabras texto="Tu próximo hogar empieza con un buen match." />
        </h2>
        <p className="l-cta-sub l-cta-anim">Crea tu cuenta, cuéntanos cómo vives y descubre con quién podrías compartir casa.</p>
        <div className="l-cta-botones l-cta-anim">
          <BotonMagnetico to="/registro" className="l-boton-grande l-boton-luz">Registrarme</BotonMagnetico>
          <Link to="/login" className="l-enlace-claro">Ya tengo cuenta</Link>
        </div>
      </div>
    </section>
  )
}
