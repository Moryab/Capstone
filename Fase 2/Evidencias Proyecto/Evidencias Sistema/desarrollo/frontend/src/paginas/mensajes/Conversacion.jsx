import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../../api.js'
import Avatar from '../../componentes/Avatar.jsx'
import InsigniaVerificacion from '../../componentes/InsigniaVerificacion.jsx'
import { formatearPesos } from '../../publicaciones.js'
import { mayusculaInicial as mayuscula } from '../../inicio/utilidades.js'
import { horaDe, mismoDia, nombreDe, tituloDia } from './formato.js'

const REVISAR_MS = 4000 // cada cuánto se piden los mensajes nuevos de la conversación abierta
const MAX_MENSAJE = 1000 // el mismo de backend/app/schemas/conversaciones.py
const AVISAR_DESDE = 900 // se muestra el contador de caracteres al acercarse al límite

// La publicación de la que se habla, dentro del mensaje
function TarjetaPublicacion({ pub }) {
  if (!pub.disponible) {
    return <p className="chat-adjunto no-disponible">«{pub.titulo}» ya no está disponible</p>
  }
  return (
    <Link to={`/alojamientos/${pub.id}`} className="chat-adjunto" state={{ desde: window.location.pathname }}>
      {pub.foto_url ? <img src={pub.foto_url} alt="" /> : <span className="chat-adjunto-sin-foto" aria-hidden="true" />}
      <span>
        <strong>{pub.titulo}</strong>
        <span>{formatearPesos(pub.costo_mensual)} / mes · {pub.comuna}</span>
      </span>
    </Link>
  )
}

const unir = (actuales, nuevos) => {
  const ids = new Set(actuales.map((m) => m.id))
  return [...actuales, ...nuevos.filter((m) => !ids.has(m.id))]
}

