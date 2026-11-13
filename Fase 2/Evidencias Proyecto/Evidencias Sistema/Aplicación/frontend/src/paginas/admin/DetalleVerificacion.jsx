import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api, apiArchivo } from '../../api.js'
import Avatar from '../../componentes/Avatar.jsx'
import { useAvisoBreve } from '../../componentes/AvisoBreve.jsx'
import Confirmar from '../../componentes/Confirmar.jsx'
import { useResumenAdmin } from '../../marco/ResumenAdmin.jsx'
import { ESTADOS_SOLICITUD, textoSituacion, textoTipo } from '../verificacion/datos.js'
import IlustracionVerificacion from './IlustracionVerificacion.jsx'
import RestaurarVerificacion from './RestaurarVerificacion.jsx'
import './detalleModeracion.css'
import { ChipEstado, PaginaAdmin } from './ui/componentes.jsx'
import { nombrePropio } from './ui/formato.js'

const MAX_MOTIVO = 300
const POR_REVISAR = ['pendiente', 'en_revision']
const fechaHoraCorta = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const fechaDia = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
const fecha = (iso) => fechaHoraCorta.format(new Date(iso))
const ESTADOS_CUENTA_VERIFICACION = {
  verificado: 'Verificación vigente', pendiente: 'Verificación en revisión', rechazado: 'Verificación rechazada',
  revocado: 'Verificación revocada', no_verificado: 'Sin verificar',
}

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

  return (
    <section className="md-tarjeta dv-comprobante" aria-labelledby="dv-titulo-comprobante">
      <div className="dv-comprobante-cabeza">
        <div>
          <p className="md-rotulo" id="dv-titulo-comprobante">Comprobante</p>
          <p className="dv-comprobante-tipo">{textoTipo(solicitud.tipo_comprobante)}</p>
          <p className="md-persona-meta">{solicitud.institucion_nombre} · {textoSituacion(solicitud.situacion)}</p>
        </div>
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="md-enlace" title={solicitud.archivo_nombre}>
            Abrir en otra pestaña
          </a>
        )}
      </div>
      <div className="dv-visor" aria-busy={!url && !error}>
        {error ? <p className="alerta">{error}</p>
          : !url ? <p className="cargando">Cargando comprobante…</p>
            : solicitud.archivo_formato === 'pdf'
              ? <iframe src={url} title={`Comprobante: ${solicitud.archivo_nombre}`} />
              : <img src={url} alt={`Comprobante: ${solicitud.archivo_nombre}`} />}
      </div>
      <p className="dv-archivo">{solicitud.archivo_nombre}</p>
    </section>
  )
}

// Los datos del perfil, para compararlos con el comprobante. Lo que no calza se marca
function DatosPerfil({ solicitud }) {
  const e = solicitud.solicitante
  const otraInstitucion = e.institucion_nombre && e.institucion_nombre !== solicitud.institucion_nombre
  const filas = [
    ['RUT', e.rut],
    ['Correo', e.correo],
    ['Teléfono', e.telefono],
    ['Nacimiento', e.fecha_nac && new Date(`${e.fecha_nac}T12:00`).toLocaleDateString('es-CL')],
    ['Institución', e.institucion_nombre, otraInstitucion],
    ['Sede', e.sede],
    ['Carrera', e.carrera],
    ['Año de ingreso', e.anio_ingreso],
    ['En RoomMatch desde', e.fecha_registro && fechaDia.format(new Date(e.fecha_registro))],
  ]
  return (
    <section className="md-tarjeta" aria-labelledby="dv-titulo-perfil">
      <p className="md-rotulo" id="dv-titulo-perfil">Datos del perfil</p>
      <div className="md-persona">
        <Avatar nombre={nombrePropio(e.nombre)} apellido={nombrePropio(e.ap_paterno ?? '')} foto={e.foto_url} tamano={60} />
        <div className="md-persona-datos">
          <p className="md-persona-nombre">{nombrePropio(e.nombre_completo)}</p>
          <p className="md-persona-meta">{ESTADOS_CUENTA_VERIFICACION[e.verificacion_estado] ?? e.verificacion_estado}</p>
        </div>
      </div>
      <dl className="dv-filas">
        {filas.map(([etiqueta, valor, alerta]) => (
          <div key={etiqueta} data-alerta={alerta || undefined}>
            <dt>{etiqueta}</dt>
            <dd>{valor ?? <em>Sin indicar</em>}</dd>
          </div>
        ))}
      </dl>
      {otraInstitucion && (
        <p className="dv-alerta" role="note">
          En la solicitud indicó <strong>{solicitud.institucion_nombre}</strong>, pero su perfil dice{' '}
          <strong>{e.institucion_nombre}</strong>.
        </p>
      )}
      <div className="md-enlaces">
        <Link to={`/admin/usuarios/${e.id}`} className="md-enlace">Abrir ficha en Usuarios</Link>
      </div>
    </section>
  )
}

