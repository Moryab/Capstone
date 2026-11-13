import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api } from '../../api.js'
import { useAvisoBreve } from '../../componentes/AvisoBreve.jsx'
import Avatar from '../../componentes/Avatar.jsx'
import Confirmar from '../../componentes/Confirmar.jsx'
import InsigniaVerificacion from '../../componentes/InsigniaVerificacion.jsx'
import { useResumenAdmin } from '../../marco/ResumenAdmin.jsx'
import { formatearPesos, textoDe, TIPOS } from '../../publicaciones.js'
import {
  MAX_JUSTIFICACION, textoAccion, textoEstadoReporte, textoMotivo, textoResolucion,
} from '../../reportes.js'
import { fechaCorta } from '../verificacion/datos.js'
import { textoCuenta } from './datos.js'
import IlustracionReporte from './IlustracionReporte.jsx'
import ReactivarCuenta from './ReactivarCuenta.jsx'
import './detalleModeracion.css'
import './reportes.css'
import { ChipEstado, PaginaAdmin } from './ui/componentes.jsx'
import { nombrePropio } from './ui/formato.js'

const fechaDia = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
const fechaHoraCorta = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const fechaPaso = (iso) => fechaHoraCorta.format(new Date(iso))
const primerNombre = (nombre = '') => nombrePropio(nombre.split(' ')[0])
const ORDINALES = ['primera', 'segunda', 'tercera', 'cuarta', 'quinta']
const ordinal = (n) => ORDINALES[n - 1] ?? `${n}.ª`

/**
 * HU-27: cada acción con lo que pasa al aplicarla (para decidir sin adivinar), a quién se le avisa, el
 * texto del botón y su tono. `disponible` dice si se puede aplicar ahora (la API lo vuelve a validar).
 */
function accionesDe(reporte) {
  const e = reporte.elemento
  const n = primerNombre(e?.titulo)
  const reportante = primerNombre(reporte.reportante?.nombre) || 'Quien reportó'
  const revisado = `${reportante}: su reporte fue revisado (no sabrá qué se decidió).`
  if (reporte.tipo_elemento === 'usuario') {
    const activa = e?.estado === 'activa'
    const verificada = e?.verificacion_estado === 'verificado'
    return [
      { valor: 'desestimar', texto: 'Desestimar el reporte', boton: 'Desestimar reporte', tono: 'neutro', disponible: true,
        efecto: `No cambia nada en la cuenta de ${n}. El reporte se cierra como desestimado.`,
        avisos: [revisado] },
      { valor: 'advertir', texto: `Advertir a ${n}`, boton: 'Enviar advertencia', tono: 'espera', disponible: Boolean(e),
        efecto: `Recibe tu justificación como advertencia. Sería la ${ordinal((e?.advertencias ?? 0) + 1)}.`,
        avisos: [`${n}: recibe la advertencia con tu justificación.`, revisado] },
      { valor: 'quitar_verificacion', texto: 'Quitar la verificación', boton: 'Quitar verificación', tono: 'vino', disponible: verificada,
        efecto: verificada
          ? 'Pierde la insignia de estudiante verificado y vuelve a tener acceso limitado hasta verificarse de nuevo.'
          : 'No tiene una verificación vigente que quitar.',
        avisos: [`${n}: pierde su verificación y recibe tu justificación.`, revisado] },
      { valor: 'suspender', texto: 'Suspender la cuenta', boton: 'Suspender cuenta', tono: 'error', disponible: activa,
        efecto: activa
          ? 'No podrá iniciar sesión y sus publicaciones activas dejan de verse. Se puede reactivar desde su ficha.'
          : 'La cuenta ya no está activa.',
        avisos: [`${n}: su cuenta queda suspendida y recibe tu justificación.`, revisado] },
    ]
  }
  const viva = e && e.estado !== 'eliminada'
  const oferente = primerNombre(e?.oferente?.nombre) || 'El oferente'
  return [
    { valor: 'desestimar', texto: 'Desestimar el reporte', boton: 'Desestimar reporte', tono: 'neutro', disponible: true,
      efecto: 'La publicación sigue igual. El reporte se cierra como desestimado.', avisos: [revisado] },
    { valor: 'ocultar', texto: 'Ocultar la publicación', boton: 'Ocultar publicación', tono: 'espera',
      disponible: viva && e.estado !== 'suspendida',
      efecto: e?.estado === 'suspendida' ? 'Ya está oculta.' : 'Deja de verse en las búsquedas. Se puede restaurar desde su ficha.',
      avisos: [`${oferente}: su publicación se oculta y recibe tu justificación.`, revisado] },
    { valor: 'eliminar', texto: 'Eliminar la publicación', boton: 'Eliminar publicación', tono: 'error', disponible: viva,
      efecto: viva ? 'Desaparece para los estudiantes. Queda registrada para administración.' : 'Ya fue eliminada.',
      avisos: [`${oferente}: su publicación se elimina y recibe tu justificación.`, revisado] },
  ]
}

