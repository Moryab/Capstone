import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../../api.js'
import { formatearPesos, textoDe, TIPOS } from '../../publicaciones.js'
import { EnlaceCambioRol } from '../../rol/CambioRol.jsx'
import { useSesion } from '../../sesion/SesionContext.jsx'
import { IconoFlecha } from '../iconos.jsx'
import {
  borradorDe, ICONOS_BUSQUEDA as ICONOS, Opcion, PreguntaPresupuesto, PreguntaUbicacion,
} from '../preguntasBusqueda.jsx'

const MAX_X = 3.5 // grados: la tarjeta es ancha, así que se inclina poco
const MAX_Y = 2
const MAX_CHIPS = 4
const SOLO_MOUSE = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'

const IconoLapiz = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
    strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" /></svg>
)

const REGLAS = [
  ['requiere_mascotas', 'Con mascotas', 'Sin mascotas'],
  ['requiere_fumar', 'Se puede fumar', 'Sin fumar'],
  ['requiere_visitas', 'Con visitas', 'Sin visitas'],
]
const EXTRAS = [['gastos_incluidos', 'Gastos incluidos'], ['amoblado', 'Amoblado'], ['estacionamiento', 'Estacionamiento']]

// usuarios.preferencias_busqueda → chips legibles. `nombres` traduce los ids de comuna
function chipsDe(p, nombres) {
  if (!p) return []
  const chips = []
  if (p.costo_min != null && p.costo_max != null) {
    chips.push({ clave: 'costo', texto: `${formatearPesos(p.costo_min)} a ${formatearPesos(p.costo_max)}` })
  } else if (p.costo_max != null) {
    chips.push({ clave: 'costo', texto: `Hasta ${formatearPesos(p.costo_max)}` })
  } else if (p.costo_min != null) {
    chips.push({ clave: 'costo', texto: `Desde ${formatearPesos(p.costo_min)}` })
  }
  const comunas = p.comunas_ids.map((id) => nombres[id]).filter(Boolean)
  if (comunas.length) {
    const texto = comunas.length > 2 ? `${comunas[0]} y ${comunas.length - 1} más` : comunas.join(' y ')
    chips.push({ clave: 'comuna', texto })
  }
  if (p.tipo_alojamiento) chips.push({ clave: 'tipo', texto: textoDe(TIPOS, p.tipo_alojamiento) })
  if (p.cerca_institucion) chips.push({ clave: 'sede', texto: 'Cerca de tu sede' })
  for (const [campo, si, no] of REGLAS) {
    if (p[campo] != null) chips.push({ clave: campo, icono: 'regla', texto: p[campo] ? si : no })
  }
  for (const [campo, texto] of EXTRAS) {
    if (p[campo]) chips.push({ clave: campo, icono: 'extra', texto })
  }
  return chips
}

// Casa: gris cuando la búsqueda está pausada; al activarla se encienden las ventanas y
// aparece una lupa que la recorre
function Casa() {
  return (
    <div className="i-buscar-visual" aria-hidden="true">
      <span className="i-buscar-onda" />
      <span className="i-buscar-onda" />
      <svg className="i-casa" viewBox="0 0 64 64" fill="none">
        <rect className="i-casa-cuerpo" x="14" y="28" width="36" height="26" rx="4" />
        <path className="i-casa-techo" d="M8 31 L32 11 L56 31" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <rect className="i-casa-ventana" x="19" y="34" width="8" height="7" rx="1.5" />
        <rect className="i-casa-ventana segunda" x="37" y="34" width="8" height="7" rx="1.5" />
        <rect className="i-casa-puerta" x="28" y="42" width="8" height="12" rx="2" />
        <g className="i-casa-recorrido">
          <g className="i-casa-lupa">
            <circle cx="50" cy="48" r="8" strokeWidth="3.5" />
            <path d="M56 54 L61 59" strokeWidth="4" strokeLinecap="round" />
          </g>
        </g>
      </svg>
    </div>
  )
}

