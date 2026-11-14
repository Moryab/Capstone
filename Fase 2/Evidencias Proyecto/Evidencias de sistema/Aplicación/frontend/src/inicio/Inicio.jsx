import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useApi } from '../datos/useApi.js'
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

// ¿Ya se mostró el inicio en esta sesión? Al volver no se repite la entrada
let inicioVisto = false

/**
 * Inicio para quien ya inició sesión: hero según la hora y una grilla bento. La barra y la
 * configuración vienen del marco común (marco/Marco.jsx). Se carga aparte (lazy) porque usa GSAP.
 */
export default function Inicio() {
  const { usuario } = useSesion()
  const { state } = useLocation()
  const navegar = useNavigate()
  // Con caché: al volver al inicio las tarjetas aparecen al instante y se actualizan por detrás
  const rPublicaciones = useApi('/publicaciones/mias')
  const publicaciones = rPublicaciones.error ? [] : (rPublicaciones.datos ?? null)
  const errorPubs = rPublicaciones.error
  const setPublicaciones = rPublicaciones.actualizar
  const rPerfil = useApi(`/usuarios/${usuario.id}/perfil`)
  const perfil = rPerfil.error ? false : (rPerfil.datos ?? null)
  // La entrada animada solo la primera vez que se abre el inicio en la sesión
  const [repetida] = useState(() => inicioVisto)
  const [momento] = useState(momentoDelDia)
  const ref = useRef(null)

  useEffect(() => {
    document.body.classList.add('pagina-inicio')
    return () => document.body.classList.remove('pagina-inicio')
  }, [])

  const cargarPublicaciones = rPublicaciones.recargar

  // También al cambiar de rol: si el cambio se hace desde aquí el inicio no se vuelve a montar, y
  // sin recargar seguiría mostrando las publicaciones como estaban antes (activas o pausadas)
  const modoAnterior = useRef(usuario.modo)
  useEffect(() => {
    if (modoAnterior.current === usuario.modo) return
    modoAnterior.current = usuario.modo
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
    inicioVisto = true
  }, [])

  // Entrada, solo la primera vez en la sesión: el saludo se revela palabra por palabra y las tarjetas
  // aparecen escalonadas. Corta (todo termina en ~0,6 s); al volver al inicio ya está todo en su lugar
  useAnimacion(ref, () => {
    if (repetida) return
    const q = gsap.utils.selector(ref)
    gsap.timeline({ defaults: { ease: 'power2.out' } })
      .from(q('.i-hero-avatar'), { scale: 0.9, opacity: 0, duration: 0.3 })
      .from(q('.i-saludo .l-palabra-in'), { yPercent: 100, duration: 0.32, stagger: 0.04 }, '-=0.2')
      .from(q('.i-correo, .i-frase-fila'), { y: 8, opacity: 0, duration: 0.26, stagger: 0.04 }, '-=0.2')
    gsap.from(q('.i-tarjeta'), {
      y: 10, opacity: 0, duration: 0.3, ease: 'power2.out', delay: 0.1,
      stagger: { each: 0.04, grid: 'auto', from: 'start' },
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
