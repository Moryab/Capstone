import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api } from '../../api.js'
import Avatar from '../../componentes/Avatar.jsx'
import { useAvisoBreve } from '../../componentes/AvisoBreve.jsx'
import Confirmar from '../../componentes/Confirmar.jsx'
import FichaPublicacion from '../../componentes/FichaPublicacion.jsx'
import { IconoSiguiente } from '../../componentes/IconosAlojamiento.jsx'
import InsigniaVerificacion from '../../componentes/InsigniaVerificacion.jsx'
import { IconoBandera, IconoMensajes } from '../../inicio/iconos.jsx'
import { useResumenAdmin } from '../../marco/ResumenAdmin.jsx'
import { textoGenero } from '../../perfil.js'
import { formatearPesos, textoDe, TIPOS } from '../../publicaciones.js'
import {
  MAX_JUSTIFICACION, MOTIVOS_INCUMPLIMIENTO, textoAccion, textoEstadoReporte, textoIncumplimiento, textoMotivo,
} from '../../reportes.js'
import { textoPublicacion } from './datos.js'
import IlustracionPublicacion from './IlustracionPublicacion.jsx'
import '../../componentes/botonMensaje.css'
import '../../componentes/reportar.css'
import './detalleModeracion.css'
import './detallePublicacion.css'
import { ChipEstado, ImagenSuave, PaginaAdmin } from './ui/componentes.jsx'
import { Actividad, Cifra, DIBUJOS_VACIO, ICONOS } from './ui/detalle.jsx'
import { haceCuanto, nombrePropio } from './ui/formato.js'

const fechaDia = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
const fechaHora = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const dia = (iso) => fechaDia.format(new Date(iso))
const ABIERTOS = ['pendiente', 'en_revision']
const SOLO_VISTA = 'Vista previa: este botón lo usan los estudiantes'

// Tono de cada acción del historial: advertir en ámbar, ocultar en vino, eliminar en rojo y restaurar en verde
const TONO_ACCION = {
  advertir_usuario: 'espera', suspender_publicacion: 'vino', eliminar_publicacion: 'error', reactivar_publicacion: 'ok', desestimar_reporte: 'neutro',
}

/*
 * HU-30: moderar la publicación. Se elige qué hacer (advertir al oferente, ocultar, eliminar o restaurar), el motivo del
 * incumplimiento (CA-30.1) y un comentario que verá el oferente (CA-30.3); después se confirma.
 * Restaurar (CA-30.5) solo pide la justificación y también queda registrada
 */