// HU-22: aprobar o rechazar (con motivo). Cada opción dice qué pasa y a quién se le avisa
function Decision({ solicitud, enviando, alResolver }) {
  const e = solicitud.solicitante
  const n = nombrePropio(e.nombre)
  const [accion, setAccion] = useState('')
  const [motivo, setMotivo] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const opciones = [
    { valor: 'aprobar', texto: 'Aprobar verificación', boton: 'Aprobar verificación', tono: 'ok',
      efecto: 'Su perfil muestra la insignia de estudiante verificado y tiene acceso completo: roomies, propuestas y mensajes.',
      aviso: `${n}: su cuenta queda verificada.` },
    { valor: 'rechazar', texto: 'Rechazar la solicitud', boton: 'Rechazar solicitud', tono: 'error',
      efecto: 'Le explicas el motivo y podrá enviar otro comprobante.',
      aviso: `${n}: recibe el motivo y puede enviar una nueva solicitud.` },
  ]
  const elegida = opciones.find((o) => o.valor === accion)
  const listo = accion === 'aprobar' || (accion === 'rechazar' && motivo.trim())

  const enviar = (ev) => {
    ev.preventDefault()
    if (!listo) return
    if (accion === 'aprobar') setConfirmando(true)
    else alResolver(`/verificacion/solicitudes/${solicitud.id}/rechazar`, { motivo: motivo.trim() })
  }

  return (
    <form className="md-tarjeta md-decision" noValidate aria-labelledby="dv-titulo-decision" onSubmit={enviar}>
      <h2 id="dv-titulo-decision">Tu decisión</h2>
      <p className="md-decision-ayuda">Compara el comprobante con los datos del perfil antes de decidir.</p>

      <ul className="dv-revisar" aria-label="Qué revisar">
        <li>El nombre y el RUT del documento son los de <strong>{nombrePropio(e.nombre_completo)}</strong>.</li>
        <li>Es de <strong>{solicitud.institucion_nombre}</strong> y del año en curso.</li>
        <li>Es un {textoTipo(solicitud.tipo_comprobante).toLowerCase()} legible y sin alteraciones.</li>
      </ul>

      <fieldset className="md-opciones">
        <legend className="visualmente-oculto">Decisión</legend>
        {opciones.map((o) => (
          <label key={o.valor} className="md-opcion" data-tono={o.tono} data-elegida={accion === o.valor || undefined}>
            <input type="radio" name="decision" value={o.valor} checked={accion === o.valor}
              onChange={() => setAccion(o.valor)} />
            <span className="md-opcion-texto">
              <strong>{o.texto}</strong>
              <span>{o.efecto}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {accion === 'rechazar' && (
        <label className="md-campo">
          <span className="md-campo-etiqueta">Motivo del rechazo</span>
          <textarea rows={3} value={motivo} maxLength={MAX_MOTIVO} autoFocus onChange={(ev) => setMotivo(ev.target.value)}
            placeholder="Ej.: el comprobante es del año pasado. Sube uno del semestre actual." />
          <span className="md-campo-pie">{n} verá este motivo. {motivo.length} de {MAX_MOTIVO} caracteres.</span>
        </label>
      )}

      {elegida && (
        <div className="md-avisos" role="status">
          <p className="md-avisos-titulo">Al aplicar se notifica a</p>
          <ul><li>{elegida.aviso}</li></ul>
        </div>
      )}

      <button type="submit" className="md-aplicar" data-tono={elegida?.tono === 'error' ? 'error' : undefined}
        disabled={!listo || enviando}>
        {enviando ? 'Guardando…' : elegida ? elegida.boton : 'Elige una opción'}
      </button>
      <p className="md-aplicar-ayuda">
        {!elegida ? 'Primero elige qué hacer.'
          : accion === 'rechazar' && !motivo.trim() ? 'Escribe el motivo para poder rechazar.'
            : accion === 'aprobar' ? 'Te pediremos confirmar antes de aprobar.' : 'Se rechaza al presionar el botón.'}
      </p>

      {/* Aprobar también se confirma: la insignia se ve de inmediato en su perfil */}
      <Confirmar abierto={confirmando} titulo="¿Aprobar esta verificación?" ocupado={enviando}
        mensaje={`${nombrePropio(e.nombre_completo)} quedará verificado y su perfil mostrará la insignia.`}
        textoConfirmar="Sí, aprobar" textoOcupado="Aprobando…" tono=""
        onConfirmar={() => alResolver(`/verificacion/solicitudes/${solicitud.id}/aprobar`)}
        onCancelar={() => setConfirmando(false)} />
    </form>
  )
}

// CA-22.4: ya resuelta queda como historial. Una aprobada vigente se puede revocar (CA-23.4) y una
// revocada se puede restaurar mientras no haya enviado otra solicitud
function Resultado({ solicitud, enviando, alResolver, alRestaurar, alFallar }) {
  const e = solicitud.solicitante
  const [revocando, setRevocando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const tono = { aprobada: 'ok', rechazada: 'error', revocada: 'vino' }[solicitud.estado] ?? 'ok'
  const vigente = e.verificacion_estado === 'verificado'

  return (
    <section className="md-tarjeta md-decision md-resultado" aria-labelledby="dv-titulo-resultado">
      <h2 id="dv-titulo-resultado">Resultado</h2>
      <p className="md-resultado-accion" data-tono={tono}>{ESTADOS_SOLICITUD[solicitud.estado] ?? solicitud.estado}</p>
      <p className="md-decision-ayuda">
        Revisada{solicitud.fecha_revision && <> el {fecha(solicitud.fecha_revision)}</>}
        {solicitud.admin_revisor && <> por {nombrePropio(solicitud.admin_revisor)}</>}.
        {solicitud.estado === 'aprobada' && <> {vigente ? 'La verificación sigue vigente.' : 'La verificación ya no está vigente.'}</>}
      </p>
      {solicitud.motivo_rechazo && <blockquote className="md-cita">{solicitud.motivo_rechazo}</blockquote>}

      {solicitud.estado === 'revocada' && (
        <>
          <p className="md-decision-ayuda">
            Revocada{solicitud.fecha_revocacion && <> el {fecha(solicitud.fecha_revocacion)}</>}
            {solicitud.revocada_por && <> por {nombrePropio(solicitud.revocada_por)}</>}.
          </p>
          {solicitud.motivo_revocacion && <blockquote className="md-cita">{solicitud.motivo_revocacion}</blockquote>}
          {e.verificacion_estado === 'revocado' && (
            <RestaurarVerificacion usuarioId={e.id} nombre={nombrePropio(e.nombre_completo)} className="md-aplicar"
              alTerminar={alRestaurar} alFallar={alFallar} />
          )}
        </>
      )}

      {/* CA-23.4: solo se revoca una verificación vigente */}
      {solicitud.estado === 'aprobada' && vigente && (
        revocando ? (
          <form className="dv-revocar" noValidate onSubmit={(ev) => {
            ev.preventDefault()
            if (motivo.trim()) alResolver(`/verificacion/usuarios/${e.id}/revocar`, { motivo: motivo.trim() })
          }}>
            <label className="md-campo">
              <span className="md-campo-etiqueta">Motivo de la revocación</span>
              <textarea rows={3} value={motivo} maxLength={MAX_MOTIVO} autoFocus onChange={(ev) => setMotivo(ev.target.value)}
                placeholder="Ej.: el comprobante resultó ser de otra persona." />
              <span className="md-campo-pie">La insignia dejará de aparecer en su perfil. {motivo.length} de {MAX_MOTIVO} caracteres.</span>
            </label>
            <div className="dv-botones">
              <button type="button" className="md-enlace" onClick={() => setRevocando(false)} disabled={enviando}>Cancelar</button>
              <button type="submit" className="md-aplicar" data-tono="error" disabled={!motivo.trim() || enviando}>
                {enviando ? 'Revocando…' : 'Confirmar revocación'}
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="dv-revocar-abrir" onClick={() => setRevocando(true)}>Revocar verificación</button>
        )
      )}
    </section>
  )
}

// HU-22: el administrador revisa una solicitud y la aprueba o la rechaza con un motivo
export default function DetalleVerificacion() {
  const { id } = useParams()
  const { state } = useLocation()
  const volver = state?.vista === 'procesadas' ? '/admin/verificaciones?vista=procesadas' : '/admin/verificaciones'
  const [solicitud, setSolicitud] = useState(null)
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
  const [enviando, setEnviando] = useState(false)
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

  const botonVolver = <Link to={volver} className="md-volver">Volver a las solicitudes</Link>
  if (!solicitud) {
    return (
      <PaginaAdmin className="md">
        {botonVolver}
        <div className="md-panel md-cargando" aria-busy={!mensaje.texto}>
          <p className={mensaje.texto ? 'alerta' : 'cargando'}>{mensaje.texto || 'Cargando la solicitud…'}</p>
        </div>
      </PaginaAdmin>
    )
  }

  const resolver = async (ruta, datos) => {
    setEnviando(true)
    setMensaje({ tipo: '', texto: '' })
    try {
      const respuesta = await api(ruta, { metodo: 'POST', datos })
      setMensaje({ tipo: 'exito', texto: `${respuesta.mensaje}.` })
      avisar(respuesta.mensaje)
      recargarResumen() // los contadores de la barra lateral bajan al instante
    } catch (err) {
      // CA-22.3: sin motivo no se rechaza. CA-22.4: 409 si otro administrador ya la procesó
      setMensaje({ tipo: 'alerta', texto: err.errores?.motivo ?? err.message })
    } finally {
      setEnviando(false)
      await cargar()
    }
  }

  const e = solicitud.solicitante
  const porRevisar = POR_REVISAR.includes(solicitud.estado)
  const nombre = nombrePropio(e.nombre_completo)
  const titulo = {
    aprobada: `Verificación aprobada de ${nombre}`,
    rechazada: `Verificación rechazada de ${nombre}`,
    revocada: `Verificación revocada de ${nombre}`,
  }[solicitud.estado] ?? `¿${nombre} estudia en ${solicitud.institucion_nombre}?`

  const pasos = [
    { titulo: 'Enviada', hecho: true, detalle: fecha(solicitud.fecha_solicitud) },
    { titulo: 'Revisión', hecho: !porRevisar,
      detalle: porRevisar ? 'Falta tu decisión'
        : `${solicitud.fecha_revision ? fecha(solicitud.fecha_revision) : 'Sin fecha registrada'}${solicitud.admin_revisor ? `, por ${nombrePropio(solicitud.admin_revisor)}` : ''}` },
    { titulo: 'Resultado', hecho: !porRevisar,
      detalle: porRevisar ? 'Aprobada o rechazada'
        : solicitud.estado === 'revocada' ? `Revocada${solicitud.fecha_revocacion ? ` el ${fecha(solicitud.fecha_revocacion)}` : ''}`
          : ESTADOS_SOLICITUD[solicitud.estado] },
  ]
  const actual = pasos.findIndex((p) => !p.hecho)

  return (
    <PaginaAdmin className="md">
      {botonVolver}
      <div className="md-panel">
        <header className="md-cabeza">
          <IlustracionVerificacion className="md-ilustracion" />
          <div className="md-cabeza-texto">
            <p className="md-ojo">
              Solicitud N.º {solicitud.codigo} · Verificación de estudiante
              <ChipEstado tipo="solicitud" valor={solicitud.estado}>{ESTADOS_SOLICITUD[solicitud.estado] ?? solicitud.estado}</ChipEstado>
            </p>
            <h1 className="md-titulo">{titulo}</h1>
            <ol className="md-pasos" aria-label="Avance de la solicitud">
              {pasos.map((p, i) => (
                <li key={p.titulo} data-estado={p.hecho ? 'hecho' : i === actual ? 'actual' : 'pendiente'}
                  aria-current={i === actual ? 'step' : undefined}>
                  <span className="md-paso-marca" aria-hidden="true">
                    {p.hecho ? <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg> : i + 1}
                  </span>
                  <span className="md-paso-texto"><strong>{p.titulo}</strong><span>{p.detalle}</span></span>
                </li>
              ))}
            </ol>
          </div>
        </header>

        {mensaje.texto && (
          <p className={`${mensaje.tipo} md-mensaje`} role={mensaje.tipo === 'alerta' ? 'alert' : 'status'}>{mensaje.texto}</p>
        )}

        <div className="md-cuerpo dv-cuerpo">
          <VistaComprobante solicitud={solicitud} />
          <div className="md-columna">
            <DatosPerfil solicitud={solicitud} />
            {porRevisar ? (
              <Decision solicitud={solicitud} enviando={enviando} alResolver={resolver} />
            ) : (
              <Resultado solicitud={solicitud} enviando={enviando} alResolver={resolver}
                alRestaurar={async (texto) => {
                  setMensaje({ tipo: 'exito', texto: `${texto}.` })
                  avisar(texto)
                  recargarResumen()
                  await cargar()
                }}
                alFallar={(texto) => setMensaje({ tipo: 'alerta', texto })} />
            )}
          </div>
        </div>
      </div>
    </PaginaAdmin>
  )
}
