import { useCallback, useEffect, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { api } from '../../api.js'
import Avatar from '../../componentes/Avatar.jsx'
import AvisoVerificacion from '../../componentes/AvisoVerificacion.jsx'
import { useSesion } from '../../sesion/SesionContext.jsx'
import { estaVerificado } from '../../sesion/verificacion.js'
import Conversacion from './Conversacion.jsx'
import { cuandoCorto, nombreDe } from './formato.js'
import './mensajes.css'

const REVISAR_LISTA_MS = 15000 // la conversación abierta se revisa más seguido (Conversacion.jsx)

function ItemConversacion({ conv, actual }) {
  const { otro, ultimo_mensaje: ultimo, no_leidos: noLeidos } = conv
  return (
    <li>
      <Link to={`/mensajes/${conv.id}`} className={`chat-item${noLeidos ? ' sin-leer' : ''}`}
        aria-current={actual ? 'page' : undefined}>
        <Avatar nombre={otro.nombre} apellido={otro.ap_paterno} foto={otro.foto_url} tamano={44} />
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
  return (
    <main className={`chat${id ? ' con-conversacion' : ''}`}>
      <section className="chat-lista" aria-labelledby="chat-titulo">
        <h1 id="chat-titulo">Mensajes</h1>
        {error && <p className="alerta" role="alert">{error}</p>}
        {!conversaciones && !error && <p className="cargando">Cargando conversaciones…</p>}
        {conversaciones?.length === 0 && (
          <div className="chat-sin-conversaciones">
            <p><strong>Aún no tienes conversaciones.</strong></p>
            <p>
              Escríbele a un oferente desde su publicación o a otro estudiante desde su perfil.
            </p>
            <div className="chat-sin-acciones">
              <Link to="/alojamientos" className="boton">Buscar alojamiento</Link>
              <Link to="/roomies" className="boton secundario">Encontrar roomie</Link>
            </div>
          </div>
        )}
        {conversaciones?.length > 0 && (
          <ul className="chat-items">
            {conversaciones.map((c) => <ItemConversacion key={c.id} conv={c} actual={c.id === id} />)}
          </ul>
        )}
      </section>

      <section className="chat-panel" aria-label="Conversación">
        {id ? (
          <Conversacion key={id} id={id} alCambiar={alCambiar} />
        ) : (
          <div className="chat-elige">
            <p>Elige una conversación para ver sus mensajes.</p>
          </div>
        )}
      </section>
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
