import { useCallback, useEffect, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { api } from '../../api.js'
import Avatar from '../../componentes/Avatar.jsx'
import AvisoVerificacion from '../../componentes/AvisoVerificacion.jsx'
import { useSesion } from '../../sesion/SesionContext.jsx'
import { estaVerificado } from '../../sesion/verificacion.js'
import Conversacion from './Conversacion.jsx'
import { cuandoCorto, nombreDe } from './formato.js'
import { IlustracionElegir, IlustracionSinConversaciones, SiluetaLista } from './Ilustraciones.jsx'
import './mensajes.css'

const REVISAR_LISTA_MS = 15000 // la conversación abierta se revisa más seguido (Conversacion.jsx)

function ItemConversacion({ conv, actual, orden }) {
  const { otro, ultimo_mensaje: ultimo, no_leidos: noLeidos } = conv
  return (
    // --orden: entrada en cascada corta la primera vez que aparece (no al refrescar la lista)
    <li style={{ '--orden': Math.min(orden, 10) }}>
      <Link to={`/mensajes/${conv.id}`} className={`chat-item${noLeidos ? ' sin-leer' : ''}`}
        aria-current={actual ? 'page' : undefined}>
        <span className="chat-item-avatar">
          <Avatar nombre={otro.nombre} apellido={otro.ap_paterno} foto={otro.foto_url} tamano={46} />
          {otro.verificado && <span className="chat-item-verificado" title="Estudiante verificado" />}
        </span>
        <span className="chat-item-textos">
          <span className="chat-item-fila">
            <strong>{nombreDe(otro)}</strong>
            <time dateTime={conv.fecha_actividad}>{cuandoCorto(conv.fecha_actividad)}</time>
          </span>
          <span className="chat-item-fila">
            <span className="chat-item-ultimo">
              {ultimo ? `${ultimo.es_mio ? 'Tú: ' : ''}${ultimo.texto}` : 'Aún no hay mensajes'}
            </span>
            {noLeidos > 0 && <span className="chat-item-contador" aria-label={`${noLeidos} sin leer`}>{noLeidos}</span>}
          </span>
        </span>
      </Link>
    </li>
  )
}

// Bajo el título: cuántas conversaciones esperan respuesta
function resumenDe(conversaciones) {
  if (!conversaciones) return 'Cargando tus conversaciones…'
  const sinLeer = conversaciones.filter((c) => c.no_leidos > 0).length
  if (sinLeer) return `${sinLeer} ${sinLeer === 1 ? 'conversación tiene' : 'conversaciones tienen'} mensajes sin leer`
  if (conversaciones.length) return 'Estás al día con todas tus conversaciones'
  return 'Aquí verás lo que hables con oferentes y posibles roomies'
}

// Lista de conversaciones a la izquierda y la conversación elegida a la derecha (en el celular, una a la vez)
function Bandeja({ id, revisarMensajes }) {
  const [lista, setLista] = useState({ conversaciones: null, error: '' })

  const cargarLista = useCallback(() => {
    api('/conversaciones')
      .then((conversaciones) => setLista({ conversaciones, error: '' }))
      .catch((err) => setLista((actual) => ({ ...actual, error: err.message })))
  }, [])

  useEffect(() => {
    cargarLista()
    const intervalo = setInterval(() => !document.hidden && cargarLista(), REVISAR_LISTA_MS)
    return () => clearInterval(intervalo)
  }, [cargarLista])

  // Al leer o enviar se actualizan la lista y el contador del menú
  const alCambiar = useCallback(() => {
    cargarLista()
    revisarMensajes?.()
  }, [cargarLista, revisarMensajes])

  const { conversaciones, error } = lista
  const sinLeer = conversaciones?.filter((c) => c.no_leidos > 0).length ?? 0
  // Sin ninguna conversación (y sin abrir una): un solo estado vacío a todo el ancho
  const vacia = conversaciones?.length === 0 && !id

  return (
    <main className="chat-pagina">
      <header className="chat-encabezado">
        <h1 id="chat-titulo">Mensajes</h1>
        <p aria-live="polite">{resumenDe(conversaciones)}</p>
      </header>

      <div className={`chat${id ? ' con-conversacion' : ''}${vacia ? ' vacia' : ''}`}>
        {vacia ? (
          <section className="chat-panel chat-estado" aria-labelledby="chat-vacia-titulo">
            <IlustracionSinConversaciones />
            <h2 id="chat-vacia-titulo">Aún no tienes conversaciones</h2>
            <p>Escríbele a un oferente desde su publicación o a otro estudiante desde su perfil.</p>
            <div className="chat-estado-acciones">
              <Link to="/alojamientos" className="boton">Buscar alojamiento</Link>
              <Link to="/roomies" className="boton secundario">Encontrar roomie</Link>
            </div>
          </section>
        ) : (
          <>
            <section className="chat-lista" aria-labelledby="chat-lista-titulo">
              <div className="chat-lista-cabeza">
                <h2 id="chat-lista-titulo">Conversaciones</h2>
                {sinLeer > 0 && <span className="chat-pastilla">{sinLeer} sin leer</span>}
              </div>
              {error && <p className="alerta" role="alert">{error}</p>}
              {!conversaciones && !error && <SiluetaLista />}
              {conversaciones?.length > 0 && (
                <ul className="chat-items">
                  {conversaciones.map((c, i) => <ItemConversacion key={c.id} conv={c} actual={c.id === id} orden={i} />)}
                </ul>
              )}
            </section>

            <section className="chat-panel" aria-label="Conversación">
              {id ? (
                // `previa`: la fila de la lista, para mostrar la cabecera al instante mientras llegan los mensajes
                <Conversacion key={id} id={id} previa={conversaciones?.find((c) => c.id === id)} alCambiar={alCambiar} />
              ) : (
                <div className="chat-estado">
                  <IlustracionElegir />
                  <h2>Elige una conversación</h2>
                  <p>Sus mensajes aparecerán aquí, y podrás responder desde abajo.</p>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  )
}

// /mensajes y /mensajes/:id. Sin la cuenta verificada solo se muestra el aviso (la API también lo exige)
export default function Mensajes() {
  const { id } = useParams()
  const { usuario } = useSesion()
  const { revisarMensajes } = useOutletContext() ?? {}
  if (!estaVerificado(usuario)) {
    return (
      <main className="aviso-pagina">
        <h1>Mensajes</h1>
        <AvisoVerificacion detalle="Podrás escribirles a otros estudiantes cuando tu cuenta esté verificada." />
      </main>
    )
  }
  return <Bandeja id={id} revisarMensajes={revisarMensajes} />
}
