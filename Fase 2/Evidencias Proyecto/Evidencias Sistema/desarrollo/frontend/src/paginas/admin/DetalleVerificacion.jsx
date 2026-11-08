import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api, apiArchivo } from '../../api.js'
import Avatar from '../../componentes/Avatar.jsx'
import { useAvisoBreve } from '../../componentes/AvisoBreve.jsx'
import Campo from '../../componentes/Campo.jsx'
import Confirmar from '../../componentes/Confirmar.jsx'
import { useResumenAdmin } from '../../marco/ResumenAdmin.jsx'
import { ESTADOS_SOLICITUD, fechaHora, textoSituacion, textoTipo } from '../verificacion/datos.js'
import { ChipEstado, PaginaAdmin } from './ui/componentes.jsx'
import { nombrePropio } from './ui/formato.js'

const MAX_MOTIVO = 300
const POR_REVISAR = ['pendiente', 'en_revision']

// El comprobante no tiene URL pública (CA-21.5): se descarga con la sesión y se muestra desde un Blob
function VistaComprobante({ solicitud }) {
  const [url, setUrl] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let creada
    apiArchivo(`/verificacion/solicitudes/${solicitud.id}/comprobante`)
      .then((blob) => {
        creada = URL.createObjectURL(blob)
        setUrl(creada)
      })
      .catch((err) => setError(err.message))
    return () => creada && URL.revokeObjectURL(creada)
  }, [solicitud.id])

  if (error) return <p className="alerta">{error}</p>
  if (!url) return <p className="cargando">Cargando comprobante…</p>
  return (
    <>
      {solicitud.archivo_formato === 'pdf' ? (
        <iframe className="comprobante-vista" src={url} title={`Comprobante: ${solicitud.archivo_nombre}`} />
      ) : (
        <img className="comprobante-vista" src={url} alt={`Comprobante: ${solicitud.archivo_nombre}`} />
      )}
      <a href={url} target="_blank" rel="noreferrer" className="comprobante-abrir">
        Abrir {solicitud.archivo_nombre} en otra pestaña
      </a>
    </>
  )
}

function Dato({ etiqueta, children }) {
  return (
    <>
      <dt>{etiqueta}</dt>
      <dd>{children ?? <em>Sin indicar</em>}</dd>
    </>
  )
}