// «¿Qué estás buscando?»: presupuesto, ubicación, tipo y extras. Todo es opcional
function Preguntas({ borrador, cambiar, comunas, institucion, activo, guardando, error, alConfirmar, alCancelar }) {
  return (
    <form className="i-preguntas" onSubmit={(e) => { e.preventDefault(); alConfirmar() }}
      onKeyDown={(e) => { if (e.key === 'Escape') alCancelar() }} aria-label="Qué estás buscando">
      <PreguntaPresupuesto borrador={borrador} cambiar={cambiar} />
      <PreguntaUbicacion borrador={borrador} cambiar={cambiar} comunas={comunas} institucion={institucion} />

      <fieldset>
        <legend>¿Qué tipo de alojamiento?</legend>
        <div className="i-opciones">
          {TIPOS.map(({ valor, texto }) => (
            <Opcion key={valor} nombre="buscar-tipo" marcada={borrador.tipo_alojamiento === valor}
              alCambiar={() => cambiar({ tipo_alojamiento: valor })} icono={ICONOS.tipo}>
              {texto}
            </Opcion>
          ))}
          <Opcion nombre="buscar-tipo" marcada={borrador.tipo_alojamiento == null} alCambiar={() => cambiar({ tipo_alojamiento: null })}>
            Me da lo mismo
          </Opcion>
        </div>
      </fieldset>

      <fieldset>
        <legend>¿Necesitas algo más? <span>Opcional</span></legend>
        <div className="i-opciones">
          {EXTRAS.map(([campo, texto]) => (
            <Opcion key={campo} tipo="checkbox" marcada={borrador[campo]} icono={ICONOS.extra}
              alCambiar={(e) => cambiar({ [campo]: e.target.checked })}>
              {texto}
            </Opcion>
          ))}
        </div>
      </fieldset>

      {error && <p className="i-error" role="alert">{error}</p>}

      <div className="i-preguntas-acciones">
        <button type="submit" className="l-boton" disabled={guardando}>
          {guardando ? 'Guardando…' : activo ? 'Guardar cambios' : 'Empezar a buscar'}
        </button>
        <button type="button" className="i-boton-texto" onClick={alCancelar} disabled={guardando}>Cancelar</button>
      </div>
    </form>
  )
}

// Inclinación 3D y brillo que siguen al mouse. Escribe --mx, --my, --rx y --ry una vez por cuadro
function useInclinacion(ref) {
  useEffect(() => {
    const el = ref.current
    if (!el || !window.matchMedia(SOLO_MOUSE).matches) return undefined
    let cuadro = 0

    const entrar = (e) => { if (e.pointerType === 'mouse') el.classList.add('siguiendo') }
    const mover = (e) => {
      if (e.pointerType !== 'mouse') return
      cancelAnimationFrame(cuadro)
      cuadro = requestAnimationFrame(() => {
        const caja = el.getBoundingClientRect()
        const x = (e.clientX - caja.left) / caja.width
        const y = (e.clientY - caja.top) / caja.height
        el.style.setProperty('--mx', `${(x * 100).toFixed(2)}%`)
        el.style.setProperty('--my', `${(y * 100).toFixed(2)}%`)
        el.style.setProperty('--ry', `${((x - 0.5) * 2 * MAX_Y).toFixed(2)}deg`)
        el.style.setProperty('--rx', `${((0.5 - y) * 2 * MAX_X).toFixed(2)}deg`)
      })
    }
    const salir = () => {
      cancelAnimationFrame(cuadro)
      el.classList.remove('siguiendo')
      el.style.setProperty('--rx', '0deg')
      el.style.setProperty('--ry', '0deg')
    }

    el.addEventListener('pointerenter', entrar)
    el.addEventListener('pointermove', mover)
    el.addEventListener('pointerleave', salir)
    return () => {
      cancelAnimationFrame(cuadro)
      el.removeEventListener('pointerenter', entrar)
      el.removeEventListener('pointermove', mover)
      el.removeEventListener('pointerleave', salir)
    }
  }, [ref])
}

/**
 * HU-17: el mismo «Estoy buscando alojamiento» de Propuestas, a mano desde el inicio.
 * Al presionar «Sí» primero se pregunta qué busca; la búsqueda se activa al confirmar, así las
 * primeras propuestas (se generan al activar) ya usan esas preferencias.
 */
