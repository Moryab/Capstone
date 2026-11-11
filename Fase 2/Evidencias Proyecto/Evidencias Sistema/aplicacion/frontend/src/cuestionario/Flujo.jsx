import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap, prefiereSinMovimiento } from '../landing/animaciones.js'
import {
  ANIMOS, CAMPOS_PASO, contarImprescindibles, MAX_IMPRESCINDIBLES, NIVELES, pasoListo, pasosDe,
} from './datos.js'
import { IconoNivel, IlustracionOpcion } from './ilustraciones.jsx'
import PasoPerfil from './PasoPerfil.jsx'

const Flecha = ({ izquierda }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={izquierda ? 'M19 12H5M11 6l-6 6 6 6' : 'M5 12h14M13 6l6 6-6 6'} />
  </svg>
)
const Check = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
)

const esCampoDeTexto = (el) =>
  el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement
  || (el instanceof HTMLInputElement && el.type !== 'radio')

// Barra de progreso con un paso por pregunta. Los rellenos se animan con scaleX
function Progreso({ pasos, indice, hechos, soloUna }) {
  return (
    <div className="c-progreso">
      <p className="c-progreso-texto" aria-live="polite">
        {soloUna ? 'Editando' : `Pregunta ${indice + 1} de ${pasos.length}`} · <strong>{pasos[indice].titulo}</strong>
      </p>
      <ol className="c-pasos" style={{ '--pasos': pasos.length }} aria-hidden="true">
        {pasos.map((paso, i) => (
          <li key={paso.clave} className={`${i === indice ? 'actual' : ''}${hechos[i] ? ' hecho' : ''}`}>
            <span className="c-paso-barra"><span className="c-paso-relleno" /></span>
            <span className="c-paso-nombre">{paso.corto}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/**
 * Preguntas del cuestionario, una por pantalla. Se usa en el primer recorrido (modo «completo»,
 * con `conPerfil` para los pasos de estudios y origen, y autoguardado en cada respuesta) y para
 * editar una sola respuesta de hábitos (modo «una»).
 * - `guardar(cambio)`: autoguardado de un hábito (solo modo completo). Devuelve una promesa.
 * - `guardarPerfil(tipo, campos)`: guarda el paso de estudios u origen. Devuelve una promesa.
 * - `alTerminar(estado)`: al pasar la última pregunta (o la única, al editar).
 * - `alSalir()`: «Atrás» en la primera pregunta (o al cancelar la edición).
 * - `alCambiarIndice(clave)`: para que el fondo cambie de color según la pregunta.
 */
export default function Flujo({
  estadoInicial, indiceInicial = 0, modo = 'completo', conPerfil = false, perfilInicial, catalogo,
  guardar, guardarPerfil, alTerminar, alSalir, alCambiarIndice, textoTerminar = 'Terminar',
}) {
  const soloUna = modo === 'una'
  const pasos = pasosDe(conPerfil)
  const [estado, setEstado] = useState(estadoInicial)
  const [perfil, setPerfil] = useState(perfilInicial ?? {})
  const [errores, setErrores] = useState({})
  const [indice, setIndice] = useState(indiceInicial)
  const [aviso, setAviso] = useState('')
  const [animo, setAnimo] = useState('')
  const [guardado, setGuardado] = useState('') // '' | 'guardando' | 'guardado' | 'error'
  const [ocupado, setOcupado] = useState(false)

  const panel = useRef(null)
  const titulo = useRef(null)
  const importanciaRef = useRef(null)
  const contador = useRef(null)
  const direccion = useRef(1)
  const estadoRef = useRef(estado)
  const perfilRef = useRef(perfil)
  const indiceRef = useRef(indice)
  const temporizador = useRef(null)
  const toque = useRef(null)
  // El avance automático solo ocurre al elegir con mouse o dedo: con teclado, las flechas recorren
  // los niveles y Enter avanza
  const porPuntero = useRef(false)
  // Copias para los manejadores de teclado y temporizadores, que no deben quedar con datos viejos
  useLayoutEffect(() => {
    estadoRef.current = estado
    perfilRef.current = perfil
    indiceRef.current = indice
  })

  const paso = pasos[indice]
  const esHabito = paso.tipo === 'habito'
  const respuesta = esHabito ? estado.respuestas[paso.clave] : ''
  const nivel = esHabito ? estado.importancia[paso.clave] : ''
  const imprescindibles = contarImprescindibles(estado.importancia)
  const esUltima = soloUna || indice === pasos.length - 1
  const listo = esHabito ? Boolean(respuesta) : pasoListo(paso.tipo, perfil)
  const hechos = pasos.map((p) => (p.tipo === 'habito' ? Boolean(estado.respuestas[p.clave]) : pasoListo(p.tipo, perfil)))

  useEffect(() => alCambiarIndice?.(paso.clave), [paso.clave, alCambiarIndice])
  useEffect(() => () => clearTimeout(temporizador.current), [])

  // Entrada de cada pregunta: se desliza desde el lado hacia donde se avanza y las tarjetas
  // aparecen escalonadas. Con «reducir movimiento» se muestra directo
  useLayoutEffect(() => {
    window.scrollTo({ top: 0 })
    titulo.current?.focus({ preventScroll: true })
    if (prefiereSinMovimiento()) return undefined
    const contexto = gsap.context(() => {
      gsap.fromTo(panel.current, { x: direccion.current * 56, opacity: 0 }, { x: 0, opacity: 1, duration: 0.42, ease: 'power3.out' })
      gsap.from('.c-opcion, .c-formulario', { y: 18, opacity: 0, duration: 0.4, stagger: 0.06, delay: 0.08, ease: 'power2.out' })
    }, panel)
    return () => contexto.revert()
  }, [indice])

  const autoguardar = useCallback((nuevo, clave) => {
    if (soloUna || !guardar) return
    setGuardado('guardando')
    guardar({ [clave]: nuevo.respuestas[clave] || undefined, importancia: { [clave]: nuevo.importancia[clave] } })
      .then(() => setGuardado('guardado'))
      .catch(() => setGuardado('error'))
  }, [guardar, soloUna])

  const cambiarPregunta = useCallback((nuevo, dir) => {
    direccion.current = dir
    setAviso('')
    if (dir > 0 && ANIMOS[nuevo] && !soloUna && conPerfil) {
      setAnimo(ANIMOS[nuevo])
      clearTimeout(temporizador.current)
      temporizador.current = setTimeout(() => setAnimo(''), 2400)
    }
    if (prefiereSinMovimiento()) {
      setIndice(nuevo)
      return
    }
    gsap.to(panel.current, {
      x: -dir * 56, opacity: 0, duration: 0.2, ease: 'power2.in', onComplete: () => setIndice(nuevo),
    })
  }, [conPerfil, soloUna])

  const terminar = useCallback(async () => {
    setOcupado(true)
    try {
      await alTerminar(estadoRef.current)
    } finally {
      setOcupado(false)
    }
  }, [alTerminar])

  // Pasos de estudios y origen: se revisa que esté lo obligatorio y se guarda antes de seguir
  const guardarPasoPerfil = useCallback(async (tipo) => {
    const datos = perfilRef.current
    const faltan = CAMPOS_PASO[tipo].filter((c) => !String(datos[c] ?? '').trim())
    if (faltan.length) {
      setErrores(Object.fromEntries(faltan.map((c) => [c, 'Este campo es obligatorio'])))
      return false
    }
    setOcupado(true)
    setGuardado('guardando')
    try {
      await guardarPerfil(tipo, datos)
      setGuardado('guardado')
      setErrores({})
      return true
    } catch (err) {
      setGuardado('error')
      setErrores(err.errores ?? { general: err.message })
      return false
    } finally {
      setOcupado(false)
    }
  }, [guardarPerfil])

  const avanzar = useCallback(async () => {
    clearTimeout(temporizador.current)
    const i = indiceRef.current
    const actual = pasosDe(conPerfil)[i]
    if (actual.tipo === 'habito') {
      if (!estadoRef.current.respuestas[actual.clave]) return
    } else if (!(await guardarPasoPerfil(actual.tipo))) {
      return
    }
    if (soloUna || i === pasosDe(conPerfil).length - 1) terminar()
    else cambiarPregunta(i + 1, 1)
  }, [cambiarPregunta, guardarPasoPerfil, conPerfil, soloUna, terminar])

  const retroceder = useCallback(() => {
    clearTimeout(temporizador.current)
    const i = indiceRef.current
    setErrores({})
    if (soloUna || i === 0) alSalir?.()
    else cambiarPregunta(i - 1, -1)
  }, [alSalir, cambiarPregunta, soloUna])

  const cambiarPerfil = (nombre, valor) => {
    const nuevo = { ...perfilRef.current, [nombre]: valor }
    // Al cambiar de institución la sede anterior ya no sirve; si tiene una sola, se elige sola
    if (nombre === 'institucion_id') {
      const elegida = catalogo?.instituciones.find((i) => i.id === valor)
      nuevo.sede = elegida?.sedes.length === 1 ? elegida.sedes[0] : ''
    }
    setPerfil(nuevo)
    setErrores((e) => ({ ...e, [nombre]: undefined, general: undefined }))
  }

  const elegirOpcion = useCallback((valor, tarjeta) => {
    const actual = pasosDe(conPerfil)[indiceRef.current]
    if (actual.tipo !== 'habito') return
    const c = actual.clave
    const nuevo = { ...estadoRef.current, respuestas: { ...estadoRef.current.respuestas, [c]: valor } }
    setEstado(nuevo)
    autoguardar(nuevo, c)
    if (prefiereSinMovimiento()) return
    // Rebote de la tarjeta elegida y, enseguida, la importancia a la vista
    if (tarjeta) gsap.fromTo(tarjeta, { scale: 0.94 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' })
    clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => {
      importanciaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 320)
  }, [autoguardar, conPerfil])

  const elegirNivel = useCallback((valor, automatico = false) => {
    const c = pasosDe(conPerfil)[indiceRef.current].clave
    const actual = estadoRef.current.importancia[c]
    if (valor === 'imprescindible' && actual !== 'imprescindible'
      && contarImprescindibles(estadoRef.current.importancia) >= MAX_IMPRESCINDIBLES) {
      setAviso(`Ya elegiste ${MAX_IMPRESCINDIBLES} imprescindibles. Cambia alguno a «Importante» para marcar este.`)
      if (!prefiereSinMovimiento()) {
        gsap.fromTo(contador.current, { x: 0 }, { keyframes: { x: [-8, 8, -5, 5, 0] }, duration: 0.45, ease: 'power1.out' })
      }
      return
    }
    setAviso('')
    const nuevo = { ...estadoRef.current, importancia: { ...estadoRef.current.importancia, [c]: valor } }
    setEstado(nuevo)
    autoguardar(nuevo, c)
    // Elegida la importancia (con mouse o dedo), se pasa sola a la siguiente pregunta
    if (automatico && estadoRef.current.respuestas[c]) {
      clearTimeout(temporizador.current)
      temporizador.current = setTimeout(avanzar, prefiereSinMovimiento() ? 150 : 520)
    }
  }, [autoguardar, avanzar, conPerfil])

  // Teclado: 1–4 elige opción, Enter sigue y ← vuelve. Mientras se escribe en un campo de texto
  // los números y las flechas son para el campo
  useEffect(() => {
    const tecla = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || ocupado) return
      const escribiendo = esCampoDeTexto(e.target)
      const enRadio = e.target instanceof HTMLInputElement && e.target.type === 'radio'
      const actual = pasosDe(conPerfil)[indiceRef.current]
      const numero = Number(e.key)
      if (!escribiendo && actual.tipo === 'habito' && numero >= 1 && numero <= actual.opciones.length) {
        e.preventDefault()
        elegirOpcion(actual.opciones[numero - 1].valor, panel.current?.querySelectorAll('.c-opcion')[numero - 1])
      } else if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement) && !(e.target instanceof HTMLAnchorElement)
        && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        avanzar()
      } else if (e.key === 'ArrowLeft' && !enRadio && !escribiendo) {
        e.preventDefault()
        retroceder()
      } else if (e.key === 'Escape' && soloUna) {
        alSalir?.()
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [alSalir, avanzar, elegirOpcion, ocupado, conPerfil, retroceder, soloUna])

  // Móvil: deslizar a la izquierda avanza y a la derecha vuelve
  const empezarToque = (e) => {
    if (e.pointerType === 'touch' && !esCampoDeTexto(e.target)) toque.current = { x: e.clientX, y: e.clientY }
  }
  const terminarToque = (e) => {
    if (!toque.current || e.pointerType !== 'touch') return
    const dx = e.clientX - toque.current.x
    const dy = e.clientY - toque.current.y
    toque.current = null
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    if (dx < 0) avanzar()
    else retroceder()
  }

  const idPregunta = `c-pregunta-${paso.clave}`
  const idImportancia = `c-importancia-${paso.clave}`

  return (
    <div className="c-flujo" onPointerDown={empezarToque} onPointerUp={terminarToque}>
      <div className="c-flujo-arriba">
        <button type="button" className="c-volver" onClick={retroceder}>
          <Flecha izquierda /> {soloUna ? 'Cancelar' : indice === 0 ? 'Bienvenida' : 'Anterior'}
        </button>
        <Progreso pasos={pasos} indice={indice} hechos={hechos} soloUna={soloUna} />
        <span className={`c-guardado ${guardado}`} role="status">
          {guardado === 'guardando' && 'Guardando…'}
          {guardado === 'guardado' && <><Check /> Guardado</>}
          {guardado === 'error' && 'No se pudo guardar'}
        </span>
      </div>

      {animo && <p className="c-animo" role="status">{animo}</p>}

      <div ref={panel} className="c-panel" key={paso.clave}>
        {!esHabito ? (
          <>
            <PasoPerfil tipo={paso.tipo} perfil={perfil} errores={errores} catalogo={catalogo}
              alCambiar={cambiarPerfil} tituloRef={titulo} idTitulo={idPregunta} />
            {errores.general && <p className="c-aviso" role="alert">{errores.general}</p>}
          </>
        ) : (
          <>
            <fieldset className="c-pregunta" aria-labelledby={idPregunta}>
              <p className="c-categoria">{paso.titulo}</p>
              <h1 id={idPregunta} ref={titulo} tabIndex={-1} className="c-titulo">{paso.pregunta}</h1>
              <p className="c-ayuda-teclado" aria-hidden="true">Elige una opción · teclas 1 a {paso.opciones.length}</p>
              <div className={`c-opciones c-opciones-${paso.opciones.length}`}>
                {paso.opciones.map((op, i) => {
                  const elegida = respuesta === op.valor
                  return (
                    <label key={op.valor} className={`c-opcion${elegida ? ' elegida' : ''}`}>
                      <input type="radio" name={paso.clave} value={op.valor} checked={elegida}
                        onChange={(e) => elegirOpcion(op.valor, e.currentTarget.parentElement)} />
                      <span className="c-opcion-numero" aria-hidden="true">{i + 1}</span>
                      <span className="c-opcion-check" aria-hidden="true"><Check /></span>
                      <span className="c-opcion-ilustracion"><IlustracionOpcion categoria={paso.clave} valor={op.valor} /></span>
                      <span className="c-opcion-texto">{op.texto}</span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            <fieldset ref={importanciaRef} className={`c-importancia${respuesta ? ' visible' : ''}`}
              aria-labelledby={idImportancia} disabled={!respuesta}>
              <div className="c-importancia-cabecera">
                <p id={idImportancia} className="c-importancia-titulo">¿Qué tan importante es que tu roomie coincida contigo en esto?</p>
                <p ref={contador} className={`c-contador${imprescindibles >= MAX_IMPRESCINDIBLES ? ' lleno' : ''}`} aria-live="polite">
                  <span className="c-contador-gemas" aria-hidden="true">
                    {Array.from({ length: MAX_IMPRESCINDIBLES }, (_, i) => <span key={i} className={i < imprescindibles ? 'usada' : ''} />)}
                  </span>
                  Imprescindibles: {imprescindibles} de {MAX_IMPRESCINDIBLES}
                </p>
              </div>
              <div className="c-niveles" onPointerDown={() => { porPuntero.current = true }}
                onKeyDown={() => { porPuntero.current = false }}>
                {NIVELES.map((n) => (
                  <label key={n.valor} className={`c-nivel c-nivel-${n.valor}${nivel === n.valor ? ' elegido' : ''}`}>
                    <input type="radio" name={`importancia-${paso.clave}`} value={n.valor} checked={nivel === n.valor}
                      onChange={() => elegirNivel(n.valor, porPuntero.current)}
                      onClick={() => porPuntero.current && nivel === n.valor && elegirNivel(n.valor, true)} />
                    <span className="c-nivel-icono"><IconoNivel nivel={n.valor} /></span>
                    <span className="c-nivel-textos">
                      <strong>{n.titulo}</strong>
                      <span className="c-nivel-lema">{n.lema}</span>
                      <span className="c-nivel-texto">{n.texto}</span>
                    </span>
                  </label>
                ))}
              </div>
              {aviso && <p className="c-aviso" role="alert">{aviso}</p>}
            </fieldset>
          </>
        )}
      </div>

      <div className="c-flujo-abajo">
        <p className="c-atajos" aria-hidden="true">Enter para seguir · ← para volver</p>
        <button type="button" className="c-boton" onClick={avanzar} disabled={!listo || ocupado}>
          {ocupado ? 'Guardando…' : esUltima ? textoTerminar : 'Siguiente'} {!ocupado && <Flecha />}
        </button>
      </div>
    </div>
  )
}