/** Una conversación: los mensajes (los nuevos llegan solos cada pocos segundos) y el cuadro para escribir. */
export default function Conversacion({ id, alCambiar }) {
  const { pathname, state } = useLocation()
  const navegar = useNavigate()
  const [estado, setEstado] = useState({ conv: null, mensajes: [], hayAnteriores: false, error: '' })
  // Al llegar desde un alojamiento («Enviar mensaje al oferente»), el mensaje lo adjunta y se sugiere un texto
  const [adjunto, setAdjunto] = useState(() => state?.publicacion ?? null)
  const [texto, setTexto] = useState(() => (state?.publicacion
    ? `Hola, me interesa tu publicación «${state.publicacion.titulo}». ¿Sigue disponible?`
    : ''))
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState('')
  const [cargandoAnteriores, setCargandoAnteriores] = useState(false)
  const lista = useRef(null)
  const ultimoId = useRef(null) // lo usa el intervalo sin reiniciarse con cada mensaje
  const scroll = useRef({ modo: 'final', alto: 0 }) // qué hacer con el scroll al cambiar los mensajes

  const { conv, mensajes, hayAnteriores, error } = estado
  useEffect(() => {
    ultimoId.current = mensajes.at(-1)?.id ?? null
  }, [mensajes])

  // Carga inicial (los últimos 50) y lectura de la conversación
  useEffect(() => {
    let vigente = true
    api(`/conversaciones/${id}/mensajes`)
      .then((r) => {
        if (!vigente) return
        scroll.current.modo = 'final'
        setEstado({ conv: r.conversacion, mensajes: r.mensajes, hayAnteriores: r.hay_anteriores, error: '' })
        alCambiar()
      })
      .catch((err) => vigente && setEstado((e) => ({ ...e, error: err.message })))
    return () => {
      vigente = false
    }
  }, [id, alCambiar])

  // Mensajes nuevos: cada pocos segundos, mientras la pestaña está a la vista
  const revisar = useCallback(async () => {
    if (document.hidden || !ultimoId.current) return
    try {
      const r = await api(`/conversaciones/${id}/mensajes?despues=${ultimoId.current}`)
      if (!r.mensajes.length) return
      const caja = lista.current
      // Solo se baja al final si la persona ya estaba abajo (si está leyendo más arriba, no se la mueve)
      scroll.current.modo = caja && caja.scrollHeight - caja.scrollTop - caja.clientHeight < 80 ? 'final' : 'quieto'
      setEstado((e) => ({ ...e, conv: r.conversacion, mensajes: unir(e.mensajes, r.mensajes) }))
      alCambiar()
    } catch {
      // Un corte momentáneo no interrumpe la conversación: se reintenta en la siguiente vuelta
    }
  }, [id, alCambiar])

  useEffect(() => {
    const intervalo = setInterval(revisar, REVISAR_MS)
    return () => clearInterval(intervalo)
  }, [revisar])

  // Después de dibujar: bajar al último mensaje o mantener la posición al cargar los anteriores
  useLayoutEffect(() => {
    const caja = lista.current
    if (!caja) return
    if (scroll.current.modo === 'final') caja.scrollTop = caja.scrollHeight
    else if (scroll.current.modo === 'anteriores') caja.scrollTop = caja.scrollHeight - scroll.current.alto
    scroll.current.modo = 'quieto'
  }, [mensajes])

  const cargarAnteriores = async () => {
    setCargandoAnteriores(true)
    try {
      const r = await api(`/conversaciones/${id}/mensajes?antes=${mensajes[0].id}`)
      scroll.current = { modo: 'anteriores', alto: lista.current.scrollHeight - lista.current.scrollTop }
      setEstado((e) => ({ ...e, mensajes: [...r.mensajes, ...e.mensajes], hayAnteriores: r.hay_anteriores }))
    } catch (err) {
      setErrorEnvio(err.message)
    } finally {
      setCargandoAnteriores(false)
    }
  }

  const enviar = async (e) => {
    e?.preventDefault()
    const limpio = texto.trim()
    if (!limpio || enviando) return
    setEnviando(true)
    setErrorEnvio('')
    try {
      const mensaje = await api(`/conversaciones/${id}/mensajes`, {
        metodo: 'POST', datos: { texto: limpio, publicacion_id: adjunto?.id ?? null },
      })
      scroll.current.modo = 'final'
      setEstado((est) => ({ ...est, mensajes: unir(est.mensajes, [mensaje]) }))
      setTexto('')
      if (adjunto) quitarAdjunto()
      alCambiar()
    } catch (err) {
      // La publicación ya no se puede adjuntar (por ejemplo, se pausó): se quita y el texto queda
      if (err.errores?.publicacion_id) quitarAdjunto()
      // 409: la otra persona ya no está disponible (cuenta suspendida o eliminada)
      if (err.estado === 409) setEstado((est) => ({ ...est, conv: { ...est.conv, otro: { ...est.conv.otro, disponible: false } } }))
      setErrorEnvio(err.errores?.texto ?? err.errores?.publicacion_id ?? err.message)
    } finally {
      setEnviando(false)
    }
  }

  // Se adjunta solo al primer mensaje: también se borra de la navegación para que recargar no lo repita
  const quitarAdjunto = () => {
    setAdjunto(null)
    navegar(pathname, { replace: true, state: null })
  }

  // Enter envía; Shift + Enter hace un salto de línea
  const alTeclear = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) enviar(e)
  }

  if (error) {
    return (
      <div className="chat-elige">
        <p>{error}</p>
        <Link to="/mensajes" className="boton secundario">Volver a mis mensajes</Link>
      </div>
    )
  }
  if (!conv) return <p className="cargando">Cargando conversación…</p>

  const { otro } = conv
  return (
    <div className="chat-conversacion">
      <header className="chat-cabecera">
        <Link to="/mensajes" className="chat-volver" aria-label="Volver a mis mensajes">←</Link>
        <Avatar nombre={otro.nombre} apellido={otro.ap_paterno} foto={otro.foto_url} tamano={40} />
        <div>
          {otro.disponible ? (
            <Link to={`/usuarios/${otro.id}`} className="chat-nombre" state={{ desde: `/mensajes/${id}` }}>
              {nombreDe(otro)} <InsigniaVerificacion verificado={otro.verificado} />
            </Link>
          ) : <span className="chat-nombre">{nombreDe(otro)}</span>}
          <small>{otro.disponible ? 'Ver perfil' : 'Ya no está disponible en RoomMatch'}</small>
        </div>
      </header>

      <div ref={lista} className="chat-mensajes">
        {hayAnteriores && (
          <button type="button" className="enlace-boton chat-anteriores" onClick={cargarAnteriores} disabled={cargandoAnteriores}>
            {cargandoAnteriores ? 'Cargando…' : 'Ver mensajes anteriores'}
          </button>
        )}
        {mensajes.length === 0 && (
          <p className="chat-primer-mensaje">Escríbele a {mayuscula(otro.nombre)} para comenzar la conversación.</p>
        )}
        {/* role="log": los lectores de pantalla anuncian los mensajes que llegan */}
        <ol className="chat-burbujas" role="log" aria-live="polite" aria-label={`Mensajes con ${nombreDe(otro)}`}>
          {mensajes.map((m, i) => (
            <Fragment key={m.id}>
              {(i === 0 || !mismoDia(mensajes[i - 1].fecha_envio, m.fecha_envio)) && (
                <li className="chat-dia" aria-hidden="true"><span>{tituloDia(m.fecha_envio)}</span></li>
              )}
              <li className={`chat-burbuja${m.es_mio ? ' mia' : ''}`}>
                <span className="visualmente-oculto">{m.es_mio ? 'Tú' : mayuscula(otro.nombre)}, {tituloDia(m.fecha_envio)}:</span>
                {m.publicacion && <TarjetaPublicacion pub={m.publicacion} />}
                <p>{m.texto}</p>
                <time dateTime={m.fecha_envio}>{horaDe(m.fecha_envio)}</time>
              </li>
            </Fragment>
          ))}
        </ol>
      </div>

      {otro.disponible && adjunto && (
        <div className="chat-adjuntando">
          <span>Sobre: <strong>{adjunto.titulo}</strong></span>
          <button type="button" className="enlace-boton" onClick={quitarAdjunto}
            aria-label={`No adjuntar «${adjunto.titulo}» al mensaje`}>
            Quitar
          </button>
        </div>
      )}
      {otro.disponible ? (
        <form className="chat-escribir" onSubmit={enviar}>
          <label htmlFor="chat-texto" className="visualmente-oculto">Escribe un mensaje</label>
          <textarea id="chat-texto" value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={alTeclear}
            maxLength={MAX_MENSAJE} rows={1} placeholder="Escribe un mensaje…"
            aria-describedby={errorEnvio ? 'chat-error' : undefined} />
          <button type="submit" className="boton" disabled={enviando || !texto.trim()}>
            {enviando ? 'Enviando…' : 'Enviar'}
          </button>
          {texto.length >= AVISAR_DESDE && (
            <span className="chat-contador">{texto.length}/{MAX_MENSAJE}</span>
          )}
        </form>
      ) : (
        <p className="chat-no-disponible">No puedes enviarle mensajes: su cuenta ya no está disponible.</p>
      )}
      {errorEnvio && <p className="campo-error chat-error" id="chat-error" role="alert">{errorEnvio}</p>}
    </div>
  )
}

