import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import AnilloCompatibilidad from '../componentes/AnilloCompatibilidad.jsx'
import AvisoVerificacion from '../componentes/AvisoVerificacion.jsx'
import Avatar from '../componentes/Avatar.jsx'
import BotonMensaje from '../componentes/BotonMensaje.jsx'
import Confirmar from '../componentes/Confirmar.jsx'
import { IconoPersona, IconoUbicacion } from '../componentes/Iconos.jsx'
import { IconoAuto, IconoDucha, IconoGastos, IconoSede, IconoCama } from '../componentes/IconosAlojamiento.jsx'
import InsigniaVerificacion from '../componentes/InsigniaVerificacion.jsx'
import SinFoto from '../componentes/SinFoto.jsx'
import { tituloCategoria } from '../cuestionario.js'
import { mayusculaInicial } from '../inicio/utilidades.js'
import { IconoHabito } from '../perfil/iconos.jsx'
import { formatearFecha, formatearPesos, textoDe, textoDistancia, TIPOS } from '../publicaciones.js'
import { MOTIVOS_FIN } from './evaluacion/Terminar.jsx'
import { useSesion } from '../sesion/SesionContext.jsx'
import { estaVerificado } from '../sesion/verificacion.js'
import './propuestas.css'

// CA-17.3: el motivo es opcional; ayuda a mejorar las próximas propuestas (EP-08)
const MOTIVOS_RECHAZO = [
  { valor: '', texto: 'Prefiero no decirlo' },
  { valor: 'baja_compatibilidad', texto: 'No me parece compatible' },
  { valor: 'alojamiento_no_conviene', texto: 'El alojamiento no me conviene' },
  { valor: 'ya_encontro_alojamiento', texto: 'Ya encontré alojamiento' },
  { valor: 'otro', texto: 'Otro motivo' },
]

const ESTADOS_CERRADOS = { rechazado: 'Rechazada', expirado: 'Venció o se cerró', finalizado: 'Convivencia terminada' }

const nombreDe = (persona) => `${mayusculaInicial(persona.nombre)} ${persona.ap_paterno ? mayusculaInicial(persona.ap_paterno) : ''}`.trim()

// Cuántos hábitos en común se muestran como etiqueta; el resto se resume como «+N»
const COINCIDENCIAS_VISIBLES = 3

// «Vence en 5 días»: cuánto le queda a una propuesta abierta
function textoVence(iso) {
  const dias = Math.ceil((new Date(iso) - Date.now()) / 86_400_000)
  if (dias <= 0) return 'Vence hoy'
  if (dias === 1) return 'Vence mañana'
  return `Vence en ${dias} días`
}

// Etiqueta de estado sobre la foto, contada desde quien mira
function estadoDe(p) {
  const otro = mayusculaInicial(p.otro.nombre)
  if (p.estado === 'confirmado') return { tono: 'confirmado', texto: 'Match confirmado' }
  if (p.mi_respuesta === 'aceptado') return { tono: 'esperando', texto: `Esperando a ${otro}` }
  if (p.su_respuesta === 'aceptado') return { tono: 'urgente', texto: `${otro} ya aceptó` }
  return { tono: 'nueva', texto: 'Nueva propuesta' }
}

// Quién ya respondió: los dos tienen que aceptar para que el match se confirme
function Respuestas({ p }) {
  const otro = mayusculaInicial(p.otro.nombre)
  const filas = [
    { quien: 'Tú', acepto: p.mi_respuesta === 'aceptado' },
    { quien: otro, acepto: p.su_respuesta === 'aceptado' },
  ]
  return (
    <ul className="pp-respuestas" aria-label="Respuestas">
      {filas.map((f) => (
        <li key={f.quien} className={f.acepto ? 'ok' : undefined}>
          <span className="pp-punto" aria-hidden="true">{f.acepto ? '✓' : ''}</span>
          {f.quien}: {f.acepto ? (f.quien === 'Tú' ? 'aceptaste' : 'aceptó') : 'falta responder'}
        </li>
      ))}
    </ul>
  )
}

