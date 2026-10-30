import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import Confirmar from '../componentes/Confirmar.jsx'
import { IconoEditar, IconoMas, IconoPapelera } from '../componentes/Iconos.jsx'
import { Inclinable } from '../landing/componentes.jsx'
import { ESTADOS, formatearFecha, formatearPesos, textoDe, TIPOS } from '../publicaciones.js'
import { IconoFlecha, IconoFoto } from './iconos.jsx'

// Sin fotos: una habitación dibujada con los colores de la marca
function SinFotos() {
  return (
    <svg className="p2-pub-placeholder" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="320" height="200" fill="#e3f1ef" />
      <rect y="150" width="320" height="50" fill="#cfe5e1" />
      <rect x="196" y="46" width="78" height="62" rx="4" fill="#fff" />
      <path d="M235 46v62M196 77h78" stroke="#cfe5e1" strokeWidth="4" />
      <rect x="40" y="112" width="120" height="40" rx="8" fill="#12766b" />
      <rect x="40" y="96" width="34" height="26" rx="6" fill="#3fd1b8" />
      <rect x="180" y="118" width="52" height="34" rx="4" fill="#0e2440" />
      <circle cx="252" cy="134" r="10" fill="#f2c94c" />
    </svg>
  )
}

// Galería de fotos con flechas, puntos y deslizamiento (scroll con imán)
function Carrusel({ fotos, titulo }) {
  const pista = useRef(null)
  const [actual, setActual] = useState(0)
  const ordenadas = [...fotos].sort((a, b) => Number(b.es_principal) - Number(a.es_principal))
  const ir = (i) => {
    const el = pista.current
    el?.scrollTo({ left: i * el.clientWidth, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  return (
    <div className="p2-carrusel" aria-roledescription="carrusel" aria-label={`Fotos de «${titulo}»`}>
      <div ref={pista} className="p2-carrusel-pista" tabIndex={-1}
        onScroll={(e) => setActual(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
        {ordenadas.map((f, i) => (
          <img key={f.url} src={f.url} alt={`Foto ${i + 1} de ${ordenadas.length}`} loading="lazy" />
        ))}
      </div>
      {ordenadas.length > 1 && (
        <>
          <button type="button" className="p2-carrusel-flecha izq" onClick={() => ir(Math.max(0, actual - 1))}
            disabled={actual === 0} aria-label="Foto anterior"><IconoFlecha izquierda /></button>
          <button type="button" className="p2-carrusel-flecha der" onClick={() => ir(Math.min(ordenadas.length - 1, actual + 1))}
            disabled={actual === ordenadas.length - 1} aria-label="Foto siguiente"><IconoFlecha /></button>
          <div className="p2-carrusel-puntos">
            {ordenadas.map((f, i) => (
              <button key={f.url} type="button" className={i === actual ? 'activo' : undefined} onClick={() => ir(i)}
                aria-label={`Ver foto ${i + 1}`} aria-current={i === actual} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Tarjeta de una publicación. Con `alEliminar` es la propia (editar, eliminar y agregar fotos);
// sin él, la de otro estudiante: solo se ve y al hacer clic se abre el detalle
function TarjetaPublicacion({ p, alEliminar }) {
  const propia = Boolean(alEliminar)
  return (
    <li>
      <Inclinable className="p2-pub" grados={3}>
        <div className="p2-pub-media">
          {p.fotos.length ? <Carrusel fotos={p.fotos} titulo={p.titulo} /> : (
            <div className="p2-pub-sin-fotos">
              <SinFotos />
              {propia && <Link to={`/publicaciones/${p.id}/editar`} className="boton secundario"><IconoFoto /> Agregar fotos</Link>}
            </div>
          )}
          {propia && <span className={`estado estado-${p.estado} p2-pub-estado`}>{ESTADOS[p.estado] ?? p.estado}</span>}
        </div>
        <div className="p2-pub-info">
          <h3><Link to={`/alojamientos/${p.id}`}>{p.titulo}</Link></h3>
          <p className="p2-pub-precio">{formatearPesos(p.costo_mensual)} <span>/ mes</span></p>
          <ul className="p2-pub-datos">
            <li>{textoDe(TIPOS, p.tipo)}</li>
            <li>{p.ubicacion.comuna_nombre}</li>
            <li>{p.cupos_disponibles} de {p.cupos_totales} {p.cupos_totales === 1 ? 'cupo' : 'cupos'}</li>
          </ul>
          <div className="p2-pub-pie">
            <span className="p2-nota">Publicada el {formatearFecha(p.fecha_publicacion)}</span>
            {propia ? (
              <span className="p2-pub-acciones">
                <Link to={`/publicaciones/${p.id}/editar`} className="boton-tarjeta" aria-label={`Editar «${p.titulo}»`}><IconoEditar /> Editar</Link>
                <button type="button" className="boton-tarjeta peligro" onClick={() => alEliminar(p)} aria-label={`Eliminar «${p.titulo}»`}>
                  <IconoPapelera /> Eliminar
                </button>
              </span>
            ) : (
              <Link to={`/alojamientos/${p.id}`} className="boton-tarjeta" aria-label={`Ver «${p.titulo}»`}>Ver alojamiento <IconoFlecha /></Link>
            )}
          </div>
        </div>
      </Inclinable>
    </li>
  )
}

/**
 * Alojamientos que ofrece otro estudiante, en su perfil (y en «Ver como me ven»). Solo las
 * publicaciones activas, como en la búsqueda; si no tiene ninguna, la sección no aparece.
 */
export function PublicacionesDe({ usuarioId, nombre }) {
  const [publicaciones, setPublicaciones] = useState(null)
  useEffect(() => {
    api(`/usuarios/${usuarioId}/publicaciones`).then(setPublicaciones).catch(() => setPublicaciones([]))
  }, [usuarioId])
  if (!publicaciones?.length) return null
  return (
    <section className="p2-tarjeta p2-publicaciones p2-anima" aria-labelledby="p2-titulo-pubs-de">
      <div className="p2-tarjeta-cabecera">
        <h2 id="p2-titulo-pubs-de">
          Alojamientos que ofrece {nombre.charAt(0).toUpperCase() + nombre.slice(1)}
          <span className="p2-contador-pubs">{publicaciones.length}</span>
        </h2>
      </div>
      <ul className="p2-pubs">
        {publicaciones.map((p) => <TarjetaPublicacion key={p.id} p={p} />)}
      </ul>
    </section>
  )
}

/**
 * «Mis publicaciones» en el propio perfil (EP-03): galería de fotos, estado, precio, comuna y
 * cupos; editar (HU-07) y eliminar con confirmación (HU-08). Al volver de publicar o editar
 * muestra el aviso que llega en el historial.
 */
export default function Publicaciones() {
  const [publicaciones, setPublicaciones] = useState(null)
  const navegar = useNavigate()
  const { state } = useLocation()
  const seccion = useRef(null)
  const [mensaje, setMensaje] = useState(state?.aviso ?? { tipo: '', texto: '' })
  const [porEliminar, setPorEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => {
    api('/publicaciones/mias').then(setPublicaciones).catch((err) => setMensaje({ tipo: 'alerta', texto: err.message }))
  }, [])

  useEffect(() => {
    if (!state?.aviso) return
    navegar('.', { replace: true, state: null })
    seccion.current?.scrollIntoView({ block: 'start' })
  }, [state, navegar])

  const eliminar = async () => {
    setEliminando(true)
    try {
      await api(`/publicaciones/${porEliminar.id}`, { metodo: 'DELETE' })
      setPublicaciones((lista) => lista.filter((p) => p.id !== porEliminar.id))
      setMensaje({ tipo: 'exito', texto: `Se eliminó «${porEliminar.titulo}».` }) // CA-08.2
    } catch (err) {
      setMensaje({ tipo: 'alerta', texto: err.message })
    } finally {
      setEliminando(false)
      setPorEliminar(null)
    }
  }

  const cantidad = publicaciones?.length ?? 0

  return (
    <section ref={seccion} className="p2-tarjeta p2-publicaciones p2-anima" aria-labelledby="p2-titulo-pubs">
      <div className="p2-tarjeta-cabecera">
        <h2 id="p2-titulo-pubs">Mis publicaciones {cantidad > 0 && <span className="p2-contador-pubs">{cantidad}</span>}</h2>
        <Link to="/publicaciones/nueva" className="boton"><IconoMas /> Publicar</Link>
      </div>

      {mensaje.texto && <p className={mensaje.tipo} role={mensaje.tipo === 'alerta' ? 'alert' : 'status'}>{mensaje.texto}</p>}
      {publicaciones === null && !mensaje.texto && <p className="p2-vacio">Cargando tus publicaciones…</p>}

      {publicaciones?.length === 0 && (
        <div className="p2-pubs-vacio">
          <SinFotos />
          <div>
            <p className="p2-siguiente-titulo">Aún no tienes publicaciones</p>
            <p className="p2-nota">¿Tienes una habitación o departamento disponible? Publícalo con la misma cuenta que usas para buscar.</p>
            <Link to="/publicaciones/nueva" className="boton"><IconoMas /> Publicar mi primer espacio</Link>
          </div>
        </div>
      )}

      {cantidad > 0 && (
        <ul className="p2-pubs">
          {publicaciones.map((p) => (
            <TarjetaPublicacion key={p.id} p={p} alEliminar={setPorEliminar} />
          ))}
        </ul>
      )}

      {/* CA-08.1 y CA-08.3: se pide confirmar; al cancelar no cambia nada */}
      <Confirmar abierto={Boolean(porEliminar)} titulo="¿Eliminar esta publicación?"
        mensaje={porEliminar && `«${porEliminar.titulo}» dejará de aparecer en las búsquedas. Esta acción no se puede deshacer.`}
        textoConfirmar="Sí, eliminar" textoOcupado="Eliminando…" ocupado={eliminando}
        onConfirmar={eliminar} onCancelar={() => setPorEliminar(null)} />
    </section>
  )
}
