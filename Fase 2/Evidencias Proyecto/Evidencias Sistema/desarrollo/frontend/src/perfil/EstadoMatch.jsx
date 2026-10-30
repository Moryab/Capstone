import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { formatearPorcentaje } from '../compatibilidad.js'
import { formatearFecha, formatearPesos } from '../publicaciones.js'
import { mayuscula } from './datos.js'
import { IconoCandado, IconoCheck, IconoCorazon, IconoMensaje, IconoTelefono } from './iconos.jsx'

// CA-17.3: el motivo es opcional (mismas opciones que en «Propuestas de match»)
const MOTIVOS = [
  { valor: '', texto: 'Prefiero no decirlo' },
  { valor: 'baja_compatibilidad', texto: 'No me parece compatible' },
  { valor: 'alojamiento_no_conviene', texto: 'El alojamiento no me conviene' },
  { valor: 'ya_encontro_alojamiento', texto: 'Ya encontré alojamiento' },
  { valor: 'otro', texto: 'Otro motivo' },
]

const textoRespuestas = (p, nombre) => {
  if (p.mi_respuesta === 'aceptado') return `Aceptaste. Falta la respuesta de ${nombre}.`
  if (p.su_respuesta === 'aceptado') return `${nombre} ya aceptó. Falta tu respuesta.`
  return 'Ninguno ha respondido todavía.'
}

function Alojamiento({ pub }) {
  return (
    <div className="p2-match-alojamiento">
      <span className="p2-match-foto">{pub.foto_url ? <img src={pub.foto_url} alt="" loading="lazy" /> : <IconoCorazon />}</span>
      <span>
        <strong>{pub.titulo}</strong>
        <span>{[pub.comuna, pub.costo_mensual && `${formatearPesos(pub.costo_mensual)} / mes`].filter(Boolean).join(' · ')}</span>
      </span>
    </div>
  )
}

/**
 * Columna lateral del perfil de otro estudiante: estado del match según los datos reales.
 * Sin propuesta solo informa (no hay botones para proponer ni contactar). `alCambiar` avisa
 * cuando cambia (por ejemplo, al confirmarse), para recargar el perfil y mostrar el teléfono.
 */
