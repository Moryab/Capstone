import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api } from '../../api.js'
import { formatearPesos } from '../../publicaciones.js'
import { textoEstadoReporte, textoMotivo, textoTipoReporte } from '../../reportes.js'
import { fechaCorta, fechaHora } from '../verificacion/datos.js'
import './reportes.css'

function Dato({ etiqueta, children }) {
  return (
    <>
      <dt>{etiqueta}</dt>
      <dd>{children ?? <em>Sin indicar</em>}</dd>
    </>
  )
}

// Resumen de lo reportado, con acceso directo a su ficha de administración (HU-28 y HU-29)
function ElementoReportado({ tipo, elemento }) {
  if (!elemento) return <p className="alerta">Este elemento ya no existe.</p>
  if (tipo === 'usuario') {
    return (
      <>
        <dl className="verificacion-detalle">
          <Dato etiqueta="Nombre">{elemento.titulo}</Dato>
          <Dato etiqueta="Correo">{elemento.correo}</Dato>
          <Dato etiqueta="Cuenta">{elemento.estado}</Dato>
          <Dato etiqueta="Verificación">{elemento.verificacion_estado?.replace('_', ' ')}</Dato>
        </dl>
        <Link to={`/admin/usuarios/${elemento.id}`} className="reporte-enlace">Ver perfil reportado</Link>
      </>
    )
  }
  return (
    <>
      <dl className="verificacion-detalle">
        <Dato etiqueta="Título">{elemento.titulo}</Dato>
        <Dato etiqueta="Oferente">{elemento.oferente?.nombre}</Dato>
        <Dato etiqueta="Comuna">{elemento.comuna}</Dato>
        <Dato etiqueta="Costo mensual">{formatearPesos(elemento.costo_mensual)}</Dato>
        <Dato etiqueta="Estado">{elemento.estado}</Dato>
      </dl>
      <Link to={`/admin/publicaciones/${elemento.id}`} className="reporte-enlace">Ver publicación reportada</Link>
    </>
  )
}

// HU-26: detalle de un reporte y «Tomar para revisión». Las acciones sobre lo reportado son de la HU-27
export default function DetalleReporte() {
  const { id } = useParams()
  const { state } = useLocation()
  const volver = state?.volver ?? '/admin/reportes'
  // Se guarda junto con el id: al pasar a otro reporte, lo anterior deja de mostrarse
  const [cargado, setCargado] = useState({ id: null, reporte: null, error: '' })
  const [mensaje, setMensaje] = useState({ id: null, tipo: '', texto: '' })
  const [tomando, setTomando] = useState(false)

  const cargar = useCallback(
    () =>
      api(`/reportes/${id}`)
        .then((reporte) => setCargado({ id, reporte, error: '' }))
        .catch((err) => setCargado({ id, reporte: null, error: err.message })),
    [id],
  )

  useEffect(() => {
    cargar()
  }, [cargar])

  const { reporte, error } = cargado.id === id ? cargado : { reporte: null, error: '' }

  if (error) {
    return (
      <main className="tarjeta">
        <h1>{error}</h1>
        <Link to={volver} className="boton">Volver a los reportes</Link>
      </main>
    )
  }
  if (!reporte) return <p className="cargando">Cargando…</p>

  const tomar = async () => {
    setTomando(true)
    setMensaje({ id, tipo: '', texto: '' })
    try {
      const respuesta = await api(`/reportes/${id}/tomar`, { metodo: 'POST' })
      setMensaje({ id, tipo: 'exito', texto: `${respuesta.mensaje}.` })
    } catch (err) {
      // 409 si otro administrador lo tomó primero: al recargar se ve quién
      setMensaje({ id, tipo: 'alerta', texto: err.message })
    } finally {
      setTomando(false)
      await cargar()
    }
  }

  return (
    <main className="tarjeta pagina-admin">
      <Link to={volver} className="admin-volver">← Volver a los reportes</Link>
      <h1>Reporte N.º {reporte.codigo}</h1>
      <p className="subtitulo">
        {textoTipoReporte(reporte.tipo_elemento)} · {fechaHora.format(new Date(reporte.fecha_reporte))} ·{' '}
        <span className={`etiqueta-estado ${reporte.estado}`}>{textoEstadoReporte(reporte.estado)}</span>
      </p>

      {mensaje.id === id && mensaje.texto && (
        <p className={mensaje.tipo} role={mensaje.tipo === 'alerta' ? 'alert' : 'status'}>{mensaje.texto}</p>
      )}

      <div className="reporte-detalle">
        <section aria-labelledby="titulo-reporte">
          <h2 id="titulo-reporte">Reporte</h2>
          <dl className="verificacion-detalle">
            <Dato etiqueta="Motivo">{textoMotivo(reporte.motivo)}</Dato>
            <Dato etiqueta="Reportó">
              {reporte.reportante && <>{reporte.reportante.nombre} ({reporte.reportante.correo})</>}
            </Dato>
            <Dato etiqueta="Descripción">
              {reporte.descripcion && <span className="reporte-descripcion">{reporte.descripcion}</span>}
            </Dato>
            {reporte.admin_revisor && (
              <Dato etiqueta="Revisa">
                {reporte.admin_revisor.nombre}
                {reporte.fecha_toma_revision && ` · ${fechaHora.format(new Date(reporte.fecha_toma_revision))}`}
              </Dato>
            )}
          </dl>
        </section>

        <section aria-labelledby="titulo-reportado">
          <h2 id="titulo-reportado">{reporte.tipo_elemento === 'usuario' ? 'Perfil reportado' : 'Publicación reportada'}</h2>
          <ElementoReportado tipo={reporte.tipo_elemento} elemento={reporte.elemento} />
        </section>
      </div>

      <section aria-labelledby="titulo-otros">
        <h2 id="titulo-otros">Otros reportes del mismo elemento</h2>
        {reporte.otros_reportes.length === 0 ? (
          <p className="revision-sub">No tiene otros reportes.</p>
        ) : (
          <ul className="reporte-otros">
            {reporte.otros_reportes.map((o) => (
              <li key={o.id}>
                <Link to={`/admin/reportes/${o.id}`} state={{ volver }}>N.º {o.codigo}</Link>
                <span>{textoMotivo(o.motivo)}</span>
                <span className={`etiqueta-estado ${o.estado}`}>{textoEstadoReporte(o.estado)}</span>
                <time dateTime={o.fecha_reporte}>{fechaCorta.format(new Date(o.fecha_reporte))}</time>
              </li>
            ))}
          </ul>
        )}
      </section>

      {reporte.estado === 'pendiente' && (
        <div className="acciones">
          <button type="button" className="boton" onClick={tomar} disabled={tomando}>
            {tomando ? 'Tomando…' : 'Tomar para revisión'}
          </button>
        </div>
      )}
    </main>
  )
}
