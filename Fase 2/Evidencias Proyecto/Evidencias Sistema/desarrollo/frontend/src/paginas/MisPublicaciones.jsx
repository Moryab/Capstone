import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import Confirmar from '../componentes/Confirmar.jsx'
import { ESTADOS, formatearPesos, textoDe, TIPOS } from '../publicaciones.js'

// «Mis publicaciones»: desde aquí se edita (HU-07) o elimina (HU-08) cada alojamiento
export default function MisPublicaciones() {
  const navegar = useNavigate()
  const { state } = useLocation()
  const [publicaciones, setPublicaciones] = useState(null)
  const [mensaje, setMensaje] = useState(state?.aviso ?? { tipo: '', texto: '' })
  const [porEliminar, setPorEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => {
    api('/publicaciones/mias')
      .then(setPublicaciones)
      .catch((err) => setMensaje({ tipo: 'alerta', texto: err.message }))
  }, [])

  // El aviso que llega al volver de publicar o editar ya se copió al estado; se borra del
  // historial para que no reaparezca al recargar la página
  useEffect(() => {
    if (state?.aviso) navegar('.', { replace: true, state: null })
  }, [state, navegar])

  const eliminar = async () => {
    setEliminando(true)
    try {
      await api(`/publicaciones/${porEliminar.id}`, { metodo: 'DELETE' })
      setPublicaciones(publicaciones.filter((p) => p.id !== porEliminar.id))
      setMensaje({ tipo: 'exito', texto: `Se eliminó «${porEliminar.titulo}».` }) // CA-08.2
    } catch (err) {
      setMensaje({ tipo: 'alerta', texto: err.message })
    } finally {
      setEliminando(false)
      setPorEliminar(null)
    }
  }

  return (
    <main className="pagina-publicaciones">
      <div className="encabezado-pagina">
        <div>
          <h1>Mis publicaciones</h1>
          <p className="subtitulo">Los alojamientos que ofreces en RoomMatch</p>
        </div>
        <Link to="/publicaciones/nueva" className="boton">Publicar alojamiento</Link>
      </div>

      {mensaje.texto && (
        <p className={mensaje.tipo} role={mensaje.tipo === 'alerta' ? 'alert' : 'status'}>{mensaje.texto}</p>
      )}

      {publicaciones === null && !mensaje.texto && <p className="cargando">Cargando tus publicaciones…</p>}

      {publicaciones?.length === 0 && (
        <div className="tarjeta vacio">
          <h2>Aún no publicas alojamientos</h2>
          <p className="subtitulo">
            Si tienes una habitación o departamento disponible, publícalo con la misma cuenta que usas para buscar.
          </p>
          <Link to="/publicaciones/nueva" className="boton">Publicar mi primer alojamiento</Link>
        </div>
      )}

      <ul className="lista-publicaciones">
        {publicaciones?.map((p) => {
          const principal = p.fotos.find((f) => f.es_principal)
          return (
            <li key={p.id} className="tarjeta-publicacion">
              <Link to={`/alojamientos/${p.id}`} className="publicacion-foto" tabIndex={-1} aria-hidden="true">
                {principal ? <img src={principal.url} alt="" /> : <span>Sin fotos</span>}
              </Link>
              <div className="publicacion-info">
                <span className={`estado estado-${p.estado}`}>{ESTADOS[p.estado] ?? p.estado}</span>
                <h2><Link to={`/alojamientos/${p.id}`}>{p.titulo}</Link></h2>
                <p className="publicacion-meta">
                  {textoDe(TIPOS, p.tipo)} · {p.ubicacion.comuna_nombre}, {p.ubicacion.sector}
                </p>
                <p className="publicacion-precio">
                  {formatearPesos(p.costo_mensual)} <span>/ mes</span>
                </p>
                <p className="publicacion-meta">
                  {p.cupos_disponibles} de {p.cupos_totales} {p.cupos_totales === 1 ? 'cupo disponible' : 'cupos disponibles'}
                </p>
              </div>
              <div className="publicacion-acciones">
                <Link to={`/publicaciones/${p.id}/editar`} className="boton secundario">Editar</Link>
                <button type="button" className="boton peligro-suave" onClick={() => setPorEliminar(p)}>
                  Eliminar
                </button>
              </div>
            </li>
          )
        })}
      </ul>

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
    </main>
  )
}