function Moderar({ pub, ocultaPorCuenta, alTerminar }) {
  const oferente = nombrePropio(pub.oferente?.nombre ?? '') || 'El oferente'
  const oculta = pub.estado === 'suspendida'
  const opciones = [
    oculta && {
      valor: 'restaurar', tono: 'ok', texto: 'Restaurar la publicación', positiva: true,
      disponible: !ocultaPorCuenta,
      efecto: ocultaPorCuenta
        ? 'Se ocultó porque la cuenta del oferente está suspendida: vuelve a verse al reactivar la cuenta.'
        : 'Vuelve a aparecer en las búsquedas y listados, tal como estaba.',
      boton: 'Restaurar publicación', pregunta: '¿Restaurar la publicación?', confirmar: 'Sí, restaurar', ocupado: 'Restaurando…',
      mensaje: 'Volverá a aparecer en búsquedas y listados.',
      avisos: [`${oferente}: su publicación vuelve a estar visible.`],
    },
    {
      valor: 'advertir', tono: 'espera', texto: `Advertir a ${oferente}`, motivo: true,
      // Con la cuenta suspendida no se advierte (la API también lo valida)
      disponible: !ocultaPorCuenta,
      efecto: ocultaPorCuenta
        ? 'Su cuenta está suspendida: no se le puede advertir.'
        : 'Para faltas menores. La publicación sigue visible; recibe el motivo y la advertencia se suma a su cuenta.',
      boton: 'Enviar advertencia', pregunta: '¿Advertir al oferente?', confirmar: 'Sí, advertir', ocupado: 'Enviando…',
      mensaje: `${oferente} recibirá una advertencia por esta publicación con el motivo y tu comentario.`,
      avisos: [`${oferente}: recibe la advertencia con el motivo y tu comentario.`, 'La publicación no cambia.'],
    },
    {
      valor: 'ocultar', tono: 'vino', texto: 'Ocultar la publicación', disponible: !oculta, motivo: true,
      efecto: oculta ? 'Ya está oculta.' : 'Deja de verse en búsquedas y listados mientras se corrige. Se puede restaurar.',
      boton: 'Ocultar publicación', pregunta: '¿Ocultar la publicación?', confirmar: 'Sí, ocultar', ocupado: 'Ocultando…',
      mensaje: 'Dejará de aparecer en búsquedas y listados. La podrás restaurar después.',
      avisos: [`${oferente}: su publicación se oculta y recibe tu comentario.`],
    },
    {
      valor: 'eliminar', tono: 'error', texto: 'Eliminar la publicación', disponible: true, motivo: true,
      efecto: 'Desaparece para todos, también para el oferente. Queda registrada para administración y no se puede restaurar.',
      boton: 'Eliminar publicación', pregunta: '¿Eliminar la publicación?', confirmar: 'Sí, eliminar', ocupado: 'Eliminando…',
      mensaje: 'Dejará de mostrarse, también para el oferente. Esta acción no se puede deshacer.',
      avisos: [`${oferente}: su publicación se elimina y recibe tu comentario.`],
    },
  ].filter(Boolean)

  const [accion, setAccion] = useState('')
  const [motivo, setMotivo] = useState('')
  const [texto, setTexto] = useState('')
  const [errores, setErrores] = useState({})
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [hecho, setHecho] = useState('')

  const elegida = opciones.find((o) => o.valor === accion && o.disponible)
  const listo = Boolean(elegida && texto.trim() && (!elegida.motivo || motivo))

  const revisar = (e) => {
    e.preventDefault()
    if (!elegida) return
    const faltan = { // CA-30.3: el backend vuelve a validar
      ...(elegida.motivo && !motivo && { motivo: 'Elige el motivo del incumplimiento' }),
      ...(!texto.trim() && { justificacion: 'Escribe un comentario' }),
    }
    setErrores(faltan)
    if (!Object.keys(faltan).length) setConfirmando(true)
  }

  const aplicar = async () => {
    setEnviando(true)
    try {
      const respuesta = elegida.valor === 'restaurar'
        ? await api(`/moderacion/publicaciones/${pub.id}/restaurar`, { metodo: 'POST', datos: { justificacion: texto.trim() } })
        : await api(`/moderacion/publicaciones/${pub.id}/accion`, {
          metodo: 'POST', datos: { accion: elegida.valor, motivo, justificacion: texto.trim() },
        })
      setConfirmando(false)
      setAccion('')
      setMotivo('')
      setTexto('')
      setHecho(respuesta.mensaje)
      setTimeout(() => setHecho(''), 2400)
      await alTerminar(`${respuesta.mensaje}.`)
    } catch (err) {
      setErrores(err.errores ?? { general: err.message })
      setConfirmando(false)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="md-tarjeta md-decision" noValidate aria-labelledby="dp-titulo-moderar" onSubmit={revisar}>
      <h2 id="dp-titulo-moderar">Moderar la publicación</h2>
      <p className="md-decision-ayuda">Revisa los reportes y la ficha antes de decidir. Todo queda registrado.</p>

      {hecho && (
        <div className="du-hecho" role="status">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M7 12.5l3.2 3.2L17 9" /></svg>
          <span>{hecho}</span>
        </div>
      )}

      <fieldset className="md-opciones">
        <legend className="visualmente-oculto">Acción sobre la publicación</legend>
        {opciones.map((o) => (
          <label key={o.valor} className="md-opcion" data-tono={o.tono} data-elegida={accion === o.valor || undefined}
            data-bloqueada={!o.disponible || undefined}>
            <input type="radio" name="accion-publicacion" value={o.valor} checked={accion === o.valor} disabled={!o.disponible}
              onChange={() => { setAccion(o.valor); setErrores({}) }} />
            <span className="md-opcion-texto">
              <strong>{o.texto}</strong>
              <span>{o.efecto}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {elegida?.motivo && (
        <fieldset className="dp-motivos du-aparecer" aria-describedby={errores.motivo ? 'dp-error-motivo' : undefined}>
          <legend className="md-campo-etiqueta">Motivo del incumplimiento</legend>
          <div className="dp-motivos-lista">
            {MOTIVOS_INCUMPLIMIENTO.map((m) => (
              <label key={m.valor} className="dp-motivo" data-elegido={motivo === m.valor || undefined}>
                <input type="radio" name="motivo" value={m.valor} checked={motivo === m.valor}
                  onChange={() => { setMotivo(m.valor); setErrores({ ...errores, motivo: undefined }) }} />
                {m.texto}
              </label>
            ))}
          </div>
          {errores.motivo && <span id="dp-error-motivo" className="md-campo-pie du-error" role="alert">{errores.motivo}</span>}
        </fieldset>
      )}

      {elegida && (
        <label className="md-campo du-aparecer">
          <span className="md-campo-etiqueta">{elegida.positiva ? 'Justificación' : 'Comentario para el oferente'}</span>
          <textarea rows={3} value={texto} maxLength={MAX_JUSTIFICACION} aria-invalid={Boolean(errores.justificacion) || undefined}
            onChange={(e) => { setTexto(e.target.value); setErrores({ ...errores, justificacion: undefined }) }}
            placeholder={elegida.positiva ? 'Ej.: el oferente corrigió el precio y las fotos.' : 'Ej.: el precio publicado no coincide con el que cobra.'} />
          {errores.justificacion
            ? <span className="md-campo-pie du-error" role="alert">{errores.justificacion}</span>
            : <span className="md-campo-pie">
              {elegida.positiva ? 'Queda en el registro de moderación.' : 'El oferente verá este comentario.'} {texto.length} de {MAX_JUSTIFICACION} caracteres.
            </span>}
        </label>
      )}

      {elegida && (
        <div className="md-avisos du-aparecer" role="status">
          <p className="md-avisos-titulo">Al aplicar</p>
          <ul>{elegida.avisos.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      )}
      {errores.general && <p className="dv-alerta du-alerta-error" role="alert">{errores.general}</p>}

      <button type="submit" className="md-aplicar" data-tono={elegida && !elegida.positiva ? elegida.tono : undefined}
        disabled={!listo || enviando}>
        {enviando ? elegida?.ocupado : elegida ? elegida.boton : 'Elige una acción'}
      </button>
      <p className="md-aplicar-ayuda">
        {!elegida ? 'Primero elige qué hacer.'
          : elegida.motivo && !motivo ? 'Elige el motivo del incumplimiento.'
            : !texto.trim() ? 'Escribe el comentario para continuar.' : 'Te pediremos confirmar antes de aplicarla.'}
      </p>

      {elegida && (
        <Confirmar abierto={confirmando} titulo={elegida.pregunta} mensaje={elegida.mensaje}
          textoConfirmar={elegida.confirmar} textoOcupado={elegida.ocupado} ocupado={enviando}
          tono={elegida.positiva ? '' : 'peligro'} onConfirmar={aplicar} onCancelar={() => setConfirmando(false)} />
      )}
    </form>
  )
}

// Una publicación eliminada ya no se modera: la tarjeta lo dice con su dibujo
function SinModeracion({ eliminadaPor }) {
  return (
    <section className="md-tarjeta md-decision dp-cerrada" aria-labelledby="dp-titulo-cerrada">
      <h2 id="dp-titulo-cerrada">Moderar la publicación</h2>
      <div className="du-vacio">
        {DIBUJOS_VACIO.historial}
        <div>
          <p className="du-vacio-titulo">Publicación eliminada</p>
          <p className="du-vacio-texto">
            La eliminó {eliminadaPor === 'administrador' ? 'la administración' : eliminadaPor ? `el ${eliminadaPor}` : 'alguien'}.
            Ya no admite acciones; su historial queda como registro.
          </p>
        </div>
      </div>
    </section>
  )
}

// Mientras carga: la misma forma de la ficha en silueta
function Silueta({ botonVolver }) {
  return (
    <PaginaAdmin className="md du dp">
      {botonVolver}
      <div className="md-panel du-silueta" aria-busy="true" aria-label="Cargando la publicación">
        <div className="du-cabeza">
          <div className="du-identidad">
            <span className="du-s dp-s-foto" />
            <div className="du-s-grupo"><span className="du-s" style={{ width: '40%' }} /><span className="du-s du-s-titulo" /><span className="du-s" style={{ width: '55%' }} /></div>
          </div>
          <span className="du-s du-s-ilustracion" />
        </div>
        <div className="du-cifras">{[0, 1, 2, 3].map((i) => <span key={i} className="du-s du-s-cifra" />)}</div>
        <div className="md-cuerpo du-cuerpo">
          <div className="md-columna">
            <span className="du-s du-s-tarjeta" />
            <span className="du-s du-s-tarjeta" />
          </div>
          <span className="du-s du-s-tarjeta" style={{ height: 456 }} />
        </div>
        <span className="du-s du-s-tarjeta" style={{ height: 520 }} />
      </div>
    </PaginaAdmin>
  )
}

// HU-29 y HU-30: la publicación, sus reportes, su historial de moderación y cómo la ven los estudiantes
export default function DetallePublicacionAdmin() {
  const { id } = useParams()
  const { state } = useLocation()
  const volver = state?.volver ?? '/admin/publicaciones'
  // Se guarda junto con el id: al pasar a otra publicación, lo anterior deja de mostrarse
  const [cargado, setCargado] = useState({ id: null, datos: null, error: '' })
  const [aviso, setAviso] = useState({ id: null, texto: '' })
  const { avisar } = useAvisoBreve()
  const { recargarResumen } = useResumenAdmin()

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
  const botonVolver = <Link to={volver} className="md-volver">Volver a las publicaciones</Link>

  if (error) {
    return (
      <PaginaAdmin className="md du dp">
        {botonVolver}
        <div className="md-panel md-cargando">
          <div className="du-vacio du-vacio-error">
            {DIBUJOS_VACIO.publicaciones}
            <div>
              <p className="du-vacio-titulo">No pudimos abrir esta publicación</p>
              <p className="du-vacio-texto">{error}</p>
            </div>
          </div>
        </div>
      </PaginaAdmin>
    )
  }
  if (!datos) return <Silueta botonVolver={botonVolver} />

  const alTerminar = async (texto) => {
    await cargar()
    setAviso({ id, texto })
    avisar(texto.replace(/\.$/, ''))
    recargarResumen() // los contadores de la barra lateral se ponen al día
  }

  const { publicacion: pub, reportes, acciones } = datos
  const { oferente } = pub
  const eliminada = pub.estado === 'eliminada'
  const foto = pub.fotos.find((f) => f.es_principal) ?? pub.fotos[0]
  const abiertos = reportes.filter((r) => ABIERTOS.includes(r.estado)).length
  const totalReportes = datos.cantidad_reportes ?? reportes.length
  const sinCupos = pub.cupos_disponibles === 0
  // Edad y género de quien publica, como los ve el estudiante (CA-16.3)
  const personales = oferente && [oferente.edad && `${oferente.edad} años`, textoGenero(oferente.genero)].filter(Boolean).join(', ')

  // Por qué los estudiantes no la ven, si no está activa
  const banda = {
    suspendida: { tono: 'espera', icono: 'oculto', titulo: datos.oculta_por_cuenta ? 'Oculta por la suspensión del oferente' : 'Oculta por moderación',
      texto: datos.oculta_por_cuenta
        ? 'Se ocultó porque la cuenta del oferente está suspendida. Vuelve a mostrarse al reactivar la cuenta.'
        : 'No aparece en búsquedas ni listados. Puedes restaurarla cuando se corrija.' },
    eliminada: { tono: 'error', icono: 'papelera', titulo: 'Publicación eliminada',
      texto: `La eliminó ${datos.eliminada_por === 'administrador' ? 'la administración' : datos.eliminada_por ? `el ${datos.eliminada_por}` : 'alguien'}. Los estudiantes ya no la ven.` },
    pausada: { tono: 'neutro', icono: 'pausa', titulo: 'Publicación pausada',
      texto: 'Su dueño pasó a buscador. Vuelve a verse cuando, como oferente, confirme que sigue disponible.' },
    completa: { tono: 'info', icono: 'cupos', titulo: 'Sin cupos disponibles',
      texto: 'Está completa: los estudiantes la ven, pero no pueden postular.' },
  }[pub.estado]

  return (
    <PaginaAdmin className="md du dp">
      {botonVolver}
      <div className="md-panel">
        {/* Qué es, dónde está, en qué estado y un resumen en cifras */}
        <header className="du-cabeza">
          <div className="du-identidad">
            <div className="dp-foto" data-estado={pub.estado}>
              {foto
                ? <ImagenSuave src={foto.url} alt={`Foto principal de «${pub.titulo}»`} />
                : <span className="dp-foto-vacia">{ICONOS.casa}</span>}
              {pub.fotos.length > 1 && <span className="dp-foto-cuenta">{pub.fotos.length} fotos</span>}
            </div>
            <div className="du-identidad-texto">
              <p className="md-ojo">Publicación N.º {pub.codigo} · {textoDe(TIPOS, pub.tipo)}</p>
              <h1 className="md-titulo">{pub.titulo}</h1>
              <p className="du-meta">
                {pub.ubicacion.comuna_nombre}, {pub.ubicacion.sector}
                {pub.fecha_publicacion && <> · publicada {haceCuanto(pub.fecha_publicacion)}</>}
              </p>
              <div className="du-chips">
                <ChipEstado tipo="publicacion" valor={pub.estado}>{textoPublicacion(pub.estado)}</ChipEstado>
                {oferente && (
                  <Link to={`/admin/usuarios/${oferente.id}`} className="dp-oferente">
                    <Avatar nombre={nombrePropio(oferente.nombre)} apellido={nombrePropio(oferente.ap_paterno ?? '')} foto={oferente.foto_url} tamano={26} />
                    <span>{nombrePropio(`${oferente.nombre} ${oferente.ap_paterno ?? ''}`)}</span>
                    <InsigniaVerificacion verificado={oferente.verificado} />
                    <IconoSiguiente />
                  </Link>
                )}
              </div>
            </div>
          </div>
          <IlustracionPublicacion className="md-ilustracion du-ilustracion" />
        </header>

        <dl className="du-cifras" aria-label="Resumen de la publicación">
          <Cifra etiqueta="Arriendo mensual" icono="precio" valor={pub.costo_mensual} tono="info" formato={formatearPesos}
            detalle={pub.fecha_ultima_modificacion ? `Editada el ${dia(pub.fecha_ultima_modificacion)}` : `Desde el ${dia(pub.fecha_publicacion)}`} />
          <Cifra etiqueta="Cupos disponibles" icono="cupos" valor={pub.cupos_disponibles} tono={sinCupos ? 'espera' : 'ok'}
            detalle={`de ${pub.cupos_totales} en total`} />
          <Cifra etiqueta="Reportes" icono="bandera" valor={totalReportes} tono={abiertos ? 'error' : totalReportes ? 'espera' : 'ok'}
            detalle={abiertos ? `${abiertos} por resolver` : totalReportes ? 'Todos resueltos' : 'Sin reportes'} />
          <Cifra etiqueta="Acciones de moderación" icono="historial" valor={acciones.length} tono="violeta"
            detalle={acciones.length ? `Última: ${textoAccion(acciones[0].accion).toLowerCase()}` : 'Nunca moderada'} />
        </dl>

        {aviso.id === id && aviso.texto && <p className="exito md-mensaje" role="status">{aviso.texto}</p>}

        {banda && (
          <div className="du-banda" data-tono={banda.tono} role="note">
            <span className="du-banda-icono">{ICONOS[banda.icono]}</span>
            <div>
              <p className="du-banda-titulo">{banda.titulo}</p>
              <p className="du-banda-texto">{banda.texto}</p>
            </div>
          </div>
        )}

        {/* Lo que se revisa a la izquierda y la decisión a la derecha */}
        <div className="md-cuerpo du-cuerpo">
          <div className="md-columna dp-columna">
            <Actividad id="reportes" titulo="Reportes recibidos" icono="bandera" elementos={reportes}
              vacio={{ titulo: 'Sin reportes', texto: 'Ningún estudiante ha reportado esta publicación.' }}>
              {reportes.map((r) => (
                <li key={r.id}>
                  <Link to={`/admin/reportes/${r.id}`} className="du-fila" data-abierto={ABIERTOS.includes(r.estado) || undefined}>
                    <span className="du-fila-principal">
                      <strong>{textoMotivo(r.motivo)}</strong>
                      <span>N.º {r.codigo} · {dia(r.fecha_reporte)}</span>
                    </span>
                    <span className="du-fila-lado">
                      <ChipEstado tipo="reporte" valor={r.estado}>{textoEstadoReporte(r.estado)}</ChipEstado>
                      <span className="du-fila-flecha">{ICONOS.flecha}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </Actividad>

            <Actividad id="historial" titulo="Historial de moderación" icono="historial" elementos={acciones}
              vacio={{ titulo: 'Sin acciones', texto: 'Nadie de la administración ha moderado esta publicación.' }}>
              {acciones.map((a) => (
                <li key={`${a.accion}-${a.fecha_accion}`} className="dp-evento" data-tono={TONO_ACCION[a.accion] ?? 'neutro'}>
                  <span className="dp-evento-punto" aria-hidden="true" />
                  <div className="dp-evento-cuerpo">
                    <p className="dp-evento-titulo">
                      <strong>{textoAccion(a.accion)}</strong>
                      {a.motivo && <span className="dp-evento-motivo">{textoIncumplimiento(a.motivo)}</span>}
                    </p>
                    {a.justificacion && <blockquote className="md-cita">{a.justificacion}</blockquote>}
                    <p className="dp-evento-meta">
                      <time dateTime={a.fecha_accion}>{fechaHora.format(new Date(a.fecha_accion))}</time>
                      {a.admin && <> · por {nombrePropio(a.admin)}</>}
                    </p>
                  </div>
                </li>
              ))}
            </Actividad>
          </div>

          <aside className="md-lateral du-lateral" aria-label="Moderación">
            {eliminada
              ? <SinModeracion eliminadaPor={datos.eliminada_por} />
              : <Moderar key={pub.estado} pub={pub} ocultaPorCuenta={datos.oculta_por_cuenta} alTerminar={alTerminar} />}
          </aside>
        </div>

        {/* CA-29.3: la publicación tal como la ve un estudiante */}
        <section className="dp-vista" aria-labelledby="dp-titulo-vista">
          <div className="dp-vista-cabeza">
            <h2 className="du-tarjeta-titulo" id="dp-titulo-vista">
              <span className="du-tarjeta-icono">{ICONOS.ojo}</span>Así la ven los estudiantes
            </h2>
            {pub.estado !== 'activa' && pub.estado !== 'completa' && (
              <span className="dp-vista-nota">Ahora no la ven: es solo una vista previa</span>
            )}
          </div>
          {/* La misma ficha que abre un estudiante: con su panel, su cabecera, el botón de mensaje, reportar y
              quién publica. Los botones que son del estudiante se ven igual, pero aquí no hacen nada */}
          <FichaPublicacion key={pub.id} pub={pub}
            acciones={oferente && (
              <button type="button" className="boton boton-mensaje" data-vista title={SOLO_VISTA}
                onClick={(e) => e.preventDefault()}>
                <IconoMensajes /> Enviar mensaje
              </button>
            )}
            herramientas={(
              <button type="button" className="boton peligro-suave boton-reportar" data-vista title={SOLO_VISTA}
                onClick={(e) => e.preventDefault()}>
                <IconoBandera /> Reportar
              </button>
            )}>
            {oferente && (
              <section className="fp-tarjeta fp-quien" aria-label="Quién publica">
                <Link to={`/admin/usuarios/${oferente.id}`} className="fp-oferente">
                  <Avatar nombre={oferente.nombre} apellido={oferente.ap_paterno} foto={oferente.foto_url} tamano={120} />
                  <span className="fp-oferente-datos">
                    <span className="fp-oferente-rol">Publicado por</span>
                    <strong>{nombrePropio(`${oferente.nombre} ${oferente.ap_paterno ?? ''}`)}</strong>
                    {personales && <span className="fp-oferente-personal">{personales}</span>}
                    <InsigniaVerificacion verificado={oferente.verificado} />
                  </span>
                  <IconoSiguiente />
                </Link>
                {/* La compatibilidad depende de quién mira: aquí solo se indica dónde aparece */}
                <p className="fp-compat-nota">
                  Aquí cada estudiante ve su compatibilidad de hábitos con {nombrePropio(oferente.nombre)}.
                </p>
              </section>
            )}
          </FichaPublicacion>
        </section>
      </div>
    </PaginaAdmin>
  )
}
