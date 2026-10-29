import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import Avatar from '../componentes/Avatar.jsx'
import InsigniaVerificacion from '../componentes/InsigniaVerificacion.jsx'
import { NivelCompatibilidad } from '../componentes/Compatibilidad.jsx'
import { mayusculaInicial } from '../inicio/utilidades.js'
import { formatearFecha, formatearPesos, textoDe, TIPOS } from '../publicaciones.js'
import { useSesion } from '../sesion/SesionContext.jsx'

// CA-17.3: el motivo es opcional; ayuda a mejorar las próximas propuestas (EP-08)
const MOTIVOS_RECHAZO = [
  { valor: '', texto: 'Prefiero no decirlo' },
  { valor: 'baja_compatibilidad', texto: 'No me parece compatible' },
  { valor: 'alojamiento_no_conviene', texto: 'El alojamiento no me conviene' },
  { valor: 'ya_encontro_alojamiento', texto: 'Ya encontré alojamiento' },
  { valor: 'otro', texto: 'Otro motivo' },
]

const ESTADOS_CERRADOS = { rechazado: 'Rechazada', expirado: 'Venció o se cerró' }

const nombreDe = (persona) => `${mayusculaInicial(persona.nombre)} ${persona.ap_paterno ?? ''}`.trim()

// Qué falta en una propuesta abierta, contado desde quien la mira
function estadoRespuestas(p) {
  const otro = mayusculaInicial(p.otro.nombre)
  if (p.mi_respuesta === 'aceptado') return `Aceptaste. Falta la respuesta de ${otro}.`
  if (p.su_respuesta === 'aceptado') return `${otro} ya aceptó. Falta tu respuesta.`
  return 'Ninguno ha respondido todavía.'
}