// Por qué RoomMatch propone este match: los hábitos en que coinciden
function PorQue({ categorias }) {
  if (!categorias?.length) return null
  const visibles = categorias.slice(0, COINCIDENCIAS_VISIBLES)
  const resto = categorias.length - visibles.length
  return (
    <div className="pp-porque">
      <p className="pp-rotulo">Te lo proponemos porque coinciden en</p>
      <ul>
        {visibles.map((c) => <li key={c}><IconoHabito clave={c} tamano={15} />{tituloCategoria(c)}</li>)}
        {resto > 0 && (
          <li className="pp-mas" title={categorias.slice(COINCIDENCIAS_VISIBLES).map(tituloCategoria).join(', ')}>+{resto}</li>
        )}
      </ul>
    </div>
  )
}

// Lo que incluye el alojamiento, solo lo que sí tiene
function Incluye({ pub }) {
  const c = pub.caracteristicas ?? {}
  const datos = [
    pub.gastos_incluidos && { clave: 'gastos', icono: <IconoGastos />, texto: 'Gastos incluidos' },
    c.amoblado && { clave: 'amoblado', icono: <IconoCama />, texto: 'Amoblado' },
    c.banio_privado && { clave: 'banio', icono: <IconoDucha />, texto: 'Baño privado' },
    c.estacionamiento && { clave: 'auto', icono: <IconoAuto />, texto: 'Estacionamiento' },
  ].filter(Boolean)
  if (!datos.length) return null
  return (
    <ul className="pp-incluye" aria-label="Incluye">
      {datos.map((d) => <li key={d.clave}>{d.icono}{d.texto}</li>)}
    </ul>
  )
}

// Antes de aceptar se explica qué pasa: si el otro ya aceptó, el match se confirma en ese momento
function textoConfirmacion(p) {
  const otro = mayusculaInicial(p.otro.nombre)
  const efectos = p.rol === 'buscador'
    ? 'empieza su convivencia, se ocupa un cupo del alojamiento, podrán ver sus teléfonos y se cierran tus otras propuestas'
    : 'empieza su convivencia, se ocupa un cupo de tu alojamiento y podrán ver sus teléfonos'
  return p.su_respuesta === 'aceptado'
    ? `${otro} ya aceptó, así que el match se confirmará ahora: ${efectos}. No se puede deshacer.`
    : `Si ${otro} también acepta, el match quedará confirmado: ${efectos}.`
}

