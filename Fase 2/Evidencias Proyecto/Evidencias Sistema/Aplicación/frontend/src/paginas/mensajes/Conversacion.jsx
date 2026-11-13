import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../../api.js'
import Avatar from '../../componentes/Avatar.jsx'
import InsigniaVerificacion from '../../componentes/InsigniaVerificacion.jsx'
import { formatearPesos } from '../../publicaciones.js'
import { mayusculaInicial as mayuscula } from '../../inicio/utilidades.js'
import { horaDe, mismoDia, nombreDe, tituloDia } from './formato.js'
import { IlustracionSaludo, SiluetaConversacion, SiluetaMensajes } from './Ilustraciones.jsx'

const REVISAR_MS = 4000 // cada cuánto se piden los mensajes nuevos de la conversación abierta
const MAX_MENSAJE = 1000 // el mismo de backend/app/schemas/conversaciones.py
const AVISAR_DESDE = 900 // se muestra el contador de caracteres al acercarse al límite

const IconoEnviar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h13M13 6l6 6-6 6" />
  </svg>
)

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

/*
 * Lo último que se vio de cada conversación, por id. Al volver a una ya abierta se muestra al instante
 * (sin silueta ni parpadeo) y se actualiza por detrás. Solo vive mientras la pestaña está abierta
 */
const cache = new Map()

const unir = (actuales, nuevos) => {
  const ids = new Set(actuales.map((m) => m.id))
  return [...actuales, ...nuevos.filter((m) => !ids.has(m.id))]
}