export function TarjetaEstadoMatch({ match, nombre, alCambiar }) {
  const n = mayuscula(nombre)
  const { estado, propuesta: p } = match
  const [rechazando, setRechazando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const responder = async (accion) => {
    setOcupado(true)
    setMensaje('')
    try {
      const datos = accion === 'rechazar' ? { motivo: motivo || null } : undefined
      const r = await api(`/matches/${p.id}/${accion}`, { metodo: 'POST', datos })
      setMensaje(r.mensaje)
      setRechazando(false)
      await match.recargar()
      alCambiar?.()
    } catch (err) {
      setMensaje(err.message)
    } finally {
      setOcupado(false)
    }
  }

  let contenido
  if (estado === 'cargando') {
    contenido = <p className="p2-vacio">Revisando propuestas…</p>
  } else if (estado === 'confirmado') {
    contenido = (
      <>
        <p className="p2-match-estado confirmado"><IconoCheck /> Match confirmado</p>
        <p className="p2-match-texto">
          Ambos aceptaron{p.fecha_confirmacion ? ` el ${formatearFecha(p.fecha_confirmacion)}` : ''}. Ya pueden coordinar la convivencia.
        </p>
        <Alojamiento pub={p.publicacion} />
      </>
    )
  } else if (estado === 'abierta') {
    contenido = (
      <>
        <p className="p2-match-estado abierta"><IconoCorazon tamano={18} /> RoomMatch les propuso un match</p>
        <p className="p2-match-texto">
          {formatearPorcentaje(p.porcentaje)} de compatibilidad. {textoRespuestas(p, n)}
          {p.vence && <> La propuesta vence el {formatearFecha(p.vence)}.</>}
        </p>
        <Alojamiento pub={p.publicacion} />
        {p.mi_respuesta !== 'aceptado' && (
          rechazando ? (
            <div className="p2-match-rechazo">
              <label htmlFor="p2-motivo">¿Por qué la rechazas? (opcional)</label>
              <select id="p2-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                {MOTIVOS.map(({ valor, texto }) => <option key={valor} value={valor}>{texto}</option>)}
              </select>
              <div className="p2-match-acciones">
                <button type="button" className="boton secundario" onClick={() => setRechazando(false)} disabled={ocupado}>Volver</button>
                <button type="button" className="boton peligro" onClick={() => responder('rechazar')} disabled={ocupado}>Rechazar</button>
              </div>
            </div>
          ) : (
            <div className="p2-match-acciones">
              <button type="button" className="boton" onClick={() => responder('aceptar')} disabled={ocupado}>Aceptar</button>
              <button type="button" className="boton secundario" onClick={() => setRechazando(true)} disabled={ocupado}>Rechazar</button>
            </div>
          )
        )}
        <Link to="/propuestas" className="p2-boton-texto">Ver todas mis propuestas</Link>
      </>
    )
  } else {
    contenido = (
      <>
        <p className="p2-match-estado ninguna"><IconoCorazon tamano={18} /> Sin propuesta de match</p>
        <p className="p2-match-texto">
          {estado === 'cerrada'
            ? `La propuesta anterior con ${n} se cerró. `
            : ''}
          RoomMatch te propondrá estudiantes compatibles contigo según sus hábitos y alojamientos disponibles.
        </p>
      </>
    )
  }

  return (
    <section id="p2-estado-match" className={`p2-tarjeta p2-match p2-anima estado-${estado}`} aria-labelledby="p2-titulo-match">
      <h2 id="p2-titulo-match">Estado del match</h2>
      {contenido}
      {mensaje && <p className="p2-match-mensaje" role="status">{mensaje}</p>}
    </section>
  )
}

// Barra fija del móvil: el estado del match resumido, con un enlace a la tarjeta completa
export function BarraEstadoMatch({ match }) {
  const textos = {
    confirmado: 'Match confirmado',
    abierta: match.propuesta?.mi_respuesta === 'aceptado' ? 'Aceptaste la propuesta' : 'Tienes una propuesta de match',
    cerrada: 'Sin propuesta de match',
    ninguna: 'Sin propuesta de match',
  }
  if (!textos[match.estado]) return null
  return (
    <a href="#p2-estado-match" className={`p2-barra-match estado-${match.estado}`}>
      <IconoCorazon tamano={18} /> {textos[match.estado]}
      <span className="p2-barra-ver">Ver</span>
    </a>
  )
}

// +56912345678 → +56 9 1234 5678
const formatear = (t) => {
  const m = /^\+56(\d)(\d{4})(\d{4})$/.exec(t ?? '')
  return m ? `+56 ${m[1]} ${m[2]} ${m[3]}` : t
}

/**
 * Contacto: el teléfono solo llega desde la API con match confirmado (o en el propio perfil).
 * Mientras tanto, bloqueado con candado.
 */
export function TarjetaContacto({ perfil }) {
  const propio = perfil.es_propio
  const visible = perfil.contacto_visible && perfil.telefono
  const numero = perfil.telefono?.replace(/\D/g, '')
  return (
    <section className={`p2-tarjeta p2-contacto p2-anima${visible ? '' : ' bloqueado'}`} aria-labelledby="p2-titulo-contacto">
      <h2 id="p2-titulo-contacto"><IconoTelefono /> Contacto</h2>
      {visible ? (
        <>
          <p className="p2-telefono">{formatear(perfil.telefono)}</p>
          {propio ? (
            <p className="p2-nota">Solo lo ven tus matches confirmados.</p>
          ) : (
            <div className="p2-match-acciones">
              <a href={`tel:+${numero}`} className="boton"><IconoTelefono /> Llamar</a>
              <a href={`https://wa.me/${numero}`} className="boton secundario" target="_blank" rel="noreferrer"><IconoMensaje /> WhatsApp</a>
            </div>
          )}
        </>
      ) : (
        <div className="p2-candado">
          <span className="p2-candado-icono"><IconoCandado /></span>
          <p>
            {propio
              ? 'Agrega tu teléfono en «Editar perfil»: es la forma en que tus matches te contactan.'
              : `El teléfono de ${mayuscula(perfil.nombre)} se muestra al confirmar el match.`}
          </p>
        </div>
      )}
    </section>
  )
}
