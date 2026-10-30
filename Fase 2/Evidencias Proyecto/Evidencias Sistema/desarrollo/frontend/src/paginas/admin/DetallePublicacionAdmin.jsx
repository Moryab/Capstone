import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api } from '../../api.js'
import Avatar from '../../componentes/Avatar.jsx'
import Campo from '../../componentes/Campo.jsx'
import Confirmar from '../../componentes/Confirmar.jsx'
import FichaPublicacion from '../../componentes/FichaPublicacion.jsx'
import InsigniaVerificacion from '../../componentes/InsigniaVerificacion.jsx'
import {
  MAX_JUSTIFICACION, MOTIVOS_INCUMPLIMIENTO, textoAccion, textoEstadoReporte, textoIncumplimiento, textoMotivo,
} from '../../reportes.js'
import { fechaCorta, fechaHora } from '../verificacion/datos.js'
import { textoPublicacion } from './datos.js'
import './reportes.css'

const ACCIONES = [
  { valor: 'ocultar', texto: 'Ocultar la publicación' },
  { valor: 'eliminar', texto: 'Eliminar la publicación' },
]

// CA-30.1 a CA-30.3: ocultar o eliminar, con el motivo del incumplimiento y un comentario
function FormularioModeracion({ publicacionId, estado, alTerminar }) {
  // Una publicación ya oculta solo se puede eliminar
  const opciones = estado === 'suspendida' ? ACCIONES.filter((a) => a.valor === 'eliminar') : ACCIONES
  const [datos, setDatos] = useState({ accion: '', motivo: '', justificacion: '' })
  const [errores, setErrores] = useState({})
  const [mensaje, setMensaje] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const cambiar = (e) => {
    setDatos({ ...datos, [e.target.name]: e.target.value })
    setErrores({ ...errores, [e.target.name]: undefined })
  }

  const revisar = (e) => {
    e.preventDefault()
    const faltan = { // CA-30.3: el backend vuelve a validar
      ...(!datos.accion && { accion: 'Elige una acción' }),
      ...(!datos.motivo && { motivo: 'Elige el motivo del incumplimiento' }),
      ...(!datos.justificacion.trim() && { justificacion: 'Escribe un comentario' }),
    }
    setErrores(faltan)
    setMensaje('')
    if (!Object.keys(faltan).length) setConfirmando(true)
  }

  const aplicar = async () => {
    setEnviando(true)
    try {
      const respuesta = await api(`/moderacion/publicaciones/${publicacionId}/accion`, { metodo: 'POST', datos })
      await alTerminar(`${respuesta.mensaje}.`)
    } catch (err) {
      setErrores(err.errores ?? {})
      setMensaje(err.errores ? 'Revisa los campos marcados' : err.message)
      setConfirmando(false)
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={revisar} noValidate className="reporte-accion">
      <h2>Moderar la publicación</h2>
      <div className="fila">
        <Campo etiqueta="Acción" nombre="accion" value={datos.accion} onChange={cambiar} error={errores.accion}
          opciones={opciones} required />
        <Campo etiqueta="Motivo del incumplimiento" nombre="motivo" value={datos.motivo} onChange={cambiar}
          error={errores.motivo} opciones={MOTIVOS_INCUMPLIMIENTO} required />
      </div>
      <Campo etiqueta="Comentario" nombre="justificacion" multilinea rows={3} value={datos.justificacion}
        onChange={cambiar} error={errores.justificacion} maxLength={MAX_JUSTIFICACION} required
        ayuda={`El oferente verá este comentario. ${datos.justificacion.length}/${MAX_JUSTIFICACION} caracteres`} />
      {mensaje && <p className="alerta" role="alert">{mensaje}</p>}
      <div className="acciones">
        <button type="submit" className="boton peligro">Aplicar acción</button>
      </div>
      <Confirmar abierto={confirmando} ocupado={enviando}
        titulo={datos.accion === 'eliminar' ? '¿Eliminar la publicación?' : '¿Ocultar la publicación?'}
        mensaje={datos.accion === 'eliminar'
          ? 'Dejará de mostrarse, también para el oferente. Esta acción no se puede restaurar.'
          : 'Dejará de aparecer en búsquedas y listados. La podrás restaurar después.'}
        textoConfirmar="Sí, aplicar" textoOcupado="Aplicando…" onConfirmar={aplicar}
        onCancelar={() => setConfirmando(false)} />
    </form>
  )
}

// CA-30.5: «Restaurar» una publicación ocultada; también exige justificación y queda registrada
function RestaurarPublicacion({ publicacionId, alTerminar }) {
  const [justificacion, setJustificacion] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const restaurar = async (e) => {
    e.preventDefault()
    if (!justificacion.trim()) {
      setError('Escribe la justificación')
      return
    }
    setEnviando(true)
    try {
      const respuesta = await api(`/moderacion/publicaciones/${publicacionId}/restaurar`, {
        metodo: 'POST', datos: { justificacion },
      })
      await alTerminar(`${respuesta.mensaje}.`)
    } catch (err) {
      setError(err.errores?.justificacion ?? err.message)
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={restaurar} noValidate className="reporte-accion">
      <h2>Restaurar la publicación</h2>
      <Campo etiqueta="Justificación" nombre="justificacion" id="restaurar-justificacion" multilinea rows={2}
        value={justificacion} onChange={(e) => { setJustificacion(e.target.value); setError('') }}
        error={error} maxLength={MAX_JUSTIFICACION} required />
      <div className="acciones">
        <button type="submit" className="boton" disabled={enviando}>
          {enviando ? 'Restaurando…' : 'Restaurar'}
        </button>
      </div>
    </form>
  )
}

// HU-29 y HU-30: la publicación como la ve un estudiante, su moderación y su historial
export default function DetallePublicacionAdmin() {
  const { id } = useParams()
  const { state } = useLocation()
  const volver = state?.volver ?? '/admin/publicaciones'
  // Se guarda junto con el id: al pasar a otra publicación, lo anterior deja de mostrarse
  const [cargado, setCargado] = useState({ id: null, datos: null, error: '' })
  const [aviso, setAviso] = useState({ id: null, texto: '' })

  const cargar = useCallback(
    () =>
      api(`/moderacion/publicaciones/${id}`)
        .then((datos) => setCargado({ id, datos, error: '' }))
        .catch((err) => setCargado({ id, datos: null, error: err.message })),
    [id],
  )

  useEffect(() => {
    cargar()
  }, [cargar])

  const { datos, error } = cargado.id === id ? cargado : { datos: null, error: '' }

  if (error) {
    return (
      <main className="tarjeta">
        <h1>{error}</h1>
        <Link to={volver} className="boton">Volver a las publicaciones</Link>
      </main>
    )
  }
  if (!datos) return <p className="cargando">Cargando publicación…</p>

  const alTerminar = async (texto) => {
    await cargar()
    setAviso({ id, texto })
  }

  const { publicacion: pub, reportes, acciones } = datos
  const { oferente } = pub
  const eliminada = pub.estado === 'eliminada'
  const oculta = pub.estado === 'suspendida'

  return (
    <main className="admin-publicacion">
      <Link to={volver} className="volver">← Volver a las publicaciones</Link>

      {aviso.id === id && aviso.texto && <p className="exito" role="status">{aviso.texto}</p>}
      {pub.estado !== 'activa' && (
        <p className="alerta">
          Estado: {textoPublicacion(pub.estado)}
          {eliminada && datos.eliminada_por && ` por el ${datos.eliminada_por}`}.
          {' '}Los estudiantes no ven esta publicación.
        </p>
      )}
      {datos.oculta_por_cuenta && (
        <p className="info">
          Se ocultó porque la cuenta del oferente está suspendida. Vuelve a mostrarse al reactivar la cuenta.
        </p>
      )}

      <FichaPublicacion key={pub.id} pub={pub}>
        {oferente && (
          <Link to={`/admin/usuarios/${oferente.id}`} className="detalle-oferente">
            <Avatar nombre={oferente.nombre} apellido={oferente.ap_paterno} foto={oferente.foto_url} tamano={44} />
            <span>
              <strong>{oferente.nombre} {oferente.ap_paterno} <InsigniaVerificacion verificado={oferente.verificado} /></strong>
              <small>Ver ficha del oferente</small>
            </span>
          </Link>
        )}
      </FichaPublicacion>

      {!eliminada && (
        <section className="tarjeta admin-moderacion" aria-label="Moderación">
          <FormularioModeracion key={pub.estado} publicacionId={pub.id} estado={pub.estado} alTerminar={alTerminar} />
          {oculta && !datos.oculta_por_cuenta && <RestaurarPublicacion publicacionId={pub.id} alTerminar={alTerminar} />}
        </section>
      )}

      <section className="tarjeta admin-moderacion" aria-labelledby="titulo-reportes">
        <h2 id="titulo-reportes">Reportes ({datos.cantidad_reportes})</h2>
        {reportes.length === 0 ? (
          <p className="revision-sub">Esta publicación no tiene reportes.</p>
        ) : (
          <ul className="reporte-otros">
            {reportes.map((r) => (
              <li key={r.id}>
                <Link to={`/admin/reportes/${r.id}`}>N.º {r.codigo}</Link>
                <span>{textoMotivo(r.motivo)}</span>
                <span className={`etiqueta-estado ${r.estado}`}>{textoEstadoReporte(r.estado)}</span>
                <time dateTime={r.fecha_reporte}>{fechaCorta.format(new Date(r.fecha_reporte))}</time>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="tarjeta admin-moderacion" aria-labelledby="titulo-acciones">
        <h2 id="titulo-acciones">Acciones de moderación</h2>
        {acciones.length === 0 ? (
          <p className="revision-sub">No se le han aplicado acciones.</p>
        ) : (
          <ul className="reporte-otros">
            {acciones.map((a) => (
              <li key={`${a.accion}-${a.fecha_accion}`}>
                <strong>{textoAccion(a.accion)}</strong>
                {a.motivo && <span>{textoIncumplimiento(a.motivo)}</span>}
                <span>{a.justificacion}</span>
                <span>{a.admin}</span>
                <time dateTime={a.fecha_accion}>{fechaHora.format(new Date(a.fecha_accion))}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