/** Una conversación: los mensajes (los nuevos llegan solos cada pocos segundos) y el cuadro para escribir. */
export default function Conversacion({ id, previa, alCambiar }) {
  const { pathname, state } = useLocation()
  const navegar = useNavigate()
  // Con caché: lo de la última vez. Sin caché: la cabecera sale de la fila de la lista (`previa`) y los
  // mensajes quedan «cargando». Nunca se muestra nada de otra conversación: el estado es de este id
  const [estado, setEstado] = useState(() => {
    const guardado = cache.get(id)
    if (guardado) return { ...guardado, cargado: true, error: '' }
    return { conv: previa ? { id, otro: previa.otro } : null, mensajes: [], hayAnteriores: false, cargado: false, error: '' }
  })
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
  // Los mensajes que ya estaban al abrir (o al cargar los anteriores) no se animan; solo los que llegan
  const yaVistos = useRef(new Set(cache.get(id)?.mensajes.map((m) => m.id)))

  const { conv, mensajes, hayAnteriores, cargado, error } = estado
  useEffect(() => {
    ultimoId.current = mensajes.at(-1)?.id ?? null
  }, [mensajes])

  // Lo que se ve queda guardado para la próxima vez que se abra esta conversación
  useEffect(() => {
    if (cargado && conv) cache.set(id, { conv, mensajes, hayAnteriores })
  }, [id, cargado, conv, mensajes, hayAnteriores])

  // La cabecera puede salir de la lista si esta llega después de abrir la conversación
  useEffect(() => {
    if (previa) setEstado((e) => (e.conv ? e : { ...e, conv: { id, otro: previa.otro } }))
  }, [id, previa])

  // Carga inicial (los últimos 50) y lectura de la conversación. `vigente` descarta la respuesta si
  // mientras tanto se abrió otra conversación (este componente se desmonta al cambiar de id)
  useEffect(() => {
    let vigente = true
    api(`/conversaciones/${id}/mensajes`)
      .then((r) => {
        if (!vigente) return
        const caja = lista.current
        const abajo = !caja || caja.scrollHeight - caja.scrollTop - caja.clientHeight < 80
        setEstado((e) => {
          // Desde la caché: si no cambió nada, no se vuelve a dibujar (y el scroll no se mueve)
          const iguales = e.cargado && e.mensajes.length === r.mensajes.length
            && e.mensajes.at(-1)?.id === r.mensajes.at(-1)?.id
          if (iguales) return { ...e, conv: r.conversacion }
          // Los que ya se veían (o los de la primera carga) no se animan; solo los nuevos desde la caché
          if (!e.cargado) r.mensajes.forEach((m) => yaVistos.current.add(m.id))
          scroll.current.modo = !e.cargado || abajo ? 'final' : 'quieto'
          return { conv: r.conversacion, mensajes: r.mensajes, hayAnteriores: r.hay_anteriores, cargado: true, error: '' }
        })
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

  // Antes de pintar: al abrir la conversación se baja al final de inmediato (sin animación), así nunca se
  // ve el scroll recorriendo los mensajes. Los mensajes nuevos bajan con suavidad; al cargar los
  // anteriores se mantiene la posición
  const primeraVez = useRef(true)
  useLayoutEffect(() => {
    const caja = lista.current
    if (!caja) return
    if (primeraVez.current && mensajes.length) {
      primeraVez.current = false
      caja.scrollTop = caja.scrollHeight
    } else if (scroll.current.modo === 'final') {
      const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      caja.scrollTo({ top: caja.scrollHeight, behavior: quieto ? 'auto' : 'smooth' })
    } else if (scroll.current.modo === 'anteriores') {
      caja.scrollTop = caja.scrollHeight - scroll.current.alto
    }
    scroll.current.modo = 'quieto'
  }, [mensajes])

  const cargarAnteriores = async () => {
    setCargandoAnteriores(true)
    try {
      const r = await api(`/conversaciones/${id}/mensajes?antes=${mensajes[0].id}`)
      scroll.current = { modo: 'anteriores', alto: lista.current.scrollHeight - lista.current.scrollTop }
      r.mensajes.forEach((m) => yaVistos.current.add(m.id))
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

  // Las burbujas solo se vuelven a dibujar cuando cambian los mensajes, no con cada letra que se escribe
  const otroConv = conv?.otro
  const burbujas = useMemo(() => otroConv && mensajes.map((m, i) => {
    const anterior = mensajes[i - 1]
    const nuevoDia = !anterior || !mismoDia(anterior.fecha_envio, m.fecha_envio)
    // Varios seguidos de la misma persona van juntos, como un solo bloque
    const seguido = !nuevoDia && anterior.es_mio === m.es_mio
    const clases = ['chat-burbuja', m.es_mio && 'mia', seguido && 'seguida', !yaVistos.current.has(m.id) && 'entra']
    return (
      <Fragment key={m.id}>
        {nuevoDia && (
          <li className="chat-dia" aria-hidden="true"><span>{tituloDia(m.fecha_envio)}</span></li>
        )}
        <li className={clases.filter(Boolean).join(' ')}>
          <span className="visualmente-oculto">{m.es_mio ? 'Tú' : mayuscula(otroConv.nombre)}, {tituloDia(m.fecha_envio)}:</span>
          {m.publicacion && <TarjetaPublicacion pub={m.publicacion} />}
          <p>{m.texto}</p>
          <time dateTime={m.fecha_envio}>{horaDe(m.fecha_envio)}</time>
        </li>
      </Fragment>
    )
  }), [mensajes, otroConv])

  if (error) {
    return (
      <div className="chat-estado">
        <h2>No pudimos abrir esta conversación</h2>
        <p>{error}</p>
        <Link to="/mensajes" className="boton secundario">Volver a mis mensajes</Link>
      </div>
    )
  }
  // Solo si se entra directo por la URL antes de que llegue la lista: aún no se sabe con quién es
  if (!conv) return <SiluetaConversacion />

  const { otro } = conv
  return (
    <div className="chat-conversacion">
      <header className="chat-cabecera">
        <Link to="/mensajes" className="chat-volver" aria-label="Volver a mis mensajes">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        </Link>
        <Avatar nombre={otro.nombre} apellido={otro.ap_paterno} foto={otro.foto_url} tamano={44} />
        <div className="chat-cabecera-textos">
          <span className="chat-nombre">{nombreDe(otro)}</span>
          {otro.disponible
            ? <InsigniaVerificacion verificado={otro.verificado} />
            : <small>Ya no está disponible en RoomMatch</small>}
        </div>
        {otro.disponible && (
          <Link to={`/usuarios/${otro.id}`} className="chat-ver-perfil" state={{ desde: `/mensajes/${id}` }}>
            Ver perfil
          </Link>
        )}
      </header>

      <div ref={lista} className="chat-mensajes" aria-busy={!cargado}>
        {/* Mientras llegan los mensajes: una silueta discreta en el mismo espacio (nada se reacomoda) */}
        {!cargado && <SiluetaMensajes />}
        {hayAnteriores && (
          <button type="button" className="enlace-boton chat-anteriores" onClick={cargarAnteriores} disabled={cargandoAnteriores}>
            {cargandoAnteriores ? 'Cargando…' : 'Ver mensajes anteriores'}
          </button>
        )}
        {cargado && mensajes.length === 0 && (
          <div className="chat-estado chat-primer-mensaje">
            <IlustracionSaludo />
            <p>Escríbele a {mayuscula(otro.nombre)} para comenzar la conversación.</p>
          </div>
        )}
        {/* role="log": los lectores de pantalla anuncian los mensajes que llegan */}
        <ol className="chat-burbujas" role="log" aria-live="polite" aria-label={`Mensajes con ${nombreDe(otro)}`}>
          {burbujas}
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
          <button type="submit" className="chat-enviar" disabled={enviando || !texto.trim()}
            aria-label={enviando ? 'Enviando' : 'Enviar mensaje'} title="Enviar (Enter)" data-enviando={enviando || undefined}>
            <IconoEnviar />
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