function TarjetaPropuesta({ p, alResponder }) {
  const [rechazando, setRechazando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const { publicacion: pub, otro } = p
  const abierta = p.estado === 'sugerido' || p.estado === 'pendiente'

  const enviar = async (accion) => {
    setOcupado(true)
    setError('')
    try {
      const datos = accion === 'rechazar' ? { motivo: motivo || null } : undefined
      const r = await api(`/matches/${p.id}/${accion}`, { metodo: 'POST', datos })
      alResponder(r.mensaje)
    } catch (err) {
      setError(err.message)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <li className={`propuesta${p.estado === 'confirmado' ? ' confirmada' : ''}`}>
      <div className="propuesta-alojamiento">
        <div className="propuesta-foto">
          {pub.foto_url ? <img src={pub.foto_url} alt="" loading="lazy" /> : <span>Sin fotos</span>}
        </div>
        <div>
          <p className="publicacion-meta">{textoDe(TIPOS, pub.tipo)}{pub.comuna && ` · ${pub.comuna}`}</p>
          <h3>
            {pub.visible || p.rol === 'oferente'
              ? <Link to={`/alojamientos/${pub.id}`} state={{ desde: '/propuestas' }}>{pub.titulo}</Link>
              : pub.titulo}
          </h3>
          {pub.costo_mensual != null && (
            <p className="publicacion-precio">{formatearPesos(pub.costo_mensual)} <span>/ mes</span></p>
          )}
        </div>
      </div>

      <div className="propuesta-persona">
        <Avatar nombre={otro.nombre} apellido={otro.ap_paterno} foto={otro.foto_url} tamano={44} />
        <div>
          <p className="propuesta-rol">{p.rol === 'buscador' ? 'Oferente' : 'Busca alojamiento'}</p>
          <Link to={`/usuarios/${otro.id}`} state={{ desde: '/propuestas' }}><strong>{nombreDe(otro)}</strong></Link>
          {' '}<InsigniaVerificacion verificado={otro.verificado} />
          <p className="publicacion-meta">{[otro.carrera, otro.institucion_sigla].filter(Boolean).join(' · ')}</p>
        </div>
      </div>

      <NivelCompatibilidad porcentaje={p.porcentaje} nivel={p.nivel} />

      {p.estado === 'confirmado' && (
        <p className="exito">Match confirmado el {formatearFecha(p.fecha_confirmacion)}. ¡Su convivencia ya comenzó!</p>
      )}

      {abierta && (
        <>
          <p className="propuesta-estado">
            {estadoRespuestas(p)} <span>Vence el {formatearFecha(p.vence)}.</span>
          </p>
          {error && <p className="alerta" role="alert">{error}</p>}

          {p.mi_respuesta === 'pendiente' && !rechazando && (
            <div className="propuesta-acciones">
              <button type="button" className="boton" onClick={() => enviar('aceptar')} disabled={ocupado}>
                {ocupado ? 'Enviando…' : 'Aceptar'}
              </button>
              <button type="button" className="boton secundario" onClick={() => setRechazando(true)} disabled={ocupado}>
                Rechazar
              </button>
            </div>
          )}

          {rechazando && (
            <div className="propuesta-rechazo">
              <div className="campo">
                <label htmlFor={`motivo-${p.id}`}>¿Por qué la rechazas? (opcional)</label>
                <select id={`motivo-${p.id}`} value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                  {MOTIVOS_RECHAZO.map(({ valor, texto }) => <option key={valor} value={valor}>{texto}</option>)}
                </select>
              </div>
              <div className="propuesta-acciones">
                <button type="button" className="boton peligro" onClick={() => enviar('rechazar')} disabled={ocupado}>
                  {ocupado ? 'Enviando…' : 'Rechazar propuesta'}
                </button>
                <button type="button" className="boton secundario" onClick={() => setRechazando(false)} disabled={ocupado}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </li>
  )
}

// HU-17: RoomMatch propone el match entre quien busca alojamiento y el oferente de uno compatible;
// ambos responden y, si los dos aceptan, empieza la convivencia
export default function Propuestas() {
  const { recargarUsuario } = useSesion()
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [cambiando, setCambiando] = useState(false)

  const cargar = useCallback(() => {
    return api('/matches')
      .then((d) => {
        setDatos(d)
        setError('')
      })
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const alternarBusqueda = async () => {
    setCambiando(true)
    setMensaje('')
    try {
      const r = await api('/matches/busqueda', { metodo: 'PUT', datos: { buscando: !datos.buscando } })
      setMensaje(r.propuestas_nuevas > 0 ? `${r.mensaje}. Ya tienes ${r.propuestas_nuevas} propuesta(s) nueva(s).` : r.mensaje)
      await Promise.all([cargar(), recargarUsuario()])
    } catch (err) {
      setMensaje(err.message)
    } finally {
      setCambiando(false)
    }
  }

  const alResponder = async (texto) => {
    setMensaje(texto)
    await Promise.all([cargar(), recargarUsuario()])
  }

  if (!datos && !error) return <p className="cargando">Cargando propuestas…</p>
  if (!datos) return <main className="tarjeta"><p className="alerta" role="alert">{error}</p></main>

  const paraMi = datos.propuestas.filter((p) => p.rol === 'buscador')
  const paraMisAlojamientos = datos.propuestas.filter((p) => p.rol === 'oferente')

  return (
    <main className="pagina-propuestas">
      <div className="encabezado-pagina">
        <div>
          <h1>Propuestas de match</h1>
          <p className="subtitulo">
            RoomMatch te propone alojamientos de estudiantes con hábitos muy compatibles con los tuyos.
            Si ambos aceptan, el match queda confirmado.
          </p>
        </div>
      </div>

      {mensaje && <p className="exito" role="status">{mensaje}</p>}

      <section className="busqueda-interruptor" aria-labelledby="titulo-buscando">
        <div>
          <h2 id="titulo-buscando">Estoy buscando alojamiento</h2>
          <p>
            {datos.con_convivencia
              ? 'Ya tienes una convivencia activa, así que no recibes propuestas nuevas.'
              : datos.buscando
                ? 'Te proponemos hasta 3 alojamientos a la vez, con compatibilidad alta y según tus preferencias de búsqueda guardadas.'
                : 'Actívalo para que RoomMatch te proponga alojamientos. Si solo ofreces uno, déjalo apagado.'}
          </p>
        </div>
        <button type="button" role="switch" aria-checked={datos.buscando} aria-labelledby="titulo-buscando"
          className={`interruptor${datos.buscando ? ' activo' : ''}`} onClick={alternarBusqueda}
          disabled={cambiando || datos.con_convivencia}>
          <span />
        </button>
      </section>

      {datos.confirmados.length > 0 && (
        <section className="propuestas-seccion">
          <h2>Tu convivencia</h2>
          <ul className="propuestas-lista">
            {datos.confirmados.map((p) => <TarjetaPropuesta key={p.id} p={p} alResponder={alResponder} />)}
          </ul>
        </section>
      )}

      <section className="propuestas-seccion">
        <h2>Alojamientos para ti</h2>
        {paraMi.length > 0 ? (
          <ul className="propuestas-lista">
            {paraMi.map((p) => <TarjetaPropuesta key={p.id} p={p} alResponder={alResponder} />)}
          </ul>
        ) : (
          <p className="sin-dato">
            {datos.buscando
              ? 'Aún no encontramos alojamientos con compatibilidad alta para ti. Te avisaremos cuando aparezca uno.'
              : 'Activa «Estoy buscando alojamiento» para recibir propuestas.'}
            {datos.buscando && <> Revisa también tus <Link to="/alojamientos">preferencias de búsqueda</Link>.</>}
          </p>
        )}
      </section>

      <section className="propuestas-seccion">
        <h2>Para tus alojamientos</h2>
        {paraMisAlojamientos.length > 0 ? (
          <ul className="propuestas-lista">
            {paraMisAlojamientos.map((p) => <TarjetaPropuesta key={p.id} p={p} alResponder={alResponder} />)}
          </ul>
        ) : (
          <p className="sin-dato">
            Cuando alguien muy compatible contigo busque alojamiento, te lo propondremos aquí.
            {' '}<Link to="/publicaciones/nueva">Publica un alojamiento</Link> si tienes uno disponible.
          </p>
        )}
      </section>

      {datos.historial.length > 0 && (
        <details className="propuestas-historial">
          <summary>Propuestas anteriores ({datos.historial.length})</summary>
          <ul>
            {datos.historial.map((p) => (
              <li key={p.id}>
                <strong>{p.publicacion.titulo}</strong> con {nombreDe(p.otro)}
                <span> · {ESTADOS_CERRADOS[p.estado] ?? p.estado}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </main>
  )
}
