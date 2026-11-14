import { useEffect, useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { contar, gsap, prefiereSinMovimiento } from '../../landing/animaciones.js'
import { useSesion } from '../../sesion/SesionContext.jsx'
import { estaVerificado } from '../../sesion/verificacion.js'
import { formatearPesos, textoDe, TIPOS } from '../../publicaciones.js'
import { Ayuda, Esqueleto, Tarjeta } from '../comunes.jsx'
import { IconoFlecha, IconoMas } from '../iconos.jsx'

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`

// Cómo ve su dueño cada estado (mismos textos que «Mis publicaciones»)
const ESTADO = { activa: 'Visible', completa: 'Sin cupos', pausada: 'Pausada', suspendida: 'Oculta' }

// Habitación dibujada para la publicación que todavía no tiene fotos
const SinFotos = () => (
  <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="160" height="100" fill="#e3f1ef" />
    <rect y="74" width="160" height="26" fill="#cfe5e1" />
    <rect x="98" y="20" width="40" height="30" rx="3" fill="#fff" />
    <rect x="18" y="54" width="62" height="22" rx="5" fill="#12766b" />
    <rect x="18" y="45" width="18" height="14" rx="4" fill="#3fd1b8" />
    <circle cx="122" cy="66" r="6" fill="#f2c94c" />
  </svg>
)

const IconoOjo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
  </svg>
)

/**
 * Vista previa: la publicación principal tal como la ven los estudiantes (foto, precio, comuna y
 * cupos), con dos capas translúcidas detrás que le dan profundidad. Lleva al detalle público.
 */
function VistaPrevia({ lista }) {
  const zona = useRef(null)
  const p = lista.find((x) => x.estado === 'activa') ?? lista[0]
  const capas = 2 // siempre dos, aunque haya una sola publicación: es parte del diseño
  const foto = p.fotos.find((f) => f.es_principal) ?? p.fotos[0]
  const visible = p.estado === 'activa'

  // Entra una vez: primero la tarjeta y después las capas de atrás. Luego solo responde al mouse
  useLayoutEffect(() => {
    if (prefiereSinMovimiento()) return undefined
    const ctx = gsap.context(() => {
      gsap.timeline({ delay: 0.3, defaults: { ease: 'power3.out', clearProps: 'opacity,transform' } })
        .from('.i-vista-tarjeta', { opacity: 0, y: 14, duration: 0.55 })
        .from('.i-vista-capa', { opacity: 0, duration: 0.45, stagger: 0.08 }, '-=0.25')
        .from('.i-vista-nota', { opacity: 0, y: 6, duration: 0.4 }, '-=0.3')
    }, zona)
    return () => ctx.revert()
  }, [])

  return (
    <figure ref={zona} className="i-vista" data-capas={capas}>
      {/* La pila mide lo mismo que la tarjeta: las capas de atrás la copian exacto */}
      <div className="i-vista-pila">
      {Array.from({ length: capas }, (_, i) => <span key={i} className="i-vista-capa" data-capa={i + 1} aria-hidden="true" />)}
      <Link to={`/alojamientos/${p.id}`} className="i-vista-tarjeta" data-estado={p.estado}
        aria-label={`Ver «${p.titulo}» como lo ven los estudiantes`}>
        <span className="i-vista-media">
          {foto ? <img src={foto.url} alt="" loading="lazy" /> : <SinFotos />}
          <span className="i-vista-estado" data-estado={p.estado}><span aria-hidden="true" />{ESTADO[p.estado] ?? p.estado}</span>
        </span>
        <span className="i-vista-cuerpo">
          <strong>{p.titulo}</strong>
          <span className="i-vista-precio">{formatearPesos(p.costo_mensual)} <small>/ mes</small></span>
          <span className="i-vista-meta">
            {textoDe(TIPOS, p.tipo)} · {p.ubicacion.comuna_nombre} · {plural(p.cupos_disponibles, 'cupo libre', 'cupos libres')}
          </span>
        </span>
      </Link>
      </div>
      <figcaption className="i-vista-nota">
        <IconoOjo /> {visible ? 'Así lo ven los estudiantes' : 'Así se verá cuando esté visible'}
      </figcaption>
    </figure>
  )
}

/**
 * Inicio del oferente con publicaciones: la tarjeta protagonista. Resumen con cifras, la vista
 * previa de su espacio principal y el acceso a «Mis publicaciones», donde se administran.
 */
export default function TarjetaPublicaciones({ publicaciones, error }) {
  const cifras = useRef(null)
  const verificado = estaVerificado(useSesion().usuario)

  // Los contadores suben desde 0 cuando llegan los datos (el número real ya está en el HTML)
  useEffect(() => {
    if (!publicaciones?.length || prefiereSinMovimiento()) return undefined
    const animaciones = [...cifras.current.querySelectorAll('[data-valor]')].map((el) => contar(el, { duracion: 1.2 }))
    return () => animaciones.forEach((a) => a.kill())
  }, [publicaciones])

  const lista = publicaciones ?? []
  const visibles = lista.filter((p) => p.estado === 'activa')
  const cupos = visibles.reduce((s, p) => s + p.cupos_disponibles, 0)
  return (
    <Tarjeta className="i-area-pubs" cuerpo="i-pubs" etiqueta="i-titulo-pubs" oscura>
      <div className="i-pubs-texto">
        <p className="i-etiqueta claro">
          Tus espacios <Ayuda claro texto="Los alojamientos que ofreces. En «Mis publicaciones» los editas, pausas o eliminas." />
        </p>

        {publicaciones === null ? (
          <div className="i-pubs-cargando" role="status" aria-label="Cargando tus publicaciones">
            <Esqueleto ancho="70%" alto={30} /><Esqueleto ancho="50%" alto={16} />
          </div>
        ) : (
          <>
            <h2 id="i-titulo-pubs">
              {visibles.length > 0
                ? `${plural(visibles.length, 'espacio visible', 'espacios visibles')} para estudiantes`
                : 'Ninguno de tus espacios está visible'}
            </h2>
            <p className="i-pubs-desc">
              {visibles.length > 0
                ? 'RoomMatch los propone a quienes buscan y son compatibles contigo.'
                : 'Revísalos en «Mis publicaciones» para volver a mostrarlos.'}
            </p>
          </>
        )}

        {error && <p className="i-error" role="alert">{error}</p>}

        {lista.length > 0 && (
          <dl ref={cifras} className="i-pubs-cifras">
            <div><dt>Visibles</dt><dd data-valor={visibles.length}>{visibles.length}</dd></div>
            <div><dt>Cupos libres</dt><dd data-valor={cupos}>{cupos}</dd></div>
            <div><dt>Publicadas</dt><dd data-valor={lista.length}>{lista.length}</dd></div>
          </dl>
        )}

        <div className="i-pubs-acciones">
          <Link to="/mis-publicaciones" className="l-boton l-boton-luz i-pubs-boton">
            Ver mis publicaciones <IconoFlecha />
          </Link>
          {verificado && (
            <Link to="/publicaciones/nueva" className="i-pubs-secundario"><IconoMas tamano={16} /> Publicar otro</Link>
          )}
        </div>
      </div>

      {lista.length > 0 && <VistaPrevia lista={lista} />}
    </Tarjeta>
  )
}