// HU-22: el administrador revisa una solicitud y la aprueba o la rechaza con un motivo
export default function DetalleVerificacion() {
  const { id } = useParams()
  const { state } = useLocation()
  const volver = state?.vista === 'procesadas' ? '/admin/verificaciones?vista=procesadas' : '/admin/verificaciones'
  const [solicitud, setSolicitud] = useState(null)
  const [rechazando, setRechazando] = useState(false)
  const [revocando, setRevocando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [errorMotivo, setErrorMotivo] = useState('')
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
  const [enviando, setEnviando] = useState(false)
  const [confirmandoAprobar, setConfirmandoAprobar] = useState(false)
  const { avisar } = useAvisoBreve()
  const { recargarResumen } = useResumenAdmin()

  const cargar = useCallback(
    () =>
      api(`/verificacion/solicitudes/${id}`)
        .then(setSolicitud)
        .catch((err) => setMensaje({ tipo: 'alerta', texto: err.message })),
    [id],
  )

  useEffect(() => {
    cargar()
  }, [cargar])

  if (!solicitud) {
    return <PaginaAdmin className="a-detalle"><div className="a-panel"><p className="cargando">{mensaje.texto || 'Cargando…'}</p></div></PaginaAdmin>
  }

  const resolver = async (ruta, datos) => {
    setEnviando(true)
    setMensaje({ tipo: '', texto: '' })
    try {
      const respuesta = await api(ruta, { metodo: 'POST', datos })
      setMensaje({ tipo: 'exito', texto: `${respuesta.mensaje}.` })
      avisar(respuesta.mensaje)
      recargarResumen() // los contadores de la barra lateral bajan al instante
      setRechazando(false)
      setRevocando(false)
      setConfirmandoAprobar(false)
      setMotivo('')
    } catch (err) {
      // CA-22.3: sin motivo no se rechaza. CA-22.4: 409 si otro administrador ya la procesó
      if (err.errores?.motivo) setErrorMotivo(err.errores.motivo)
      setMensaje({ tipo: 'alerta', texto: err.errores ? 'Revisa el motivo' : err.message })
    } finally {
      setEnviando(false)
      await cargar()
    }
  }

  // Rechazar (CA-22.3) y revocar (CA-23.4) piden un motivo, que el estudiante verá
  const conMotivo = (ruta, faltante) => (e) => {
    e.preventDefault()
    if (!motivo.trim()) {
      setErrorMotivo(faltante)
      return
    }
    resolver(ruta, { motivo: motivo.trim() })
  }
  const rechazar = conMotivo(`/verificacion/solicitudes/${id}/rechazar`, 'Escribe el motivo del rechazo')
  const revocar = conMotivo(`/verificacion/usuarios/${solicitud.solicitante.id}/revocar`,
    'Escribe el motivo de la revocación')

  const { solicitante: estudiante } = solicitud
  const porRevisar = POR_REVISAR.includes(solicitud.estado)
  const otraInstitucion = estudiante.institucion_nombre && estudiante.institucion_nombre !== solicitud.institucion_nombre

  return (
    <PaginaAdmin className="a-detalle">
      <div className="a-panel">
      <Link to={volver} className="a-volver">← Volver a las solicitudes</Link>
      <h1>Solicitud N.º {solicitud.codigo}</h1>
      <p className="a-detalle-cabeza">
        <ChipEstado tipo="solicitud" valor={solicitud.estado}>{ESTADOS_SOLICITUD[solicitud.estado] ?? solicitud.estado}</ChipEstado>
        <span>Enviada el {fechaHora.format(new Date(solicitud.fecha_solicitud))}</span>
      </p>

      {mensaje.texto && (
        <p className={mensaje.tipo} role={mensaje.tipo === 'alerta' ? 'alert' : 'status'}>{mensaje.texto}</p>
      )}

      <div className="revision">
        <section className="revision-comprobante" aria-labelledby="titulo-comprobante">
          <h2 id="titulo-comprobante">Comprobante</h2>
          <p className="revision-sub">
            {textoSituacion(solicitud.situacion)} · {textoTipo(solicitud.tipo_comprobante)} · {solicitud.institucion_nombre}
          </p>
          <VistaComprobante solicitud={solicitud} />
        </section>

        <section className="revision-perfil" aria-labelledby="titulo-perfil">
          <h2 id="titulo-perfil">Datos del perfil</h2>
          <div className="revision-persona">
            <Avatar nombre={estudiante.nombre} apellido={estudiante.ap_paterno} foto={estudiante.foto_url} tamano={48} />
            <div>
              <strong>{nombrePropio(estudiante.nombre_completo)}</strong>
              <Link to={`/admin/usuarios/${estudiante.id}`} className="admin-tabla-sub">Ver ficha del usuario</Link>
            </div>
          </div>
          <dl className="verificacion-detalle">
            <Dato etiqueta="RUT">{estudiante.rut}</Dato>
            <Dato etiqueta="Correo">{estudiante.correo}</Dato>
            <Dato etiqueta="Teléfono">{estudiante.telefono}</Dato>
            <Dato etiqueta="Nacimiento">
              {estudiante.fecha_nac && new Date(`${estudiante.fecha_nac}T12:00`).toLocaleDateString('es-CL')}
            </Dato>
            <Dato etiqueta="Institución">{estudiante.institucion_nombre}</Dato>
            <Dato etiqueta="Sede">{estudiante.sede}</Dato>
            <Dato etiqueta="Carrera">{estudiante.carrera}</Dato>
            <Dato etiqueta="Año de ingreso">{estudiante.anio_ingreso}</Dato>
            <Dato etiqueta="En RoomMatch desde">
              {new Date(estudiante.fecha_registro).toLocaleDateString('es-CL')}
            </Dato>
          </dl>
          {otraInstitucion && (
            <p className="info">
              Ojo: en la solicitud indicó <strong>{solicitud.institucion_nombre}</strong>, pero en su perfil
              dice <strong>{estudiante.institucion_nombre}</strong>.
            </p>
          )}
        </section>
      </div>

      {porRevisar ? (
        <section className="a-decision" aria-labelledby="titulo-decision">
          <h2 id="titulo-decision">Tu decisión</h2>
          {rechazando ? (
            <form onSubmit={rechazar} noValidate>
              <Campo etiqueta="Motivo del rechazo" nombre="motivo" multilinea rows={3} value={motivo}
                onChange={(e) => { setMotivo(e.target.value); setErrorMotivo('') }}
                error={errorMotivo} maxLength={MAX_MOTIVO} required autoFocus
                ayuda={`El estudiante verá este motivo y podrá enviar otro documento. ${motivo.length}/${MAX_MOTIVO} caracteres`} />
              <div className="a-decision-acciones">
                <button type="button" className="a-boton" onClick={() => setRechazando(false)} disabled={enviando}>
                  Cancelar
                </button>
                <button type="submit" className="a-boton peligro" disabled={enviando}>
                  {enviando ? 'Rechazando…' : 'Confirmar rechazo'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <p>
                Compara el comprobante con los datos del perfil. Al aprobar, su perfil mostrará la insignia de
                verificado; al rechazar, deberás escribir el motivo.
              </p>
              <div className="a-decision-acciones">
                <button type="button" className="a-boton peligro" onClick={() => setRechazando(true)} disabled={enviando}>
                  Rechazar
                </button>
                <button type="button" className="a-boton aprobar" onClick={() => setConfirmandoAprobar(true)} disabled={enviando}>
                  Aprobar verificación
                </button>
              </div>
            </>
          )}
          {/* Aprobar también se confirma: la insignia se ve de inmediato en su perfil */}
          <Confirmar abierto={confirmandoAprobar} titulo="¿Aprobar esta verificación?" ocupado={enviando}
            mensaje={`${nombrePropio(estudiante.nombre_completo)} quedará verificado y su perfil mostrará la insignia.`}
            textoConfirmar="Sí, aprobar" textoOcupado="Aprobando…" tono=""
            onConfirmar={() => resolver(`/verificacion/solicitudes/${id}/aprobar`)} onCancelar={() => setConfirmandoAprobar(false)} />
        </section>
      ) : (
        // CA-22.4: ya resuelta, queda solo como historial
        <section className="a-decision" aria-labelledby="titulo-resultado">
          <h2 id="titulo-resultado">Resultado</h2>
          <dl className="verificacion-detalle">
            <Dato etiqueta="Resultado">{ESTADOS_SOLICITUD[solicitud.estado] ?? solicitud.estado}</Dato>
            <Dato etiqueta="Revisada el">
              {solicitud.fecha_revision && fechaHora.format(new Date(solicitud.fecha_revision))}
            </Dato>
            <Dato etiqueta="Revisada por">{solicitud.admin_revisor}</Dato>
            {solicitud.motivo_rechazo && <Dato etiqueta="Motivo">{solicitud.motivo_rechazo}</Dato>}
            {solicitud.estado === 'aprobada' && (
              <Dato etiqueta="Verificación hoy">
                {estudiante.verificacion_estado === 'verificado' ? 'Vigente' : 'Ya no está vigente'}
              </Dato>
            )}
          </dl>

          {/* CA-23.4: solo se revoca una verificación vigente */}
          {solicitud.estado === 'aprobada' && estudiante.verificacion_estado === 'verificado' && (
            revocando ? (
              <form onSubmit={revocar} noValidate className="revision-revocar">
                <Campo etiqueta="Motivo de la revocación" nombre="motivo" multilinea rows={3} value={motivo}
                  onChange={(e) => { setMotivo(e.target.value); setErrorMotivo('') }}
                  error={errorMotivo} maxLength={MAX_MOTIVO} required autoFocus
                  ayuda={`La insignia dejará de aparecer en su perfil. ${motivo.length}/${MAX_MOTIVO} caracteres`} />
                <div className="a-decision-acciones">
                  <button type="button" className="a-boton" onClick={() => setRevocando(false)} disabled={enviando}>
                    Cancelar
                  </button>
                  <button type="submit" className="a-boton peligro" disabled={enviando}>
                    {enviando ? 'Revocando…' : 'Confirmar revocación'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="a-decision-acciones">
                <button type="button" className="a-boton peligro" onClick={() => setRevocando(true)}>
                  Revocar verificación
                </button>
              </div>
            )
          )}
        </section>
      )}
    </div>
    </PaginaAdmin>
  )
}
