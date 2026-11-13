import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import AnilloCompatibilidad from '../componentes/AnilloCompatibilidad.jsx'
import AvisoVerificacion from '../componentes/AvisoVerificacion.jsx'
import Avatar from '../componentes/Avatar.jsx'
import BotonMensaje from '../componentes/BotonMensaje.jsx'
import Confirmar from '../componentes/Confirmar.jsx'
import { IconoPersona, IconoUbicacion } from '../componentes/Iconos.jsx'
import { IconoAuto, IconoCama, IconoDucha, IconoPostular, IconoSede, IconoSiguiente } from '../componentes/IconosAlojamiento.jsx'
import IlustracionHabitacion from '../componentes/IlustracionHabitacion.jsx'
import InsigniaVerificacion from '../componentes/InsigniaVerificacion.jsx'
import InterruptorEscena from '../componentes/InterruptorEscena.jsx'
import SinFoto from '../componentes/SinFoto.jsx'
import { tituloCategoria } from '../cuestionario.js'
import { IconoSalir } from '../inicio/iconos.jsx'
import { mayusculaInicial } from '../inicio/utilidades.js'
import { textoGenero } from '../perfil.js'
import { IconoHabito } from '../perfil/iconos.jsx'
import { formatearFecha, formatearPesos, GENEROS_PREFERIDOS, textoDe, TIPOS } from '../publicaciones.js'
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

