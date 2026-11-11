import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import Confirmar from '../componentes/Confirmar.jsx'
import { IconoPapelera } from '../componentes/Iconos.jsx'
import ModalPausadas from '../inicio/ModalPausadas.jsx'
import {
  IconoCamara, IconoCerrar, IconoEditar, IconoEscudo, IconoFlecha, IconoMas, IconoMatch, IconoPausa,
} from '../inicio/iconos.jsx'
import { contar, gsap, prefiereSinMovimiento } from '../landing/animaciones.js'
import {
  CARACTERISTICAS, formatearFecha, formatearPesos, GENEROS_PREFERIDOS, MAX_FOTOS, SERVICIOS, textoDe, TIPOS,
} from '../publicaciones.js'
import { useSesion } from '../sesion/SesionContext.jsx'
import { estaVerificado } from '../sesion/verificacion.js'
import './misPublicaciones.css'

// Cómo ve su dueño cada estado
const ESTADO = {
  activa: { texto: 'Visible', tono: 'ok' },
  completa: { texto: 'Sin cupos', tono: 'aviso' },
  pausada: { texto: 'Pausada', tono: 'aviso' },
  suspendida: { texto: 'Oculta por moderación', tono: 'alerta' },
}
const PESTANAS = [
  { clave: 'todas', texto: 'Todas' },
  { clave: 'activa', texto: 'Visibles' },
  { clave: 'pausada', texto: 'Pausadas' },
  { clave: 'completa', texto: 'Sin cupos' },
  { clave: 'suspendida', texto: 'Ocultas' },
]
// En «Todas», primero lo que necesita una respuesta y al final lo que no depende de su dueño
const ORDEN = { pausada: 0, activa: 1, completa: 2, suspendida: 3 }

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`

// Propuestas y roomies por publicación, desde el lado de quien ofrece (GET /matches)
function porPublicacion(r) {
  const res = {}
  const sumar = (id, campo) => {
    res[id] ??= { porResponder: 0, roomies: 0 }
    res[id][campo] += 1
  }
  for (const m of r.propuestas) if (m.rol === 'oferente' && m.mi_respuesta === 'pendiente') sumar(m.publicacion.id, 'porResponder')
  for (const m of r.confirmados) if (m.rol === 'oferente') sumar(m.publicacion.id, 'roomies')
  return res
}

// Sin fotos: una habitación dibujada con los colores de la marca
const SinFotos = () => (
  <svg className="mp-sin-fotos" viewBox="0 0 320 200" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    <rect width="320" height="200" fill="#e3f1ef" />
    <rect y="150" width="320" height="50" fill="#cfe5e1" />
    <rect x="196" y="46" width="78" height="62" rx="4" fill="#fff" />
    <path d="M235 46v62M196 77h78" stroke="#cfe5e1" strokeWidth="4" />
    <rect x="40" y="112" width="120" height="40" rx="8" fill="#12766b" />
    <rect x="40" y="96" width="34" height="26" rx="6" fill="#3fd1b8" />
    <rect x="180" y="118" width="52" height="34" rx="4" fill="#0e2440" />
    <circle cx="252" cy="134" r="10" fill="#f2c94c" />
  </svg>
)

// Casas de línea que flotan en la cabecera (decorativas)
const Casas = () => (
  <svg className="mp-casas" viewBox="0 0 260 180" fill="none" aria-hidden="true">
    <g className="mp-casa-flota">
      <path d="M40 92 L96 48 L152 92" stroke="#3fd1b8" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="54" y="88" width="84" height="64" rx="8" fill="#fff" />
      <rect x="86" y="114" width="20" height="38" rx="3" fill="#12766b" />
      <rect x="64" y="100" width="16" height="14" rx="2" fill="#f2c94c" />
      <rect x="112" y="100" width="16" height="14" rx="2" fill="#cfece7" />
    </g>
    <g className="mp-casa-flota">
      <path d="M160 70 L200 40 L240 70" stroke="rgb(255 255 255 / 0.55)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="170" y="67" width="60" height="44" rx="6" fill="rgb(255 255 255 / 0.16)" />
      <rect x="194" y="86" width="12" height="25" rx="2" fill="rgb(255 255 255 / 0.4)" />
    </g>
    <g className="mp-casa-flota">
      <rect x="182" y="128" width="64" height="26" rx="13" fill="#f2c94c" />
      <text x="214" y="146" textAnchor="middle" fontFamily="Outfit, sans-serif" fontWeight="700" fontSize="13" fill="#0e2440">$ / mes</text>
    </g>
  </svg>
)

// Pestañas en una cápsula, con una píldora que se desliza a la elegida y flechas del teclado
function Pestanas({ pestanas, actual, alCambiar, resumen }) {
  const lista = useRef(null)
  const indicador = useRef(null)
  const primera = useRef(true)

  const mover = useCallback((animar) => {
    const boton = lista.current?.querySelector(`[data-clave="${actual}"]`)
    if (!boton || !indicador.current) return
    const destino = { x: boton.offsetLeft, width: boton.offsetWidth }
    if (animar) gsap.to(indicador.current, { ...destino, duration: 0.4, ease: 'power3.out' })
    else gsap.set(indicador.current, destino)
  }, [actual])

  useLayoutEffect(() => {
    mover(!primera.current && !prefiereSinMovimiento())
    primera.current = false
  }, [mover, pestanas.length])

  // Si cambia el ancho (pantalla o fuentes cargadas), el indicador se reubica sin animar
  useEffect(() => {
    const obs = new ResizeObserver(() => mover(false))
    obs.observe(lista.current)
    return () => obs.disconnect()
  }, [mover])

  const teclas = (e) => {
    // Desde la pestaña con el foco (con el teclado se puede estar en otra que la elegida)
    const enFoco = e.target.closest('[role="tab"]')?.dataset.clave ?? actual
    const i = pestanas.findIndex((t) => t.clave === enFoco)
    const destinos = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: pestanas.length - 1 }
    if (!(e.key in destinos)) return
    e.preventDefault()
    const siguiente = pestanas[(destinos[e.key] + pestanas.length) % pestanas.length]
    alCambiar(siguiente.clave)
    lista.current.querySelector(`[data-clave="${siguiente.clave}"]`)?.focus()
  }

  return (
    <div className="mp-pestanas-zona">
      <div ref={lista} className="mp-pestanas" role="tablist" aria-label="Filtrar por estado" onKeyDown={teclas}>
        {pestanas.map((t) => (
          <button key={t.clave} type="button" role="tab" id={`mp-tab-${t.clave}`} data-clave={t.clave}
            aria-selected={t.clave === actual} aria-controls="mp-panel" tabIndex={t.clave === actual ? 0 : -1}
            onClick={() => alCambiar(t.clave)}>
            {t.texto} <span className="mp-cuenta">{t.n}</span>
          </button>
        ))}
        <span ref={indicador} className="mp-indicador" aria-hidden="true" />
      </div>
      {resumen && <p className="mp-pestanas-resumen">{resumen}</p>}
    </div>
  )
}

// Lo que incluye y permite, en frases cortas para las etiquetas de la tarjeta
function etiquetasDe(p) {
  const incluidos = SERVICIOS.filter((x) => p.gastos?.[x.clave]?.incluido).map((x) => x.texto.toLowerCase())
  const gastos = p.gastos?.todos_incluidos ? 'Gastos incluidos'
    : incluidos.length ? `Incluye ${incluidos.join(', ').replace(/, ([^,]*)$/, ' y $1')}` : null
  const r = p.reglas ?? {}
  return [
    gastos && { texto: gastos, tono: 'acento' },
    ...CARACTERISTICAS.filter((c) => p.caracteristicas?.[c.clave]).map((c) => ({ texto: c.texto })),
    p.genero_preferido !== 'indiferente' && { texto: textoDe(GENEROS_PREFERIDOS, p.genero_preferido) },
    { texto: r.permite_mascotas ? 'Acepta mascotas' : 'Sin mascotas', tono: 'suave' },
    { texto: r.permite_fumar ? 'Se puede fumar' : 'No se fuma', tono: 'suave' },
    { texto: r.permite_visitas ? 'Visitas permitidas' : 'Sin visitas', tono: 'suave' },
  ].filter(Boolean)
}

const IconoOjo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" />
  </svg>
)

/**
 * Una publicación. Se arma según su propio ancho (container queries en misPublicaciones.css):
 * angosta, todo apilado; mediana, la foto al lado; ancha, además una columna con cifras y acciones.
 * La foto siempre se recorta igual y acompaña la altura del texto: no deja huecos.
 */
function TarjetaPublicacion({ p, info, conMatches, oferente, alEliminar, alReactivar }) {
  const foto = p.fotos.find((f) => f.es_principal) ?? p.fotos[0]
  const miniaturas = p.fotos.filter((f) => f !== foto).slice(0, 3)
  const estado = ESTADO[p.estado] ?? { texto: p.estado, tono: 'aviso' }
  const editar = `/publicaciones/${p.id}/editar`
  const avance = p.cupos_totales ? p.cupos_disponibles / p.cupos_totales : 0
  const fecha = p.fecha_ultima_modificacion
    ? `Editada el ${formatearFecha(p.fecha_ultima_modificacion)}`
    : `Publicada el ${formatearFecha(p.fecha_publicacion)}`
  const porResponder = info?.porResponder ?? 0

  return (
    <li className="mp-tarjeta" data-id={p.id} data-estado={p.estado}>
      <div className="mp-tarjeta-interior">
        <div className="mp-media">
          {foto ? <img src={foto.url} alt="" loading="lazy" /> : <SinFotos />}
          <span className="mp-estado" data-tono={estado.tono}><span className="mp-punto" aria-hidden="true" />{estado.texto}</span>
          {miniaturas.length > 0 && (
            <span className="mp-miniaturas" aria-hidden="true">
              {miniaturas.map((f) => <img key={f.url} src={f.url} alt="" loading="lazy" />)}
            </span>
          )}
          {p.fotos.length === 0 && p.estado !== 'suspendida' && (
            <Link to={editar} className="mp-agregar-fotos"><IconoCamara /> Agregar fotos</Link>
          )}
        </div>

        <div className="mp-contenido">
          {/* Lo principal: qué es, cuánto cuesta y cómo es */}
          <div className="mp-principal">
            <p className="mp-meta">{textoDe(TIPOS, p.tipo)} en {p.ubicacion.comuna_nombre}, {p.ubicacion.sector}</p>
            <h3><Link to={`/alojamientos/${p.id}`} className="mp-titulo">{p.titulo}</Link></h3>
            <p className="mp-precio">{formatearPesos(p.costo_mensual)} <span>/ mes</span></p>
            {p.descripcion && <p className="mp-descripcion">{p.descripcion}</p>}
            <ul className="mp-etiquetas" aria-label="Qué incluye y qué permite">
              {etiquetasDe(p).map((e) => <li key={e.texto} data-tono={e.tono}>{e.texto}</li>)}
            </ul>
            {porResponder > 0 && (
              <Link to="/propuestas" className="mp-senal">
                <IconoMatch /> {plural(porResponder, 'propuesta por responder', 'propuestas por responder')} <IconoFlecha />
              </Link>
            )}
            {p.estado === 'pausada' && <p className="mp-nota">Nadie la ve mientras esté pausada.</p>}
            {p.estado === 'suspendida' && <p className="mp-nota" data-tono="alerta">Un administrador la ocultó. Revisa el aviso que te enviamos.</p>}
            <p className="mp-fecha">{fecha}</p>
          </div>

          {/* Cifras y acciones */}
          <div className="mp-lateral">
            <dl className="mp-datos">
              <div className="mp-dato mp-dato-cupos">
                <dt>Cupos libres</dt>
                <dd>{p.cupos_disponibles}<small> de {p.cupos_totales}</small></dd>
                <span className="mp-barra" aria-hidden="true"><span className="mp-barra-relleno" style={{ '--avance': avance }} /></span>
              </div>
              {conMatches && (
                <div className="mp-dato" data-destacado={porResponder > 0 || undefined} data-cero={porResponder === 0 || undefined}>
                  <dt>Por responder</dt><dd>{porResponder}</dd>
                </div>
              )}
              {conMatches && (
                <div className="mp-dato" data-cero={!info?.roomies || undefined}><dt>Roomies</dt><dd>{info?.roomies ?? 0}</dd></div>
              )}
              <div className="mp-dato" data-cero={p.fotos.length === 0 || undefined}>
                <dt>Fotos</dt><dd>{p.fotos.length}<small> de {MAX_FOTOS}</small></dd>
              </div>
            </dl>

            <div className="mp-acciones">
              {p.estado === 'pausada' && oferente && (
                <button type="button" className="mp-boton primario mp-accion-principal" onClick={() => alReactivar(p)}>
                  Publicar de nuevo
                </button>
              )}
              <Link to={editar} className={`mp-boton ${p.estado === 'pausada' && oferente ? '' : 'primario'}`}
                aria-label={`Editar «${p.titulo}»`}>
                <IconoEditar /> Editar
              </Link>
              <Link to={`/alojamientos/${p.id}`} className="mp-boton mp-ver"><IconoOjo /> Ver como estudiante</Link>
              <button type="button" className="mp-boton icono peligro" onClick={() => alEliminar(p)}
                aria-label={`Eliminar «${p.titulo}»`} title="Eliminar">
                <IconoPapelera />
              </button>
            </div>
          </div>
        </div>
      </div>
    </li>
  )
}

/**
 * «Mis publicaciones» (EP-03): la página propia del oferente. Arriba el resumen, después lo que
 * pide su atención y al final sus publicaciones filtradas por estado. Las animaciones (GSAP) solo
 * mueven transform y opacidad, y con «reducir movimiento» no se ejecutan.
 */
export default function MisPublicaciones() {
  const { usuario } = useSesion()
  const { state } = useLocation()
  const navegar = useNavigate()
  const ref = useRef(null)
  const panel = useRef(null)
  const [publicaciones, setPublicaciones] = useState(null)
  const [error, setError] = useState('')
  const [matches, setMatches] = useState(undefined) // undefined: cargando; null: no disponibles
  const [filtro, setFiltro] = useState('todas')
  const [aviso, setAviso] = useState(state?.aviso ?? null)
  const [porEliminar, setPorEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)
  const [revision, setRevision] = useState(null)

  const oferente = usuario.modo === 'oferente'
  const verificado = estaVerificado(usuario)

  const cargar = useCallback(() => api('/publicaciones/mias')
    .then((l) => { setPublicaciones(l); setError('') })
    .catch((err) => { setError(err.message); setPublicaciones([]) }), [])

  useEffect(() => {
    cargar()
    // Las propuestas piden la cuenta verificada: sin ellas la página igual funciona
    api('/matches').then((r) => setMatches(porPublicacion(r))).catch(() => setMatches(null))
  }, [cargar])

  // El aviso al volver de publicar o editar se muestra una vez
  useEffect(() => {
    if (state?.aviso) navegar('.', { replace: true, state: null })
  }, [state, navegar])

  const lista = publicaciones ?? []
  const cuenta = (estado) => lista.filter((p) => p.estado === estado).length
  const pausadas = lista.filter((p) => p.estado === 'pausada')
  const visibles = lista.filter((p) => p.estado === 'activa')
  const cuposLibres = visibles.reduce((s, p) => s + p.cupos_disponibles, 0)
  const porResponder = matches ? Object.values(matches).reduce((s, m) => s + m.porResponder, 0) : 0
  const sinFotos = lista.filter((p) => p.fotos.length === 0 && p.estado !== 'suspendida')

  const pestanas = PESTANAS
    .map((t) => ({ ...t, n: t.clave === 'todas' ? lista.length : cuenta(t.clave) }))
    .filter((t) => t.clave === 'todas' || t.n > 0)
  // Si la pestaña elegida se quedó vacía (por ejemplo, al eliminar), se vuelve a «Todas»
  const actual = pestanas.some((t) => t.clave === filtro) ? filtro : 'todas'
  const mostradas = (actual === 'todas' ? [...lista].sort((a, b) => ORDEN[a.estado] - ORDEN[b.estado]) : lista.filter((p) => p.estado === actual))

  const listo = publicaciones !== null && matches !== undefined

  // Entrada de la página: cabecera, cifras, pendientes, pestañas y tarjetas, en ese orden
  useLayoutEffect(() => {
    if (!listo || prefiereSinMovimiento()) return undefined
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(ref)
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from(q('.mp-cabecera'), { opacity: 0, y: 18, duration: 0.55 })
        .from(q('.mp-cabecera-texto > *'), { opacity: 0, y: 12, stagger: 0.06, duration: 0.45 }, '-=0.35')
        .from(q('.mp-cifra'), { opacity: 0, y: 12, stagger: 0.06, duration: 0.45 }, '-=0.3')
        .from(q('.mp-casas'), { opacity: 0, x: 24, duration: 0.6 }, '<')
        .from(q('.mp-pendiente'), { opacity: 0, y: 12, stagger: 0.06, duration: 0.4 }, '-=0.25')
        .from(q('.mp-pestanas-zona'), { opacity: 0, y: 10, duration: 0.4 }, '-=0.2')
        .from(q('.mp-tarjeta'), { opacity: 0, y: 22, scale: 0.98, stagger: 0.07, duration: 0.55 }, '-=0.2')
        .from(q('.mp-barra-relleno'), { scaleX: 0, stagger: 0.07, duration: 0.7 }, '-=0.45')
      q('[data-valor]').forEach((el) => contar(el, { duracion: 1.1, retraso: 0.25 }))
      gsap.to(q('.mp-casa-flota'), { y: -6, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: 0.5 })
    }, ref)
    return () => ctx.revert()
  }, [listo])

  // Cambio de pestaña: las tarjetas nuevas entran escalonadas (la primera vez lo hace la entrada)
  const filtroAnterior = useRef(actual)
  useLayoutEffect(() => {
    if (filtroAnterior.current === actual) return undefined
    filtroAnterior.current = actual
    if (prefiereSinMovimiento()) return undefined
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(panel)
      // Con un desenfoque breve: lo que entra se funde en vez de aparecer de golpe
      gsap.from(q('.mp-tarjeta'), { opacity: 0, y: 14, filter: 'blur(3px)', duration: 0.4, stagger: 0.05, ease: 'power3.out', clearProps: 'filter' })
      gsap.from(q('.mp-barra-relleno'), { scaleX: 0, duration: 0.6, stagger: 0.05, ease: 'power3.out', delay: 0.1 })
    }, panel)
    return () => ctx.revert()
  }, [actual])

  const eliminar = async () => {
    const pub = porEliminar
    setEliminando(true)
    try {
      await api(`/publicaciones/${pub.id}`, { metodo: 'DELETE' })
      setAviso({ tipo: 'exito', texto: `Se eliminó «${pub.titulo}».` }) // CA-08.2
      const quitar = () => setPublicaciones((l) => l.filter((p) => p.id !== pub.id))
      const el = panel.current?.querySelector(`[data-id="${pub.id}"]`)
      if (el && !prefiereSinMovimiento()) {
        gsap.to(el, { opacity: 0, scale: 0.96, duration: 0.25, ease: 'power2.in', onComplete: quitar })
      } else quitar()
    } catch (err) {
      setAviso({ tipo: 'alerta', texto: err.message })
    } finally {
      setEliminando(false)
      setPorEliminar(null)
    }
  }

  // Lo que pide atención, en orden de importancia
  const pendientes = []
  if (pausadas.length && oferente) {
    pendientes.push({
      clave: 'pausadas', tono: 'aviso', Icono: IconoPausa,
      titulo: plural(pausadas.length, 'publicación pausada', 'publicaciones pausadas'),
      texto: pausadas.length === 1
        ? 'Confirma si sigue disponible para volver a mostrarla.'
        : 'Confirma si siguen disponibles para volver a mostrarlas.',
      accion: <button type="button" className="mp-boton primario" onClick={() => setRevision(pausadas)}>Revisar ahora</button>,
    })
  }
  if (porResponder > 0) {
    pendientes.push({
      clave: 'propuestas', tono: 'ok', Icono: IconoMatch,
      titulo: plural(porResponder, 'propuesta por responder', 'propuestas por responder'),
      texto: 'Estudiantes compatibles esperan tu respuesta.',
      accion: <Link to="/propuestas" className="mp-boton">Ver propuestas <IconoFlecha /></Link>,
    })
  }
  if (sinFotos.length) {
    pendientes.push({
      clave: 'fotos', tono: 'info', Icono: IconoCamara,
      titulo: plural(sinFotos.length, 'publicación sin fotos', 'publicaciones sin fotos'),
      texto: 'Con fotos, los estudiantes entienden mejor tu espacio.',
      accion: <Link to={`/publicaciones/${sinFotos[0].id}/editar`} className="mp-boton">Agregar fotos</Link>,
    })
  }
  if (cuenta('suspendida')) {
    pendientes.push({
      clave: 'ocultas', tono: 'alerta', Icono: IconoEscudo,
      titulo: plural(cuenta('suspendida'), 'publicación oculta', 'publicaciones ocultas'),
      texto: `Un administrador ${cuenta('suspendida') === 1 ? 'la ocultó' : 'las ocultó'}. El motivo está en tus avisos.`,
    })
  }

  const resumen = lista.length === 0
    ? 'Todavía no publicas ningún espacio.'
    : `${plural(visibles.length, 'visible', 'visibles')} para estudiantes${pausadas.length ? ` · ${plural(pausadas.length, 'pausada', 'pausadas')}` : ''}`

  return (
    <main ref={ref} className="mp-pagina">
      <header className="mp-cabecera">
        <div className="mp-cabecera-texto">
          <p className="mp-ojo">Tus espacios</p>
          <h1>Mis publicaciones</h1>
          <p className="mp-resumen">{publicaciones === null ? 'Cargando…' : resumen}</p>
          {verificado && oferente && (
            <Link to="/publicaciones/nueva" className="l-boton l-boton-luz mp-publicar"><IconoMas tamano={18} /> Publicar alojamiento</Link>
          )}
        </div>
        <Casas />
        {listo && lista.length > 0 && (
          <dl className="mp-cifras">
            <div className="mp-cifra"><dt>Visibles</dt><dd data-valor={visibles.length}>{visibles.length}</dd></div>
            <div className="mp-cifra"><dt>Cupos libres</dt><dd data-valor={cuposLibres}>{cuposLibres}</dd></div>
            {matches && <div className="mp-cifra"><dt>Por responder</dt><dd data-valor={porResponder}>{porResponder}</dd></div>}
            <div className="mp-cifra"><dt>Publicadas</dt><dd data-valor={lista.length}>{lista.length}</dd></div>
          </dl>
        )}
      </header>

      {aviso && (
        <div className="mp-aviso" data-tono={aviso.tipo} role={aviso.tipo === 'alerta' ? 'alert' : 'status'}>
          <p>{aviso.texto}</p>
          <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar aviso"><IconoCerrar /></button>
        </div>
      )}
      {error && <p className="mp-aviso" data-tono="alerta" role="alert">{error}</p>}
      {!oferente && lista.length > 0 && (
        <p className="mp-aviso" data-tono="info">Estás como buscador: tus publicaciones están pausadas y nadie las ve.</p>
      )}

      {!listo && (
        <div className="mp-cargando" role="status" aria-label="Cargando tus publicaciones">
          {[0, 1].map((i) => (
            <div key={i} className="mp-silueta">
              <span className="mp-sil-foto" />
              <span className="mp-sil-texto">
                <span style={{ width: '40%' }} /><span style={{ width: '75%', height: 20 }} /><span style={{ width: '30%', height: 24 }} />
                <span style={{ width: '90%' }} /><span className="mp-sil-datos" />
              </span>
            </div>
          ))}
        </div>
      )}

      {listo && pendientes.length > 0 && (
        <section className="mp-pendientes" aria-labelledby="mp-titulo-pendientes">
          <h2 id="mp-titulo-pendientes" className="mp-subtitulo">Necesita tu atención</h2>
          <ul>
            {pendientes.map(({ clave, tono, Icono, titulo, texto, accion }) => (
              <li key={clave} className="mp-pendiente" data-tono={tono}>
                <span className="mp-pendiente-icono" aria-hidden="true"><Icono /></span>
                <span className="mp-pendiente-texto"><strong>{titulo}</strong><span>{texto}</span></span>
                {accion}
              </li>
            ))}
          </ul>
        </section>
      )}

      {listo && lista.length === 0 && !error && (
        <section className="mp-vacio">
          <SinFotos />
          <div>
            <h2>Publica tu primer espacio</h2>
            <p>Una habitación o un departamento: con fotos, precio y reglas de convivencia. RoomMatch te propondrá estudiantes compatibles.</p>
            {verificado
              ? <Link to="/publicaciones/nueva" className="l-boton"><IconoMas tamano={18} /> Publicar alojamiento</Link>
              : <p className="mp-nota">Podrás publicar cuando tu cuenta esté verificada.</p>}
          </div>
        </section>
      )}

      {listo && lista.length > 0 && (
        <section className="mp-listado" aria-label="Tus publicaciones">
          <Pestanas pestanas={pestanas} actual={actual} alCambiar={setFiltro}
            resumen={actual === 'todas' ? plural(lista.length, 'publicación', 'publicaciones') : `${mostradas.length} de ${lista.length}`} />
          <div ref={panel} id="mp-panel" role="tabpanel" aria-labelledby={`mp-tab-${actual}`}>
            <ul className="mp-grilla">
              {mostradas.map((p) => (
                <TarjetaPublicacion key={p.id} p={p} info={matches?.[p.id]} conMatches={Boolean(matches)} oferente={oferente}
                  alEliminar={setPorEliminar} alReactivar={(pub) => setRevision([pub])} />
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* CA-08.1 y CA-08.3: se pide confirmar; al cancelar no cambia nada */}
      <Confirmar abierto={Boolean(porEliminar)} titulo="¿Eliminar esta publicación?"
        mensaje={porEliminar && `«${porEliminar.titulo}» dejará de aparecer en las búsquedas. Esta acción no se puede deshacer.`}
        textoConfirmar="Sí, eliminar" textoOcupado="Eliminando…" ocupado={eliminando}
        onConfirmar={eliminar} onCancelar={() => setPorEliminar(null)} />

      {revision && <ModalPausadas publicaciones={revision} alCambiar={cargar} alCerrar={() => setRevision(null)} />}
    </main>
  )
}
