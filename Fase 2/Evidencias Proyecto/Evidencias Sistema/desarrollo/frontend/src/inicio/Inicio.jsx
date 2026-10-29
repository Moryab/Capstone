import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import '../landing/landing.css'
import { gsap, prefiereSinMovimiento, useAnimacion } from '../landing/animaciones.js'
import { useSesion } from '../sesion/SesionContext.jsx'
import Hero from './Hero.jsx'
import TarjetaPasos from './tarjetas/TarjetaPasos.jsx'
import TarjetaPerfil from './tarjetas/TarjetaPerfil.jsx'
import TarjetaPronto from './tarjetas/TarjetaPronto.jsx'
import TarjetaPublicaciones from './tarjetas/TarjetaPublicaciones.jsx'
import TarjetaPublicar from './tarjetas/TarjetaPublicar.jsx'
import { momentoDelDia } from './utilidades.js'
import './inicio.css'

// Funciones de la plataforma: con `a` ya están disponibles; sin `a`, se muestran como «Muy pronto»
const FUNCIONES = [
  { tipo: 'busqueda', titulo: 'Buscar alojamiento', a: '/alojamientos', texto: 'Filtra habitaciones y departamentos por precio, comuna y cercanía a tu sede.' },
  { tipo: 'cuestionario', titulo: 'Cuestionario de convivencia', a: '/perfil/cuestionario', texto: 'Cuéntanos tus horarios, orden, ruido, visitas y mascotas.' },
  { tipo: 'roomie', titulo: 'Encontrar roomie', a: '/roomies', texto: 'Conoce estudiantes con hábitos parecidos a los tuyos.' },
  { tipo: 'match', titulo: 'Propuestas de match', a: '/propuestas', texto: 'RoomMatch te propone alojamientos compatibles y ambos deciden si aceptan.' },
]

/**
 * Inicio para quien ya inició sesión: hero según la hora y una grilla bento. La barra y la
 * configuración vienen del marco común (marco/Marco.jsx). Se carga aparte (lazy) porque usa GSAP.
 */
export default function Inicio() {
  const { usuario } = useSesion()
  const { state } = useLocation()
  const navegar = useNavigate()
  const [publicaciones, setPublicaciones] = useState(null)
  const [errorPubs, setErrorPubs] = useState('')
  const [perfil, setPerfil] = useState(null)
  const [momento] = useState(momentoDelDia)
  const ref = useRef(null)

  useEffect(() => {
    document.body.classList.add('pagina-inicio')
    return () => document.body.classList.remove('pagina-inicio')
  }, [])

  useEffect(() => {
    api('/publicaciones/mias')
      .then(setPublicaciones)
      .catch((err) => {
        setErrorPubs(err.message)
        setPublicaciones([])
      })
  }, [])

  useEffect(() => {
    api(`/usuarios/${usuario.id}/perfil`).then(setPerfil).catch(() => setPerfil(false))
  }, [usuario.id])

  // Entrada: el saludo se revela palabra por palabra y las tarjetas aparecen escalonadas
  useAnimacion(ref, () => {
    const q = gsap.utils.selector(ref)
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from(q('.i-hero-avatar'), { scale: 0.6, opacity: 0, duration: 0.6 })
      .from(q('.i-saludo .l-palabra-in'), { yPercent: 110, duration: 0.8, stagger: 0.08, ease: 'power4.out' }, '-=0.35')
      .from(q('.i-correo, .i-frase-fila'), { y: 16, opacity: 0, duration: 0.6, stagger: 0.08 }, '-=0.45')
    gsap.from(q('.i-tarjeta'), {
      y: 28, opacity: 0, scale: 0.97, duration: 0.7, ease: 'power3.out', delay: 0.25,
      stagger: { each: 0.07, grid: 'auto', from: 'start' },
    })
  })

  // Desde otra página, «Mis publicaciones» trae aquí y pide bajar hasta esa tarjeta.
  // El pedido se borra del historial recién después de bajar: si se borrara antes, el efecto
  // se volvería a ejecutar y cancelaría la bajada
  useEffect(() => {
    if (state?.ir !== 'publicaciones') return undefined
    const t = setTimeout(() => {
      const destino = document.getElementById('i-publicaciones')
      destino?.scrollIntoView({ behavior: prefiereSinMovimiento() ? 'auto' : 'smooth', block: 'start' })
      destino?.focus({ preventScroll: true })
      navegar('.', { replace: true, state: null })
    }, 350)
    return () => clearTimeout(t)
  }, [state, navegar])

  return (
    <main ref={ref} className="i-contenido">
      <Hero usuario={usuario} momento={momento} />

      <div className="i-bento">
        <TarjetaPublicar />
        <TarjetaPasos />
        <TarjetaPublicaciones publicaciones={publicaciones} error={errorPubs} />
        <TarjetaPerfil perfil={perfil} />
      </div>

      <section className="i-proximamente" aria-labelledby="i-titulo-pronto">
        <div className="i-seccion-encabezado">
          <p className="i-etiqueta">Explora</p>
          <h2 id="i-titulo-pronto">Todo lo que puedes hacer en RoomMatch</h2>
        </div>
        <div className="i-pronto-grilla">
          {FUNCIONES.map((f) => <TarjetaPronto key={f.tipo} {...f} />)}
        </div>
      </section>
    </main>
  )
}
