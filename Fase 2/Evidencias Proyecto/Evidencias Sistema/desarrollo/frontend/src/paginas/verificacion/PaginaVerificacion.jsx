import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, apiArchivo } from '../../api.js'
import Campo from '../../componentes/Campo.jsx'
import { useSesion } from '../../sesion/SesionContext.jsx'
import { COMPROBANTE_MAX_MB, COMPROBANTE_TIPOS, fechaHora, textoTipo, TIPOS_COMPROBANTE } from './datos.js'

// Situación de la verificación (CA-21.4): qué se le muestra al estudiante según el estado
function EstadoVerificacion({ verificacion, verComprobante, abriendo }) {
  const { estado, solicitud } = verificacion
  if (estado === 'no_verificado' && !solicitud) return null

  const detalle = solicitud && (
    <dl className="verificacion-detalle">
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
        Tu verificación fue revocada. Si sigues estudiando, envía un comprobante actualizado.
      </p>
    )
  }
  return null
}

// HU-21: el estudiante acredita su condición de estudiante con un comprobante
export default function PaginaVerificacion() {
  const { recargarUsuario } = useSesion()
  const [verificacion, setVerificacion] = useState(null)
  const [instituciones, setInstituciones] = useState(null)
  const [datos, setDatos] = useState({ institucion_id: '', tipo_comprobante: '' })
  const [archivo, setArchivo] = useState(null)
  const [errores, setErrores] = useState({})
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
  const [enviando, setEnviando] = useState(false)
  const [abriendo, setAbriendo] = useState(false)

  useEffect(() => {
    Promise.all([api('/verificacion'), api('/catalogos/perfil'), api('/perfil')])
      .then(([verificacionApi, catalogo, perfil]) => {
        setVerificacion(verificacionApi)
        setInstituciones(catalogo.instituciones)
        // Se propone la institución del perfil; el estudiante la puede cambiar
        setDatos((previo) => ({ ...previo, institucion_id: perfil.institucion_id ?? '' }))
      })
      .catch((err) => setMensaje({ tipo: 'alerta', texto: err.message }))
  }, [])

  if (!verificacion || !instituciones) {
    return <p className="cargando">{mensaje.texto || 'Cargando…'}</p>
  }

  const cambiar = (e) => {
    setDatos({ ...datos, [e.target.name]: e.target.value })
    setErrores({ ...errores, [e.target.name]: undefined })
  }

  const elegirArchivo = (e) => {
    const elegido = e.target.files[0] ?? null
    setArchivo(elegido)
    // Se revisa al elegirlo para avisar al tiro; el backend vuelve a validar
    let error
    if (elegido && !COMPROBANTE_TIPOS.includes(elegido.type)) error = 'El archivo debe ser PDF, JPG o PNG'
    else if (elegido && elegido.size > COMPROBANTE_MAX_MB * 1024 * 1024) {
      error = `El archivo debe pesar como máximo ${COMPROBANTE_MAX_MB} MB`
    }
    setErrores({ ...errores, comprobante: error })
  }

  const enviar = async (e) => {
    e.preventDefault()
    const faltan = {
      ...(!datos.institucion_id && { institucion_id: 'Este campo es obligatorio' }),
      ...(!datos.tipo_comprobante && { tipo_comprobante: 'Este campo es obligatorio' }),
      ...(!archivo && { comprobante: 'Adjunta tu comprobante' }),
    }
    if (Object.keys(faltan).length || errores.comprobante) {
      setErrores({ ...faltan, ...(errores.comprobante && { comprobante: errores.comprobante }) })
      setMensaje({ tipo: 'alerta', texto: 'Revisa los campos marcados' })
      return
    }

    const formulario = new FormData()
    formulario.append('institucion_id', datos.institucion_id)
    formulario.append('tipo_comprobante', datos.tipo_comprobante)
    formulario.append('comprobante', archivo)

    setEnviando(true)
    setMensaje({ tipo: '', texto: '' })
    try {
      const respuesta = await api('/verificacion', { metodo: 'POST', datos: formulario })
      setVerificacion(respuesta.verificacion)
      setArchivo(null)
      setErrores({})
      setMensaje({ tipo: 'exito', texto: `${respuesta.mensaje}.` }) // CA-21.2
      await recargarUsuario()
    } catch (err) {
      // CA-21.3: formato o tamaño no permitidos; 409 si ya hay una solicitud pendiente
      setErrores(err.errores ?? {})
      setMensaje({ tipo: 'alerta', texto: err.errores ? 'Revisa los campos marcados' : err.message })
    } finally {
      setEnviando(false)
    }
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

  const opcionesInstitucion = instituciones.map((i) => ({ valor: i.id, texto: `${i.nombre} (${i.sigla})` }))

  return (
    <main className="tarjeta pagina-form">
      <h1>Verificar mi condición de estudiante</h1>
      <p className="subtitulo">
        Los perfiles verificados generan más confianza al buscar alojamiento o roomie.
      </p>

      <EstadoVerificacion verificacion={verificacion} verComprobante={verComprobante} abriendo={abriendo} />

      {mensaje.texto && (
        <p className={mensaje.tipo} role={mensaje.tipo === 'alerta' ? 'alert' : 'status'}>{mensaje.texto}</p>
      )}

      {verificacion.puede_solicitar ? (
        <form onSubmit={enviar} noValidate>
          <fieldset>
            <legend>Tu comprobante</legend>
            <Campo etiqueta="Institución" nombre="institucion_id" value={datos.institucion_id}
              onChange={cambiar} error={errores.institucion_id} opciones={opcionesInstitucion} required />
            <Campo etiqueta="Tipo de comprobante" nombre="tipo_comprobante" value={datos.tipo_comprobante}
              onChange={cambiar} error={errores.tipo_comprobante} opciones={TIPOS_COMPROBANTE} required />
            <Campo etiqueta="Archivo" nombre="comprobante" type="file" onChange={elegirArchivo}
              error={errores.comprobante} accept={COMPROBANTE_TIPOS.join(',')} required
              ayuda={`PDF, JPG o PNG de hasta ${COMPROBANTE_MAX_MB} MB. Solo tú y los administradores pueden verlo.`} />
          </fieldset>

          <div className="acciones">
            <Link to="/perfil" className="boton secundario">Volver a mi perfil</Link>
            <button type="submit" className="boton" disabled={enviando}>
              {enviando ? 'Enviando…' : 'Enviar solicitud'}
            </button>
          </div>
        </form>
      ) : (
        <div className="acciones">
          <Link to="/perfil" className="boton secundario">Volver a mi perfil</Link>
        </div>
      )}
    </main>
  )
}