// Reglas de la casa en breve, con el ícono del hábito: lo que más pesa para convivir
const REGLAS_BREVES = [
  { clave: 'permite_fumar', habito: 'fumar', si: 'Se puede fumar', no: 'Sin fumar' },
  { clave: 'permite_mascotas', habito: 'mascotas', si: 'Acepta mascotas', no: 'Sin mascotas' },
  { clave: 'permite_visitas', habito: 'visitas', si: 'Visitas permitidas', no: 'Sin visitas' },
]
function ReglasBreves({ pub }) {
  const reglas = REGLAS_BREVES.filter(({ clave }) => pub.reglas?.[clave] != null)
  if (!reglas.length && !pub.horario_silencio) return null
  return (
    <ul className="pp-reglas" aria-label="Reglas de la casa">
      {reglas.map(({ clave, habito, si, no }) => (
        <li key={clave} data-permite={pub.reglas[clave] || undefined}>
          <IconoHabito clave={habito} tamano={14} />{pub.reglas[clave] ? si : no}
        </li>
      ))}
      {pub.horario_silencio && <li><IconoHabito clave="horario_sueno" tamano={14} />Horario de silencio</li>}
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

  const soyBuscador = p.rol === 'buscador'
  const personales = [otro.edad && `${otro.edad} años`, textoGenero(otro.genero)].filter(Boolean).join(', ')
  const estudios = [otro.carrera, otro.institucion_sigla].filter(Boolean).join(' · ')

  // El alojamiento completo: es lo que elige el buscador. Al oferente, que ya conoce el suyo, solo se
  // le muestra una línea de referencia (para saber de cuál de sus publicaciones se trata)
  const alojamiento = soyBuscador && (
    <div className="pp-lado-alojamiento">
      <div className="pp-foto">
        {/* Sin fotos, la habitación dibujada: entera a cualquier tamaño (no se agranda ni se recorta) */}
        {pub.foto_url ? <img src={pub.foto_url} alt="" loading="lazy" /> : <IlustracionHabitacion className="pp-sin-foto" />}
        <span className="pp-tipo">{textoDe(TIPOS, pub.tipo)}</span>
      </div>
      <div className="pp-alojamiento">
        {pub.costo_mensual != null && (
          <p className="pp-precio">{formatearPesos(pub.costo_mensual)}<span> / mes</span></p>
        )}
        {/* Lo que de verdad se paga: el arriendo más los gastos que van aparte */}
        {pub.costo_mensual != null && (
          pub.gastos_aparte > 0
            ? <p className="pp-total">Unos <strong>{formatearPesos(pub.costo_mensual + pub.gastos_aparte)}</strong> al mes con gastos</p>
            : pub.gastos_incluidos && <p className="pp-total incluidos">Gastos incluidos en el arriendo</p>
        )}
        <h3 className="pp-titulo">
          {enlazable
            ? <Link to={`/alojamientos/${pub.id}`} state={{ desde: '/propuestas' }}>{pub.titulo}</Link>
            : pub.titulo}
        </h3>
        {pub.comuna && (
          <p className="pp-lugar"><IconoUbicacion /> {[pub.comuna, pub.sector].filter(Boolean).join(', ')}</p>
        )}

        {/* Lo clave para decidir, con nombre y valor */}
            <dl className="pp-ficha">
              {pub.distancia_km != null && (
                <div><dt><IconoSede /> Tu sede</dt><dd>{`${pub.distancia_km.toLocaleString('es-CL')} km`}</dd></div>
              )}
              {pub.cupos_disponibles != null && (
                <div>
                  <dt><IconoPersona /> Cupos</dt>
                  <dd>{pub.cupos_disponibles === 0 ? 'Sin cupos' : `${pub.cupos_disponibles} de ${pub.cupos_totales}`}</dd>
                </div>
              )}
              <div>
                <dt><IconoPostular /> Para</dt>
                <dd>{pub.genero_preferido === 'indiferente' ? 'Cualquier género' : textoDe(GENEROS_PREFERIDOS, pub.genero_preferido)}</dd>
              </div>
            </dl>
            <ReglasBreves pub={pub} />
            {pub.descripcion && <p className="pp-descripcion">{pub.descripcion}</p>}
            <Incluye pub={pub} />

        {enlazable && (
          <Link to={`/alojamientos/${pub.id}`} state={{ desde: '/propuestas' }} className="pp-ver">
            Ver alojamiento
            {pub.cantidad_fotos > 1 && <span className="pp-ver-extra">{pub.cantidad_fotos} fotos</span>}
            <IconoSiguiente />
          </Link>
        )}
      </div>
    </div>
  )

  return (
    <li className={`pp-tarjeta pp-${estado.tono}`} data-rol={p.rol} style={{ '--orden': Math.min(orden, 9) }}>
      {alojamiento}

      <div className="pp-lado-persona">
        {/* En qué va la propuesta y cuánto le queda */}
        <div className="pp-estado-linea">
          <span className="pp-estado">{estado.texto}</span>
          {abierta && <span className="pp-vence">{textoVence(p.vence)}</span>}
          <Link to={`/usuarios/${otro.id}`} state={{ desde: '/propuestas' }} className="pp-ver pp-ver-perfil">
            Ver perfil <IconoSiguiente />
          </Link>
        </div>

        <div className="pp-persona">
          <Avatar nombre={otro.nombre} apellido={otro.ap_paterno} foto={otro.foto_url} tamano={soyBuscador ? 52 : 72} />
          <div className="pp-persona-datos">
            <p className="pp-rol">{soyBuscador ? 'Ofrece el alojamiento' : 'Busca alojamiento'}</p>
            <Link to={`/usuarios/${otro.id}`} state={{ desde: '/propuestas' }} className="pp-nombre">{nombreDe(otro)}</Link>
            {!soyBuscador && (estudios || personales) && (
              <p className="pp-detalle">{[estudios, personales].filter(Boolean).join(' · ')}</p>
            )}
            <InsigniaVerificacion verificado={otro.verificado} />
          </div>
          <AnilloCompatibilidad porcentaje={p.porcentaje} nivel={p.nivel} />
        </div>

        {!soyBuscador && (
          <div className="pp-referencia">
            <span className="pp-referencia-foto" aria-hidden="true">
              {pub.foto_url ? <img src={pub.foto_url} alt="" loading="lazy" /> : <IlustracionHabitacion className="pp-sin-foto" />}
            </span>
            <span className="pp-referencia-texto">
              <small>Para tu alojamiento</small>
              <strong>{pub.titulo}</strong>
              <span>
                {[
                  pub.costo_mensual != null && `${formatearPesos(pub.costo_mensual)} / mes`,
                  pub.comuna,
                  pub.cupos_disponibles != null && (pub.cupos_disponibles === 0 ? 'Sin cupos' : `${pub.cupos_disponibles} de ${pub.cupos_totales} cupos`),
                ].filter(Boolean).join(' · ')}
              </span>
            </span>
            {enlazable && (
              <Link to={`/alojamientos/${pub.id}`} state={{ desde: '/propuestas' }} className="pp-ver">
                Ver tu publicación <IconoSiguiente />
              </Link>
            )}
          </div>
        )}

        {/* El oferente decide por la persona: se ve lo que cuenta de sí */}
        {!soyBuscador && otro.descripcion && <p className="pp-sobre">{otro.descripcion}</p>}

        <PorQue categorias={p.categorias_coincidentes} />

        {abierta && <Respuestas p={p} />}

        {/* La otra persona ya aceptó: solo falta mi respuesta para confirmar (se destaca) */}
        {estado.tono === 'urgente' && p.mi_respuesta === 'pendiente' && (
          <p className="pp-ya-acepto" role="status">
            <span className="pp-ya-acepto-icono" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            </span>
            <span>
              <strong>{mayusculaInicial(otro.nombre)} ya aceptó.</strong>{' '}
              Solo falta tu respuesta para confirmar el match.
            </span>
          </p>
        )}

        {p.estado === 'confirmado' && (
          <p className="pp-confirmado">Match confirmado el {formatearFecha(p.fecha_confirmacion)}. ¡Su convivencia ya comenzó!</p>
        )}
        {/* HU-18: evaluación de la convivencia al mes */}
        {p.evaluacion && !p.evaluacion.evaluada && !p.evaluacion.habilitada && (
          <p className="pp-nota">Podrás evaluar la convivencia desde el {formatearFecha(p.evaluacion.fecha_habilitacion)}.</p>
        )}
        {error && <p className="alerta" role="alert">{error}</p>}

        {/* Acciones: siempre al fondo */}
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
            <Link to={`/evaluacion/${p.id}/terminar`} className="pp-terminar"><IconoSalir /> Terminar convivencia</Link>
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
  const [confirmarPausa, setConfirmarPausa] = useState(false)

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

  // Oferente: pausar o reanudar las propuestas para sus alojamientos
  const cambiarRecibir = async (recibiendo) => {
    setCambiando(true)
    setMensaje('')
    try {
      const r = await api('/matches/recibir', { metodo: 'PUT', datos: { recibiendo } })
      setMensaje(r.cerradas > 0
        ? `${r.mensaje}. Se cerraron ${r.cerradas} ${r.cerradas === 1 ? 'propuesta que nadie había respondido' : 'propuestas que nadie había respondido'}.`
        : r.propuestas_nuevas > 0 ? `${r.mensaje}. Ya tienes ${r.propuestas_nuevas} propuesta(s) nueva(s).` : r.mensaje)
      await cargar()
    } catch (err) {
      setMensaje(err.message)
    } finally {
      setCambiando(false)
      setConfirmarPausa(false)
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

      {/* Oferente: puede pausar las propuestas aunque le queden cupos (así a quienes buscan se les
          proponen otros alojamientos mientras tanto) */}
      {!buscador && datos.modo === 'oferente' && (
        <section className="pp-recibir" data-activo={datos.recibiendo || undefined} aria-labelledby="titulo-recibir">
          <div className="pp-recibir-texto">
            <h2 id="titulo-recibir">
              {datos.recibiendo ? 'Estás recibiendo propuestas' : 'Propuestas en pausa'}
            </h2>
            <p id="ayuda-recibir">
              {datos.recibiendo
                ? 'RoomMatch te propone estudiantes compatibles mientras tus alojamientos tengan cupos libres. Si por ahora no buscas a nadie, pausa las propuestas: así a quienes buscan les aparecen otras opciones.'
                : 'No recibes propuestas nuevas y tus alojamientos no se proponen a nadie. Las propuestas que alguien ya aceptó siguen abiertas para que respondas.'}
            </p>
            <p className="pp-recibir-cupos">
              {datos.cupos_libres > 0
                ? `${datos.cupos_libres} ${datos.cupos_libres === 1 ? 'cupo libre' : 'cupos libres'} en tus alojamientos`
                : 'Tus alojamientos no tienen cupos libres: aunque esté activo, no llegarán propuestas'}
            </p>
          </div>
          <InterruptorEscena activo={datos.recibiendo} etiquetadoPor="titulo-recibir" descritoPor="ayuda-recibir"
            deshabilitado={cambiando}
            alCambiar={(nuevo) => {
              // Al pausar con propuestas sin responder, se avisa antes de cerrarlas
              const sinResponder = paraMisAlojamientos.filter((p) => p.estado === 'sugerido').length
              if (!nuevo && sinResponder > 0) setConfirmarPausa(sinResponder)
              else cambiarRecibir(nuevo)
            }} />
        </section>
      )}
      {confirmarPausa && (
        <Confirmar abierto tono="" titulo="¿Pausar las propuestas?"
          mensaje={`Se cerrarán ${confirmarPausa} ${confirmarPausa === 1 ? 'propuesta que aún nadie responde' : 'propuestas que aún nadie responde'} y esas personas recibirán otras opciones. Las que alguien ya aceptó siguen abiertas.`}
          textoConfirmar="Sí, pausar" textoOcupado="Pausando…" ocupado={cambiando}
          onConfirmar={() => cambiarRecibir(false)} onCancelar={() => setConfirmarPausa(false)} />
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
            ) : !datos.recibiendo ? (
              <p>Tus propuestas están en pausa. Actívalas arriba cuando quieras recibir estudiantes para tus cupos libres.</p>
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
