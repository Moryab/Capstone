import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api } from '../../api.js'
import Campo from '../../componentes/Campo.jsx'
import Confirmar from '../../componentes/Confirmar.jsx'
import { formatearPesos } from '../../publicaciones.js'
import {
  ACCIONES_PERFIL, ACCIONES_PUBLICACION, MAX_JUSTIFICACION, textoAccion, textoEstadoReporte, textoMotivo,
  textoTipoReporte,
} from '../../reportes.js'
import { fechaCorta, fechaHora } from '../verificacion/datos.js'
import ReactivarCuenta from './ReactivarCuenta.jsx'
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

// HU-27: elige la acción y la justifica. Se confirma aparte porque algunas no se pueden deshacer
function FormularioAccion({ reporte, alTerminar }) {
  const opciones = reporte.tipo_elemento === 'usuario' ? ACCIONES_PERFIL : ACCIONES_PUBLICACION
  const [datos, setDatos] = useState({ accion: '', justificacion: '' })
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
    const faltan = { // CA-27.3: el backend vuelve a validar
      ...(!datos.accion && { accion: 'Elige una acción' }),
      ...(!datos.justificacion.trim() && { justificacion: 'Escribe la justificación' }),
    }
    setErrores(faltan)
    setMensaje('')
    if (!Object.keys(faltan).length) setConfirmando(true)
  }

  const aplicar = async () => {
    setEnviando(true)
    try {
      const respuesta = await api(`/moderacion/reportes/${reporte.id}/accion`, { metodo: 'POST', datos })
      await alTerminar(`${respuesta.mensaje}.`)
    } catch (err) {
      setErrores(err.errores ?? {})
      setMensaje(err.errores ? 'Revisa los campos marcados' : err.message)
      setConfirmando(false)
      setEnviando(false)
    }
  }

  const elegida = opciones.find((o) => o.valor === datos.accion)?.texto
  return (
    <form onSubmit={revisar} noValidate className="reporte-accion">
      <h2>Acción sobre el reporte</h2>
      <Campo etiqueta="Acción" nombre="accion" value={datos.accion} onChange={cambiar} error={errores.accion}
        opciones={opciones} required />
      <Campo etiqueta="Justificación" nombre="justificacion" multilinea rows={3} value={datos.justificacion}
        onChange={cambiar} error={errores.justificacion} maxLength={MAX_JUSTIFICACION} required
        ayuda={`La persona afectada verá este motivo. ${datos.justificacion.length}/${MAX_JUSTIFICACION} caracteres`} />
      {mensaje && <p className="alerta" role="alert">{mensaje}</p>}
      <div className="acciones">
        <button type="submit" className="boton peligro">Aplicar acción</button>
      </div>
      <Confirmar abierto={confirmando} titulo={`¿${elegida}?`} ocupado={enviando}
        mensaje="La acción quedará registrada con tu nombre y el reporte pasará a «resuelto»."
        textoConfirmar="Sí, aplicar" textoOcupado="Aplicando…" onConfirmar={aplicar}
        onCancelar={() => setConfirmando(false)} />
    </form>
  )
}

// HU-26 y HU-27: detalle de un reporte, «Tomar para revisión» y las acciones sobre lo reportado
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

  const alTerminar = async (texto) => {
    await cargar()
    setMensaje({ id, tipo: 'exito', texto })
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

      {reporte.estado === 'en_revision' && <FormularioAccion reporte={reporte} alTerminar={alTerminar} />}

      {reporte.accion && (
        <section aria-labelledby="titulo-resultado" className="reporte-accion">
          <h2 id="titulo-resultado">Resultado</h2>
          <dl className="verificacion-detalle">
            <Dato etiqueta="Acción">{textoAccion(reporte.accion.accion)}</Dato>
            <Dato etiqueta="Justificación">{reporte.accion.justificacion}</Dato>
            <Dato etiqueta="Aplicada por">{reporte.accion.admin?.nombre}</Dato>
            <Dato etiqueta="Fecha">{fechaHora.format(new Date(reporte.accion.fecha_accion))}</Dato>
          </dl>
        </section>
      )}

      {reporte.resolucion === 'cuenta_suspendida' && reporte.elemento?.estado === 'suspendida' && (
        <ReactivarCuenta usuarioId={reporte.elemento.id} alTerminar={alTerminar} />
      )}
    </main>
  )
}
