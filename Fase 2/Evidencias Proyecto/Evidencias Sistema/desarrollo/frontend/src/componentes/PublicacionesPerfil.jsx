import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { ESTADOS, formatearFecha, formatearPesos, textoDe, TIPOS } from '../publicaciones.js'
import Confirmar from './Confirmar.jsx'
import { IconoEditar, IconoHogar, IconoLlave, IconoMas, IconoPapelera } from './Iconos.jsx'

// Invitación a publicar. Sin publicaciones se muestra como aviso destacado (estado vacío)
function AvisoPublicar({ vacio }) {
  return (
    <div className={`aviso-publicar${vacio ? ' es-vacio' : ''}`}>
      <span className="aviso-publicar-icono" aria-hidden="true"><IconoHogar /></span>
      <div className="aviso-publicar-texto">
        <h3>{vacio ? 'Aún no tienes publicaciones' : '¿Tienes un espacio para arrendar?'}</h3>
        <p>
          {vacio
            ? '¿Tienes una habitación o departamento disponible? Publícalo con la misma cuenta que usas para buscar y quedará visible para los estudiantes que buscan alojamiento.'
            : 'Publica tu habitación o departamento con la misma cuenta que usas para buscar. Quedará visible para los estudiantes que buscan alojamiento.'}
        </p>
      </div>
      <Link to="/publicaciones/nueva" className="boton aviso-publicar-boton">
        <IconoMas /> {vacio ? 'Publicar mi primer espacio' : 'Publicar mi espacio'}
      </Link>
    </div>
  )
}

// Sección «Mis publicaciones» del propio perfil (EP-03): cada tarjeta abre el detalle y
// tiene botones para editar (HU-07) y eliminar (HU-08)
export default function PublicacionesPerfil() {
  const [publicaciones, setPublicaciones] = useState(null)
  const navegar = useNavigate()
  const { state } = useLocation()
  const seccion = useRef(null)
  // Al volver de publicar o editar llega un aviso (por ejemplo «Publicación creada»)
  const [mensaje, setMensaje] = useState(state?.aviso ?? { tipo: '', texto: '' })
  const [porEliminar, setPorEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => {
    api('/publicaciones/mias')
      .then(setPublicaciones)
      .catch((err) => setMensaje({ tipo: 'alerta', texto: err.message }))
  }, [])

  // El aviso ya se copió al estado: se borra del historial para que no reaparezca al recargar,
  // y se baja hasta la sección para que se vea
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
    <section ref={seccion} className="perfil-seccion perfil-publicaciones" aria-labelledby="titulo-publicaciones">
      <div className="perfil-publicaciones-encabezado">
        <h2 id="titulo-publicaciones">
          <IconoLlave /> Mis publicaciones
          {cantidad > 0 && <span className="contador">{cantidad}</span>}
        </h2>
      </div>

      {mensaje.texto && (
        <p className={mensaje.tipo} role={mensaje.tipo === 'alerta' ? 'alert' : 'status'}>{mensaje.texto}</p>
      )}
      {publicaciones === null && !mensaje.texto && <p className="sin-dato">Cargando tus publicaciones…</p>}

      {publicaciones && <AvisoPublicar vacio={cantidad === 0} />}

      {cantidad > 0 && (
        <ul className="perfil-pubs">
          {publicaciones.map((p) => {
            const principal = p.fotos.find((f) => f.es_principal)
            return (
              <li key={p.id} className="perfil-pub">
                <div className="perfil-pub-foto">
                  {principal ? <img src={principal.url} alt="" loading="lazy" /> : <span>Sin fotos</span>}
                </div>
                <div className="perfil-pub-info">
                  <span className={`estado estado-${p.estado}`}>{ESTADOS[p.estado] ?? p.estado}</span>
                  {/* El enlace del título cubre toda la tarjeta: al presionarla se abre el detalle */}
                  <h3><Link to={`/alojamientos/${p.id}`} className="perfil-pub-enlace">{p.titulo}</Link></h3>
                  <p className="publicacion-meta">{textoDe(TIPOS, p.tipo)} · {p.ubicacion.comuna_nombre}</p>
                  <p className="publicacion-precio">{formatearPesos(p.costo_mensual)} <span>/ mes</span></p>
                  <p className="publicacion-meta">
                    {p.cupos_disponibles} de {p.cupos_totales} {p.cupos_totales === 1 ? 'cupo disponible' : 'cupos disponibles'}
                  </p>
                  <div className="perfil-pub-pie">
                    <span className="perfil-pub-fecha">Publicada el {formatearFecha(p.fecha_publicacion)}</span>
                    <div className="perfil-pub-acciones">
                      <Link to={`/publicaciones/${p.id}/editar`} className="boton-tarjeta"
                        aria-label={`Editar «${p.titulo}»`}>
                        <IconoEditar /> Editar
                      </Link>
                      <button type="button" className="boton-tarjeta peligro" onClick={() => setPorEliminar(p)}
                        aria-label={`Eliminar «${p.titulo}»`}>
                        <IconoPapelera /> Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* CA-08.1 y CA-08.3: se pide confirmar; al cancelar no cambia nada */}
      <Confirmar
        abierto={Boolean(porEliminar)}
        titulo="¿Eliminar esta publicación?"
        mensaje={porEliminar && `«${porEliminar.titulo}» dejará de aparecer en las búsquedas. Esta acción no se puede deshacer.`}
        textoConfirmar="Sí, eliminar"
        textoOcupado="Eliminando…"
        ocupado={eliminando}
        onConfirmar={eliminar}
        onCancelar={() => setPorEliminar(null)}
      />
    </section>
  )
}