export default function TarjetaBuscando() {
  const { usuario, recargarUsuario } = useSesion()
  const tarjeta = useRef(null)
  const interruptor = useRef(null)
  // Mientras responde el servidor se muestra el estado pedido; si falla, vuelve al de la sesión
  const [pedido, setPedido] = useState(null)
  const [preguntando, setPreguntando] = useState(false)
  const [borrador, setBorrador] = useState(() => borradorDe(null))
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [errorPreguntas, setErrorPreguntas] = useState('')
  const [anuncio, setAnuncio] = useState('')
  const [ondas, setOndas] = useState(0)
  const [preferencias, setPreferencias] = useState(undefined) // undefined: cargando
  const [comunas, setComunas] = useState([])
  const [institucion, setInstitucion] = useState(null)

  const enviando = pedido !== null || guardando
  const activo = pedido !== null ? pedido : Boolean(usuario.buscando_alojamiento)
  const estado = preguntando ? 'preguntando' : activo ? 'activo' : 'apagado'
  const nombres = Object.fromEntries(comunas.map((c) => [c.id, c.nombre]))

  useInclinacion(tarjeta)

  useEffect(() => {
    api('/perfil/preferencias-busqueda').then(setPreferencias).catch(() => setPreferencias(null))
    api('/catalogos/publicacion').then(({ comunas: lista }) => setComunas(lista)).catch(() => {})
    api('/publicaciones/filtros').then((r) => setInstitucion(r.institucion)).catch(() => {})
  }, [])

  const limpiarAvisos = () => {
    setMensaje('')
    setError('')
    setErrorPreguntas('')
  }

  const abrirPreguntas = () => {
    limpiarAvisos()
    setBorrador(borradorDe(preferencias))
    setPreguntando(true)
    setAnuncio('Cuéntanos qué estás buscando para empezar')
  }

  // Al llegar desde el cambio de rol a buscador se pregunta de inmediato qué busca. Se espera a
  // tener las preferencias para mostrarlas marcadas, y el pedido se borra del historial
  const { state } = useLocation()
  const navegar = useNavigate()
  const pidePreguntar = state?.preguntar && preferencias !== undefined
  useEffect(() => {
    if (!pidePreguntar) return
    navegar('.', { replace: true, state: null })
    if (!usuario.buscando_alojamiento) {
      setBorrador(borradorDe(preferencias))
      setPreguntando(true)
      setAnuncio('Cuéntanos qué estás buscando para empezar')
      tarjeta.current?.scrollIntoView({ block: 'center' })
    }
  }, [pidePreguntar, preferencias, usuario.buscando_alojamiento, navegar])

  const cerrarPreguntas = () => {
    setPreguntando(false)
    setErrorPreguntas('')
    setAnuncio(activo ? '' : 'Búsqueda de alojamiento pausada')
    interruptor.current?.focus({ preventScroll: true })
  }

  // Activar o pausar en el servidor (el mismo endpoint que usa Propuestas)
  const cambiarBusqueda = async (nuevo) => {
    setPedido(nuevo)
    setAnuncio(nuevo ? 'Búsqueda de alojamiento activada' : 'Búsqueda de alojamiento pausada')
    if (nuevo && !activo) setOndas((n) => n + 1)
    try {
      const r = await api('/matches/busqueda', { metodo: 'PUT', datos: { buscando: nuevo } })
      setMensaje(r.propuestas_nuevas > 0 ? `${r.mensaje}. Ya tienes ${r.propuestas_nuevas} propuesta(s) nueva(s).` : r.mensaje)
      await recargarUsuario()
      return true
    } catch (err) {
      setError(err.message)
      setAnuncio(`No pudimos cambiar la búsqueda. ${err.message}`)
      return false
    } finally {
      setPedido(null)
    }
  }

  const alternar = () => {
    if (enviando) return // evita el doble clic mientras responde el servidor
    if (preguntando) return cerrarPreguntas()
    if (!activo) return abrirPreguntas()
    limpiarAvisos()
    cambiarBusqueda(false)
  }

  // Guarda las preferencias y recién entonces activa (o vuelve a pedir propuestas si ya buscaba)
  const confirmar = async () => {
    setGuardando(true)
    limpiarAvisos()
    try {
      const r = await api('/perfil/preferencias-busqueda', {
        metodo: 'PUT',
        datos: { ...borradorDe(null), ...preferencias, ...borrador },
      })
      setPreferencias(r.preferencias)
    } catch (err) {
      const porCampo = err.errores && Object.values(err.errores)[0]
      setErrorPreguntas(porCampo || err.message)
      setGuardando(false)
      return
    }
    setGuardando(false)
    setPreguntando(false)
    interruptor.current?.focus({ preventScroll: true })
    await cambiarBusqueda(true)
  }

  const chips = chipsDe(preferencias, nombres)
  const visibles = chips.slice(0, MAX_CHIPS)
  const resto = chips.length - visibles.length
  // El interruptor muestra la intención: «Sí» desde que se abren las preguntas
  const interruptorEncendido = activo || preguntando

  return (
    <div className="i-tarjeta i-area-buscar">
      <section ref={tarjeta} className="i-buscar" data-activo={activo} data-estado={estado}
        aria-labelledby="i-titulo-buscar">
        <span className="i-buscar-brillo" aria-hidden="true" />

        <Casa />

        <div className="i-buscar-texto">
          <p className="i-etiqueta"><span className="i-buscar-punto" aria-hidden="true" />Busca tu lugar</p>
          <h2 id="i-titulo-buscar" className="i-buscar-cambio">
            <span className="apagado" aria-hidden={estado !== 'apagado'}>¿Estás buscando dónde vivir?</span>
            <span className="preguntando" aria-hidden={estado !== 'preguntando'}>¿Qué estás buscando?</span>
            <span className="activo" aria-hidden={estado !== 'activo'}>RoomMatch está buscando por ti</span>
          </h2>
          <div className="i-buscar-cambio">
            <p className="i-buscar-desc apagado" aria-hidden={estado !== 'apagado'}>
              Actívalo y te propondremos alojamientos de estudiantes con quienes eres compatible.
            </p>
            <p className="i-buscar-desc preguntando" aria-hidden={estado !== 'preguntando'}>
              Elige lo que necesitas y te propondremos solo lo que calce. Deja en «Me da lo mismo» lo que no te importe.
            </p>
            <p className="i-buscar-desc activo" aria-hidden={estado !== 'activo'}>
              Te avisaremos cuando un alojamiento calce contigo y con quien lo ofrece. Puedes pausarlo cuando quieras.
            </p>
          </div>

          {/* Se despliega al activar o al preguntar. Cerrado queda inerte: ni el teclado ni el lector entran */}
          <div className="i-buscar-panel" inert={estado === 'apagado'}>
            <div className="i-buscar-panel-dentro">
              {preguntando ? (
                <Preguntas borrador={borrador} cambiar={(c) => setBorrador({ ...borrador, ...c })}
                  comunas={comunas} institucion={institucion} activo={activo} guardando={guardando}
                  error={errorPreguntas} alConfirmar={confirmar} alCancelar={cerrarPreguntas} />
              ) : (
                <div className="i-buscar-fila">
                  <ul className="i-buscar-chips" aria-label="Tus preferencias de búsqueda">
                    {preferencias === undefined ? null : visibles.length > 0 ? (
                      <>
                        {visibles.map((c) => (
                          <li key={c.clave} className="i-chip">{ICONOS[c.icono ?? c.clave]}{c.texto}</li>
                        ))}
                        {resto > 0 && <li className="i-chip">+{resto} más</li>}
                        <li>
                          <button type="button" className="i-buscar-ajustar" onClick={abrirPreguntas}
                            aria-label="Ajustar lo que estoy buscando">
                            <IconoLapiz /> Ajustar
                          </button>
                        </li>
                      </>
                    ) : (
                      <li>
                        <button type="button" className="i-chip i-chip-enlace" onClick={abrirPreguntas}>
                          {ICONOS.costo} Define tu presupuesto y comuna
                        </button>
                      </li>
                    )}
                  </ul>
                  <Link to="/propuestas" className="i-enlace i-buscar-propuestas">Ver mis propuestas <IconoFlecha /></Link>
                </div>
              )}
            </div>
          </div>

          {(mensaje || error) && (
            <p className={error ? 'i-error i-buscar-aviso' : 'i-buscar-aviso'}>{error || mensaje}</p>
          )}
          {!preguntando && <EnlaceCambioRol />}
        </div>

        <button ref={interruptor} type="button" role="switch" aria-checked={activo}
          aria-label="Estoy buscando alojamiento" aria-disabled={enviando}
          className="i-buscar-interruptor" data-encendido={interruptorEncendido} onClick={alternar}>
          <span className="i-riel">
            {ondas > 0 && <span key={ondas} className="i-riel-onda" aria-hidden="true" />}
            <span className="i-riel-si" aria-hidden="true">Sí</span>
            <span className="i-riel-no" aria-hidden="true">No</span>
            <span className="i-pulgar" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" />
              </svg>
            </span>
          </span>
          <span className="i-buscar-leyenda" aria-hidden="true">
            {estado === 'preguntando' && !activo ? 'Falta confirmar' : activo ? 'Buscando' : 'Búsqueda pausada'}
          </span>
        </button>

        {/* El lector anuncia el cambio y, cuando llega, el mensaje del servidor */}
        <p className="visualmente-oculto" aria-live="polite">{error ? anuncio : [anuncio, mensaje].filter(Boolean).join('. ')}</p>
      </section>
    </div>
  )
}