function TarjetaPropuesta({ p, alResponder, orden }) {
  const [confirmando, setConfirmando] = useState(false)
  const [rechazando, setRechazando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const { publicacion: pub, otro } = p
  const abierta = p.estado === 'sugerido' || p.estado === 'pendiente'
  const estado = estadoDe(p)
  const enlazable = pub.visible || p.rol === 'oferente'

  const enviar = async (accion) => {
    setOcupado(true)
    setError('')
    try {
      const datos = accion === 'rechazar' ? { motivo: motivo || null } : undefined
      const r = await api(`/matches/${p.id}/${accion}`, { metodo: 'POST', datos })
      setConfirmando(false)
      alResponder(r.mensaje)
    } catch (err) {
      setConfirmando(false)
      setError(err.message)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <li className={`pp-tarjeta pp-${estado.tono}`} style={{ '--orden': Math.min(orden, 9) }}>
      <div className="pp-foto">
        {pub.foto_url ? <img src={pub.foto_url} alt="" loading="lazy" /> : <SinFoto />}
        <span className="pp-tipo">{textoDe(TIPOS, pub.tipo)}</span>
        <span className="pp-estado">{estado.texto}</span>
        {abierta && <span className="pp-vence">{textoVence(p.vence)}</span>}
      </div>

      <div className="pp-cuerpo">
        <div className="pp-alojamiento">
          {pub.costo_mensual != null && (
            <p className="pp-precio">{formatearPesos(pub.costo_mensual)}<span> / mes</span></p>
          )}
          <h3 className="pp-titulo">
            {enlazable
              ? <Link to={`/alojamientos/${pub.id}`} state={{ desde: '/propuestas' }}>{pub.titulo}</Link>
              : pub.titulo}
          </h3>
          <ul className="pp-datos">
            {pub.comuna && <li><IconoUbicacion /> {pub.comuna}</li>}
            {/* Distancia a la sede: le importa a quien busca, no al oferente de su propio alojamiento */}
            {p.rol === 'buscador' && pub.distancia_km != null && <li><IconoSede /> {textoDistancia(pub.distancia_km)}</li>}
            {pub.cupos_disponibles != null && (
              <li>
                <IconoPersona />
                {pub.cupos_disponibles === 0
                  ? 'Sin cupos disponibles'
                  : `${pub.cupos_disponibles} de ${pub.cupos_totales} ${pub.cupos_totales === 1 ? 'cupo disponible' : 'cupos disponibles'}`}
              </li>
            )}
          </ul>
          <Incluye pub={pub} />
        </div>

        <div className="pp-persona">
          <Avatar nombre={otro.nombre} apellido={otro.ap_paterno} foto={otro.foto_url} tamano={44} />
          <div className="pp-persona-datos">
            <p className="pp-rol">{p.rol === 'buscador' ? 'Oferente' : 'Busca alojamiento'}</p>
            <Link to={`/usuarios/${otro.id}`} state={{ desde: '/propuestas' }} className="pp-nombre">{nombreDe(otro)}</Link>
            <InsigniaVerificacion verificado={otro.verificado} />
          </div>
          <AnilloCompatibilidad porcentaje={p.porcentaje} nivel={p.nivel} />
        </div>

        <PorQue categorias={p.categorias_coincidentes} />

        {abierta && <Respuestas p={p} />}

        {p.estado === 'confirmado' && (
          <p className="pp-confirmado">Match confirmado el {formatearFecha(p.fecha_confirmacion)}. ¡Su convivencia ya comenzó!</p>
        )}
        {/* HU-18: evaluación de la convivencia al mes */}
        {p.evaluacion && !p.evaluacion.evaluada && !p.evaluacion.habilitada && (
          <p className="pp-nota">Podrás evaluar la convivencia desde el {formatearFecha(p.evaluacion.fecha_habilitacion)}.</p>
        )}
        {error && <p className="alerta" role="alert">{error}</p>}

        {/* Acciones: siempre al fondo, así las tarjetas de una fila terminan alineadas */}
        <div className="pp-acciones">
          {abierta && p.mi_respuesta === 'pendiente' && !rechazando && (
            <div className="pp-botones">
              <button type="button" className="boton pp-boton" onClick={() => setConfirmando(true)} disabled={ocupado}>
                Aceptar
              </button>
              <button type="button" className="boton secundario pp-boton" onClick={() => setRechazando(true)} disabled={ocupado}>
                Rechazar
              </button>
            </div>
          )}

          {rechazando && (
            <div className="pp-rechazo">
              <div className="campo">
                <label htmlFor={`motivo-${p.id}`}>¿Por qué la rechazas? (opcional)</label>
                <select id={`motivo-${p.id}`} value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                  {MOTIVOS_RECHAZO.map(({ valor, texto }) => <option key={valor} value={valor}>{texto}</option>)}
                </select>
              </div>
              <div className="pp-botones">
                <button type="button" className="boton peligro pp-boton" onClick={() => enviar('rechazar')} disabled={ocupado}>
                  {ocupado ? 'Enviando…' : 'Rechazar'}
                </button>
                <button type="button" className="boton secundario pp-boton" onClick={() => setRechazando(false)} disabled={ocupado}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {abierta && p.mi_respuesta === 'aceptado' && (
            <p className="pp-nota">Te avisaremos cuando {mayusculaInicial(otro.nombre)} responda.</p>
          )}

          {p.evaluacion?.habilitada && !p.evaluacion.evaluada && (
            <Link to={`/evaluacion/${p.id}`} className="boton pp-boton">Evaluar convivencia</Link>
          )}
          {p.evaluacion?.evaluada && (
            <Link to={`/evaluacion/${p.id}`} className="pp-enlace">Ya evaluaste esta convivencia · Ver evaluación</Link>
          )}

          {/* Conversar antes de decidir, o coordinar la mudanza una vez confirmado */}
          {(abierta || p.estado === 'confirmado') && !rechazando && (
            <BotonMensaje usuarioId={otro.id} nombre={otro.nombre} texto={`Escribirle a ${mayusculaInicial(otro.nombre)}`}
              className="enlace-boton pp-mensaje" />
          )}
          {/* Aceptar no se puede deshacer: se confirma antes. Solo se monta el diálogo abierto (un id por página) */}
          {confirmando && (
            <Confirmar abierto tono="" titulo={`¿Aceptar la propuesta con ${mayusculaInicial(otro.nombre)}?`}
              mensaje={textoConfirmacion(p)} textoConfirmar="Sí, aceptar" textoOcupado="Enviando…" ocupado={ocupado}
              onConfirmar={() => enviar('aceptar')} onCancelar={() => setConfirmando(false)} />
          )}
          {/* Cualquiera de los dos puede terminarla; el buscador queda libre para un nuevo match */}
          {p.estado === 'confirmado' && (
            <Link to={`/evaluacion/${p.id}/terminar`} className="pp-terminar">Terminar convivencia</Link>
          )}
        </div>
      </div>
    </li>
  )
}

// HU-17: RoomMatch propone el match entre quien busca alojamiento y el oferente de uno compatible;
// ambos responden y, si los dos aceptan, empieza la convivencia
function PaginaPropuestas() {
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
  // Cada estudiante tiene un rol: el buscador recibe alojamientos; el oferente, estudiantes que buscan
  const buscador = datos.modo === 'buscador'
  const abiertas = buscador ? paraMi : paraMisAlojamientos

  return (
    <main className="pp-pagina">
      <header className="pp-encabezado">
        <h1>Propuestas de match</h1>
        <p>
          {buscador
            ? 'RoomMatch te propone alojamientos de estudiantes con hábitos muy compatibles con los tuyos.'
            : 'RoomMatch te propone estudiantes que buscan alojamiento y tienen hábitos muy compatibles con los tuyos.'}
          {' '}Si ambos aceptan, el match queda confirmado.
        </p>
      </header>

      {mensaje && <p className="exito pp-aviso" role="status">{mensaje}</p>}

      {buscador && (
        <section className={`pp-interruptor${datos.buscando ? ' activo' : ''}`} aria-labelledby="titulo-buscando">
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
      )}

      {datos.confirmados.length > 0 && (
        <section className="pp-seccion">
          <h2>Tu convivencia</h2>
          <ul className="pp-grilla">
            {datos.confirmados.map((p, i) => <TarjetaPropuesta key={p.id} p={p} alResponder={alResponder} orden={i} />)}
          </ul>
        </section>
      )}

      <section className="pp-seccion">
        <h2>
          {buscador ? 'Alojamientos para ti' : 'Para tus alojamientos'}
          {abiertas.length > 0 && <span className="pp-cuenta">{abiertas.length}</span>}
        </h2>
        {abiertas.length > 0 ? (
          <ul className="pp-grilla">
            {abiertas.map((p, i) => <TarjetaPropuesta key={p.id} p={p} alResponder={alResponder} orden={i} />)}
          </ul>
        ) : (
          <div className="pp-vacio">
            <SinFoto className="pp-vacio-dibujo" />
            {buscador ? (
              <p>
                {datos.buscando
                  ? 'Aún no encontramos alojamientos con compatibilidad alta para ti. Te avisaremos cuando aparezca uno.'
                  : 'Activa «Estoy buscando alojamiento» para recibir propuestas.'}
                {datos.buscando && <> Revisa también tus <Link to="/alojamientos">preferencias de búsqueda</Link>.</>}
              </p>
            ) : (
              <p>
                Cuando alguien muy compatible contigo busque alojamiento, te lo propondremos aquí.
                {' '}<Link to="/publicaciones/nueva">Publica un alojamiento</Link> si tienes uno disponible.
              </p>
            )}
          </div>
        )}
      </section>

      {datos.historial.length > 0 && (
        <details className="pp-historial">
          <summary>Propuestas anteriores ({datos.historial.length})</summary>
          <ul>
            {datos.historial.map((p) => (
              <li key={p.id}>
                <span>
                  <strong>{p.publicacion.titulo}</strong> con {nombreDe(p.otro)}
                </span>
                <span className={`pp-historial-estado ${p.estado}`}>
                  {ESTADOS_CERRADOS[p.estado] ?? p.estado}
                  {p.fecha_fin && ` el ${formatearFecha(p.fecha_fin)}`}
                  {p.motivo_fin && ` (${textoDe(MOTIVOS_FIN, p.motivo_fin).toLowerCase()})`}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </main>
  )
}

// Sin cuenta verificada se muestra el aviso en lugar de las propuestas (acceso limitado)
export default function Propuestas() {
  const { usuario } = useSesion()
  if (!estaVerificado(usuario)) {
    return (
      <main className="aviso-pagina">
        <h1>Propuestas de match</h1>
        <AvisoVerificacion detalle="Cuando tu cuenta esté verificada, RoomMatch empezará a proponerte match." />
      </main>
    )
  }
  return <PaginaPropuestas />
}