// Los tres pasos del reporte: recibido, tomado para revisión y resuelto
function Pasos({ reporte }) {
  const resuelto = reporte.estado === 'resuelto'
  const pasos = [
    { titulo: 'Recibido', hecho: true,
      detalle: `${fechaPaso(reporte.fecha_reporte)}${reporte.reportante ? `, enviado por ${nombrePropio(reporte.reportante.nombre)}` : ''}` },
    { titulo: 'Tomado para revisión', hecho: reporte.estado !== 'pendiente',
      detalle: reporte.fecha_toma_revision
        ? `${fechaPaso(reporte.fecha_toma_revision)}${reporte.admin_revisor ? `, por ${nombrePropio(reporte.admin_revisor.nombre)}` : ''}`
        : reporte.estado === 'pendiente' ? 'Falta tomarlo' : 'Sin fecha registrada' },
    { titulo: 'Resuelto', hecho: resuelto,
      detalle: reporte.accion
        ? `${fechaPaso(reporte.accion.fecha_accion)}${reporte.accion.admin ? `, por ${nombrePropio(reporte.accion.admin.nombre)}` : ''}`
        : resuelto ? 'Sin fecha registrada' : reporte.estado === 'en_revision' ? 'Falta tu decisión' : 'Después de revisarlo' },
  ]
  const actual = pasos.findIndex((p) => !p.hecho)
  return (
    <ol className="md-pasos" aria-label="Avance del reporte">
      {pasos.map((p, i) => (
        <li key={p.titulo} data-estado={p.hecho ? 'hecho' : i === actual ? 'actual' : 'pendiente'}
          aria-current={i === actual ? 'step' : undefined}>
          <span className="md-paso-marca" aria-hidden="true">
            {p.hecho
              ? <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              : i + 1}
          </span>
          <span className="md-paso-texto">
            <strong>{p.titulo}</strong>
            <span>{p.detalle}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

// Lo reportado: el perfil (con sus cifras) o la publicación, con su ficha de administración
function Reportado({ tipo, elemento }) {
  if (!elemento) {
    return (
      <section className="md-tarjeta md-reportado">
        <p className="md-rotulo">{tipo === 'usuario' ? 'Perfil reportado' : 'Publicación reportada'}</p>
        <p className="md-vacio">Este elemento ya no existe.</p>
      </section>
    )
  }
  if (tipo === 'usuario') {
    const verificado = elemento.verificacion_estado === 'verificado'
    const cifras = [
      { etiqueta: 'Reportes recibidos', valor: elemento.reportes_recibidos, alerta: elemento.reportes_recibidos > 1 },
      { etiqueta: 'Advertencias', valor: elemento.advertencias, alerta: elemento.advertencias > 0 },
      { etiqueta: 'Publicaciones activas', valor: elemento.publicaciones_activas },
    ]
    return (
      <section className="md-tarjeta md-reportado" aria-labelledby="md-titulo-reportado">
        <p className="md-rotulo" id="md-titulo-reportado">Perfil reportado</p>
        <div className="md-persona">
          <Avatar nombre={nombrePropio(elemento.titulo)} foto={elemento.foto_url} tamano={64} />
          <div className="md-persona-datos">
            <p className="md-persona-nombre">
              {nombrePropio(elemento.titulo)}
              <InsigniaVerificacion verificado={verificado} />
            </p>
            <p className="md-persona-meta">
              {elemento.correo}
              {elemento.fecha_registro && <> · en RoomMatch desde el {fechaDia.format(new Date(elemento.fecha_registro))}</>}
            </p>
            <p className="md-persona-meta">Cuenta <strong>{textoCuenta(elemento.estado).toLowerCase()}</strong></p>
          </div>
        </div>
        <dl className="md-cifras">
          {cifras.map((c) => (
            <div key={c.etiqueta} data-alerta={c.alerta || undefined}>
              <dt>{c.etiqueta}</dt>
              <dd>{c.valor}</dd>
            </div>
          ))}
        </dl>
        <div className="md-enlaces">
          <Link to={`/admin/usuarios/${elemento.id}`} className="md-enlace">Abrir ficha en Usuarios</Link>
        </div>
      </section>
    )
  }
  return (
    <section className="md-tarjeta md-reportado" aria-labelledby="md-titulo-reportado">
      <p className="md-rotulo" id="md-titulo-reportado">Publicación reportada</p>
      <div className="md-publicacion">
        <span className="md-publicacion-foto">
          {elemento.foto_url ? <img src={elemento.foto_url} alt="" /> : <span aria-hidden="true">Sin fotos</span>}
        </span>
        <div className="md-persona-datos">
          <p className="md-persona-nombre">{elemento.titulo}</p>
          <p className="md-persona-meta">
            {[textoDe(TIPOS, elemento.tipo), elemento.comuna, `${formatearPesos(elemento.costo_mensual)} / mes`].filter(Boolean).join(' · ')}
          </p>
          <p className="md-persona-meta">
            Publicación <strong>{elemento.estado}</strong>
            {elemento.oferente && <> · de {nombrePropio(elemento.oferente.nombre)} ({elemento.oferente.correo})</>}
          </p>
        </div>
      </div>
      <dl className="md-cifras">
        <div data-alerta={elemento.reportes_recibidos > 1 || undefined}><dt>Reportes recibidos</dt><dd>{elemento.reportes_recibidos}</dd></div>
        <div><dt>Cupos disponibles</dt><dd>{elemento.cupos_disponibles ?? '—'}</dd></div>
      </dl>
      <div className="md-enlaces">
        <Link to={`/admin/publicaciones/${elemento.id}`} className="md-enlace">Abrir ficha de la publicación</Link>
        {elemento.oferente && <Link to={`/admin/usuarios/${elemento.oferente.id}`} className="md-enlace">Ver al oferente</Link>}
      </div>
    </section>
  )
}

// Lo que dice el reporte y quién lo envió
function LoQueDice({ reporte }) {
  const quien = reporte.reportante
  const nombre = primerNombre(reporte.elemento?.titulo) || 'la persona reportada'
  return (
    <section className="md-tarjeta" aria-labelledby="md-titulo-dice">
      <p className="md-rotulo" id="md-titulo-dice">Lo que dice el reporte</p>
      <p className="md-motivo">{textoMotivo(reporte.motivo)}</p>
      <blockquote className={`md-cita${reporte.descripcion ? '' : ' vacia'}`}>
        {reporte.descripcion
          || `${primerNombre(quien?.nombre) || 'Quien reportó'} no escribió una descripción. Revisa ${reporte.tipo_elemento === 'usuario' ? `el perfil y las publicaciones de ${nombre}` : 'la publicación y su oferente'} antes de decidir.`}
      </blockquote>
      {quien && (
        <div className="md-reportante">
          <Avatar nombre={nombrePropio(quien.nombre)} foto={quien.foto_url} tamano={40} />
          <p>
            <span>Reportado por</span>
            <Link to={`/admin/usuarios/${quien.id}`}>{nombrePropio(quien.nombre)}</Link>
            <span className="md-reportante-meta">
              {quien.correo}
              {quien.fecha_registro && <> · desde el {fechaDia.format(new Date(quien.fecha_registro))}</>}
            </span>
          </p>
        </div>
      )}
    </section>
  )
}

function OtrosReportes({ reporte, volver }) {
  const lugar = reporte.tipo_elemento === 'usuario' ? 'este perfil' : 'esta publicación'
  const nombre = primerNombre(reporte.elemento?.titulo)
  return (
    <section className="md-tarjeta" aria-labelledby="md-titulo-otros">
      <p className="md-rotulo" id="md-titulo-otros">Otros reportes de {lugar}</p>
      {reporte.otros_reportes.length === 0 ? (
        <p className="md-vacio">
          Es el primer reporte que recibe {reporte.tipo_elemento === 'usuario' ? nombre : 'esta publicación'}.
          Si llegan más, aparecerán aquí.
        </p>
      ) : (
        <ul className="md-otros">
          {reporte.otros_reportes.map((o) => (
            <li key={o.id}>
              <Link to={`/admin/reportes/${o.id}`} state={{ volver }}>N.º {o.codigo}</Link>
              <span>{textoMotivo(o.motivo)}</span>
              <ChipEstado tipo="reporte" valor={o.estado}>{textoEstadoReporte(o.estado)}</ChipEstado>
              <time dateTime={o.fecha_reporte}>{fechaPaso(o.fecha_reporte)}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// HU-27: elige la acción (cada opción dice qué pasa), la justifica y confirma aparte
function Decision({ reporte, alTerminar }) {
  const opciones = accionesDe(reporte)
  const [accion, setAccion] = useState('')
  const [justificacion, setJustificacion] = useState('')
  const [error, setError] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const elegida = opciones.find((o) => o.valor === accion)
  const listo = Boolean(elegida) && justificacion.trim().length > 0
  // Una acción real cierra también los otros reportes abiertos sobre lo mismo (desestimar no)
  const abiertos = reporte.otros_reportes.filter((o) => o.estado !== 'resuelto').length

  const aplicar = async () => {
    setEnviando(true)
    try {
      const r = await api(`/moderacion/reportes/${reporte.id}/accion`, { metodo: 'POST', datos: { accion, justificacion } })
      await alTerminar(`${r.mensaje}.`)
    } catch (err) {
      setError(err.errores ? Object.values(err.errores)[0] : err.message)
      setConfirmando(false)
      setEnviando(false)
    }
  }

  return (
    <form className="md-tarjeta md-decision" noValidate aria-labelledby="md-titulo-decision"
      onSubmit={(e) => { e.preventDefault(); if (listo) setConfirmando(true) }}>
      <h2 id="md-titulo-decision">Tu decisión</h2>
      <p className="md-decision-ayuda">Elige qué hacer con {reporte.tipo_elemento === 'usuario' ? 'el perfil' : 'la publicación'}. Cada opción dice qué va a pasar.</p>

      <fieldset className="md-opciones">
        <legend className="visualmente-oculto">Acción</legend>
        {opciones.map((o) => (
          <label key={o.valor} className="md-opcion" data-tono={o.tono} data-elegida={accion === o.valor || undefined}
            data-bloqueada={!o.disponible || undefined}>
            <input type="radio" name="accion" value={o.valor} checked={accion === o.valor} disabled={!o.disponible}
              onChange={() => { setAccion(o.valor); setError('') }} />
            <span className="md-opcion-texto">
              <strong>{o.texto}</strong>
              <span>{o.efecto}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <label className="md-campo">
        <span className="md-campo-etiqueta">Justificación</span>
        <textarea rows={4} value={justificacion} maxLength={MAX_JUSTIFICACION}
          onChange={(e) => { setJustificacion(e.target.value); setError('') }}
          placeholder={reporte.tipo_elemento === 'usuario'
            ? 'Ej.: el perfil pide transferencias antes de conocer el alojamiento.'
            : 'Ej.: las fotos no corresponden a la dirección publicada.'} />
        <span className="md-campo-pie">
          {elegida && elegida.valor !== 'desestimar' ? 'La persona afectada verá este texto.' : 'Queda registrado con tu nombre.'}
          {' '}{justificacion.length} de {MAX_JUSTIFICACION} caracteres.
        </span>
      </label>

      {elegida && (
        <div className="md-avisos" role="status">
          <p className="md-avisos-titulo">Al aplicar se notifica a</p>
          <ul>{elegida.avisos.map((a) => <li key={a}>{a}</li>)}</ul>
          {elegida.valor !== 'desestimar' && abiertos > 0 && (
            <p className="md-avisos-extra">
              También se cierran los otros {abiertos} {abiertos === 1 ? 'reporte abierto' : 'reportes abiertos'} sobre lo mismo.
            </p>
          )}
        </div>
      )}

      {error && <p className="alerta" role="alert">{error}</p>}

      <button type="submit" className="md-aplicar" data-tono={elegida?.tono} disabled={!listo || enviando}>
        {elegida ? elegida.boton : 'Elige una acción'}
      </button>
      <p className="md-aplicar-ayuda">
        {!elegida ? 'Primero elige qué hacer.' : !justificacion.trim() ? 'Escribe una justificación para poder aplicar la decisión.' : 'Te pediremos confirmar antes de aplicarla.'}
      </p>

      <Confirmar abierto={confirmando} titulo={`¿${elegida?.texto}?`} ocupado={enviando}
        tono={['error', 'vino'].includes(elegida?.tono) ? 'peligro' : ''}
        mensaje="La acción quedará registrada con tu nombre y el reporte pasará a «resuelto»."
        textoConfirmar={`Sí, ${elegida?.boton.toLowerCase()}`} textoOcupado="Aplicando…" onConfirmar={aplicar}
        onCancelar={() => setConfirmando(false)} />
    </form>
  )
}

// Antes de decidir: tomar el reporte para que nadie más lo procese a la vez (CA-26.3)
function Tomar({ alTomar, tomando }) {
  return (
    <section className="md-tarjeta md-decision" aria-labelledby="md-titulo-tomar">
      <h2 id="md-titulo-tomar">Tu decisión</h2>
      <p className="md-decision-ayuda">
        Toma el reporte para revisarlo: así ningún otro administrador lo procesa al mismo tiempo. Después podrás
        elegir qué hacer.
      </p>
      <button type="button" className="md-aplicar" onClick={alTomar} disabled={tomando}>
        {tomando ? 'Tomando…' : 'Tomar para revisión'}
      </button>
    </section>
  )
}

// Reporte resuelto: qué se decidió, por qué y quién
function Resultado({ reporte, alTerminar }) {
  const a = reporte.accion
  return (
    <section className="md-tarjeta md-decision md-resultado" aria-labelledby="md-titulo-resultado">
      <h2 id="md-titulo-resultado">Resultado</h2>
      {a || reporte.resolucion ? (
        <p className="md-resultado-accion">{a ? textoAccion(a.accion) : textoResolucion(reporte.resolucion)}</p>
      ) : (
        <p className="md-decision-ayuda">Este reporte se cerró sin una acción registrada.</p>
      )}
      {a && (
        <>
          <blockquote className="md-cita">{a.justificacion}</blockquote>
          <p className="md-decision-ayuda">
            Aplicada por {a.admin ? nombrePropio(a.admin.nombre) : 'un administrador'} el {fechaCorta.format(new Date(a.fecha_accion))}.
          </p>
        </>
      )}
      {reporte.resolucion === 'cuenta_suspendida' && reporte.elemento?.estado === 'suspendida' && (
        <ReactivarCuenta usuarioId={reporte.elemento.id} alTerminar={alTerminar} />
      )}
    </section>
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
  const { avisar } = useAvisoBreve()
  const { recargarResumen } = useResumenAdmin()

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
  const botonVolver = <Link to={volver} className="md-volver">Volver a los reportes</Link>

  if (error) {
    return (
      <PaginaAdmin className="md">
        {botonVolver}
        <div className="md-panel"><h1 className="md-titulo">{error}</h1></div>
      </PaginaAdmin>
    )
  }
  if (!reporte) {
    return (
      <PaginaAdmin className="md">
        {botonVolver}
        <div className="md-panel md-cargando" aria-busy="true"><p className="cargando">Cargando el reporte…</p></div>
      </PaginaAdmin>
    )
  }

  const tomar = async () => {
    setTomando(true)
    setMensaje({ id, tipo: '', texto: '' })
    try {
      const respuesta = await api(`/reportes/${id}/tomar`, { metodo: 'POST' })
      setMensaje({ id, tipo: 'exito', texto: `${respuesta.mensaje}.` })
      avisar(respuesta.mensaje)
      recargarResumen()
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
    avisar(texto.replace(/\.$/, ''))
    recargarResumen() // los contadores de la barra lateral bajan al instante
  }

  const esPerfil = reporte.tipo_elemento === 'usuario'
  const nombre = (esPerfil ? nombrePropio(reporte.elemento?.titulo ?? '') : reporte.elemento?.titulo) || (esPerfil ? 'un perfil que ya no existe' : 'una publicación que ya no existe')
  const titulo = reporte.motivo === 'otro'
    ? `Reporte sobre ${esPerfil ? `el perfil de ${nombre}` : `«${nombre}»`}`
    : `${textoMotivo(reporte.motivo)} en ${esPerfil ? `el perfil de ${nombre}` : `«${nombre}»`}`

  return (
    <PaginaAdmin className="md">
      {botonVolver}
      <div className="md-panel">
        {/* Lo primero: qué se reportó, en qué estado está y cuánto falta */}
        <header className="md-cabeza">
          <IlustracionReporte className="md-ilustracion" />
          <div className="md-cabeza-texto">
            <p className="md-ojo">
              Reporte N.º {reporte.codigo} · {esPerfil ? 'Perfil' : 'Publicación'}
              <ChipEstado tipo="reporte" valor={reporte.estado}>{textoEstadoReporte(reporte.estado)}</ChipEstado>
            </p>
            <h1 className="md-titulo">{titulo}</h1>
            <Pasos reporte={reporte} />
          </div>
        </header>

        {mensaje.id === id && mensaje.texto && (
          <p className={`${mensaje.tipo} md-mensaje`} role={mensaje.tipo === 'alerta' ? 'alert' : 'status'}>{mensaje.texto}</p>
        )}

        <div className="md-cuerpo">
          <div className="md-columna">
            <Reportado tipo={reporte.tipo_elemento} elemento={reporte.elemento} />
            <LoQueDice reporte={reporte} />
            <OtrosReportes reporte={reporte} volver={volver} />
          </div>
          <div className="md-lateral">
            {reporte.estado === 'pendiente' && <Tomar alTomar={tomar} tomando={tomando} />}
            {reporte.estado === 'en_revision' && <Decision reporte={reporte} alTerminar={alTerminar} />}
            {reporte.estado === 'resuelto' && <Resultado reporte={reporte} alTerminar={alTerminar} />}
          </div>
        </div>
      </div>
    </PaginaAdmin>
  )
}
