import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import AvisoVerificacion from '../componentes/AvisoVerificacion.jsx'
import '../landing/landing.css'
import { gsap, useAnimacion } from '../landing/animaciones.js'
import { useSesion } from '../sesion/SesionContext.jsx'
import Hero from './Hero.jsx'
import ModalPausadas from './ModalPausadas.jsx'
import TarjetaBuscando from './tarjetas/TarjetaBuscando.jsx'
import TarjetaCambioRol from './tarjetas/TarjetaCambioRol.jsx'
import TarjetaPasos from './tarjetas/TarjetaPasos.jsx'
import TarjetaPausadas from './tarjetas/TarjetaPausadas.jsx'
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

  const cargarPublicaciones = useCallback(() => api('/publicaciones/mias')
    .then((pubs) => {
      setErrorPubs('')
      setPublicaciones(pubs)
    })
    .catch((err) => {
      setErrorPubs(err.message)
      setPublicaciones([])
    }), [])

  // También al cambiar de rol: si el cambio se hace desde aquí el inicio no se vuelve a montar, y
  // sin recargar seguiría mostrando las publicaciones como estaban antes (activas o pausadas)
  useEffect(() => {
    cargarPublicaciones()
  }, [cargarPublicaciones, usuario.modo])

  // El oferente que volvió a ese rol confirma si sus publicaciones pausadas siguen disponibles.
  // `revision` es la lista que se muestra en el modal mientras está abierto (null = cerrado)
  const pausadas = useMemo(
    () => (usuario.modo === 'oferente' ? (publicaciones ?? []).filter((p) => p.estado === 'pausada') : []),
    [usuario.modo, publicaciones],
  )
  const [revision, setRevision] = useState(null)

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

  // Al volver a ser oferente (CambioRol.jsx), el modal de las pausadas se abre solo, una vez.
  // Se piden las publicaciones en ese momento, sin esperar ni confiar en la lista que ya estaba
  // cargada: con un cambio rápido de ida y vuelta esa lista todavía las tenía como activas.
  // El pedido se borra del historial para que no reaparezca al recargar
  const pideRevisar = Boolean(state?.revisarPausadas)
  useEffect(() => {
    if (!pideRevisar) return
    navegar('.', { replace: true, state: null })
    api('/publicaciones/mias')
      .then((pubs) => {
        setErrorPubs('')
        setPublicaciones(pubs)
        const porRevisar = pubs.filter((p) => p.estado === 'pausada')
        if (porRevisar.length > 0) setRevision(porRevisar)
      })
      .catch(() => {}) // si falla, la tarjeta del inicio sigue recordándolas
  }, [pideRevisar, navegar])

  return (
    <main ref={ref} className="i-contenido">
      <Hero usuario={usuario} momento={momento} />

      <AvisoVerificacion detalle={usuario.modo === 'buscador'
        ? 'Mientras tanto puedes activar tu búsqueda: las propuestas empezarán a llegar cuando te verifiquemos.'
        : null} />

      {/* Una tarjeta principal según el rol: el buscador activa su búsqueda; el oferente publica
          o, si ya publicó, ve el resumen de sus publicaciones */}
      <div className={`i-bento modo-${usuario.modo}`}>
        {/* Recordatorio si cerró el modal sin responder todas */}
        {pausadas.length > 0 && <TarjetaPausadas publicaciones={pausadas} alRevisar={() => setRevision(pausadas)} />}
        {usuario.modo === 'oferente' ? (
          publicaciones?.length === 0 && !errorPubs
            ? <TarjetaPublicar />
            : <TarjetaPublicaciones publicaciones={publicaciones} error={errorPubs} />
        ) : (
          <TarjetaBuscando />
        )}
        <TarjetaPasos />
        <TarjetaPerfil perfil={perfil} />
        <TarjetaCambioRol />
      </div>

      {revision && (
        <ModalPausadas publicaciones={revision} alCambiar={cargarPublicaciones} alCerrar={() => setRevision(null)} />
      )}

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
