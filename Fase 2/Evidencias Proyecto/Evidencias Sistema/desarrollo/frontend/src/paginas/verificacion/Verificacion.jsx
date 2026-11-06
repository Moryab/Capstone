import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, apiArchivo } from '../../api.js'
import { useSesion } from '../../sesion/SesionContext.jsx'
import { fechaHora, textoSituacion, textoTipo } from './datos.js'
import FormComprobante from './FormComprobante.jsx'

// Situación de la verificación (CA-21.4): qué se le muestra al estudiante según el estado
function EstadoVerificacion({ verificacion, verComprobante, abriendo }) {
  const { estado, solicitud } = verificacion
  if (estado === 'no_verificado' && !solicitud) return null

  const detalle = solicitud && (
    <dl className="verificacion-detalle">
      <dt>Situación</dt>
      <dd>{textoSituacion(solicitud.situacion)}</dd>
      <dt>Institución</dt>
      <dd>{solicitud.institucion_nombre ?? 'Sin indicar'}</dd>
      <dt>Comprobante</dt>
      <dd>
        {textoTipo(solicitud.tipo_comprobante)} ·{' '}
        <button type="button" className="enlace-boton" onClick={verComprobante} disabled={abriendo}>
          {abriendo ? 'Abriendo…' : solicitud.archivo_nombre}
        </button>
      </dd>
      <dt>Enviada el</dt>
      <dd>{fechaHora.format(new Date(solicitud.fecha_solicitud))}</dd>
    </dl>
  )

  if (estado === 'verificado') {
    return (
      <section className="verificacion-estado">
        <p className="exito">Tu condición de estudiante está verificada.</p>
        {detalle}
      </section>
    )
  }
  if (estado === 'pendiente') {
    return (
      <section className="verificacion-estado">
        <p className="info" role="status">
          Tu solicitud está <strong>pendiente de validación</strong>. Un administrador revisará tu
          comprobante; mientras tanto no puedes enviar otro.
        </p>
        {detalle}
      </section>
    )
  }
  if (estado === 'rechazado') {
    return (
      <section className="verificacion-estado">
        <p className="alerta">
          Tu solicitud fue rechazada.
          {solicitud?.motivo_rechazo && <> Motivo: <strong>{solicitud.motivo_rechazo}</strong>.</>}
          {' '}Puedes enviar una nueva solicitud con otro comprobante.
        </p>
        {detalle}
      </section>
    )
  }
  if (estado === 'revocado') {
    return (
      <p className="alerta">
        Un administrador revocó tu verificación.
        {verificacion.motivo_revocacion && <> Motivo: <strong>{verificacion.motivo_revocacion}</strong>.</>}
        {' '}Si sigues estudiando, envía un comprobante actualizado.
      </p>
    )
  }
  return null
}

// HU-21: el estudiante acredita su condición de estudiante con un comprobante. Aquí ve el estado de
// su solicitud y, si fue rechazada o revocada, envía otra. El primer envío es un paso obligatorio del
// registro (PasoVerificacion)
export default function Verificacion() {
  const { recargarUsuario } = useSesion()
  const [verificacion, setVerificacion] = useState(null)
  const [instituciones, setInstituciones] = useState(null)
  const [institucionPerfil, setInstitucionPerfil] = useState('')
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
  const [abriendo, setAbriendo] = useState(false)

  useEffect(() => {
    Promise.all([api('/verificacion'), api('/catalogos/perfil'), api('/perfil')])
      .then(([verificacionApi, catalogo, perfil]) => {
        setVerificacion(verificacionApi)
        setInstituciones(catalogo.instituciones)
        // Se propone la institución del perfil; el estudiante la puede cambiar
        setInstitucionPerfil(perfil.institucion_id ?? '')
      })
      .catch((err) => setMensaje({ tipo: 'alerta', texto: err.message }))
  }, [])

  if (!verificacion || !instituciones) {
    return <p className="cargando">{mensaje.texto || 'Cargando…'}</p>
  }

  const alEnviar = async (respuesta) => {
    setVerificacion(respuesta.verificacion)
    setMensaje({ tipo: 'exito', texto: `${respuesta.mensaje}.` }) // CA-21.2
    await recargarUsuario()
  }

  // CA-21.5: el comprobante no tiene URL pública; se descarga con la sesión y se abre en otra pestaña.
  // La pestaña se abre antes de esperar la descarga para que el navegador no la bloquee
  const verComprobante = async () => {
    const ventana = window.open('', '_blank')
    setAbriendo(true)
    try {
      const blob = await apiArchivo(`/verificacion/solicitudes/${verificacion.solicitud.id}/comprobante`)
      const url = URL.createObjectURL(blob)
      if (ventana) ventana.location.href = url
      else window.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      ventana?.close()
      setMensaje({ tipo: 'alerta', texto: err.message })
    } finally {
      setAbriendo(false)
    }
  }

  const volver = <Link to="/perfil" className="boton secundario">Volver a mi perfil</Link>

  return (
    <main className="tarjeta pagina-form">
      <h1>Verificar mi condición de estudiante</h1>
      <p className="subtitulo">
        RoomMatch es exclusiva para estudiantes: con tu cuenta verificada puedes usar todas sus funciones.
      </p>

      <EstadoVerificacion verificacion={verificacion} verComprobante={verComprobante} abriendo={abriendo} />

      {mensaje.texto && (
        <p className={mensaje.tipo} role={mensaje.tipo === 'alerta' ? 'alert' : 'status'}>{mensaje.texto}</p>
      )}

      {verificacion.puede_solicitar ? (
        <FormComprobante instituciones={instituciones} institucionInicial={institucionPerfil} alEnviar={alEnviar}
          acciones={volver} />
      ) : (
        <div className="acciones">{volver}</div>
      )}
    </main>
  )
}
