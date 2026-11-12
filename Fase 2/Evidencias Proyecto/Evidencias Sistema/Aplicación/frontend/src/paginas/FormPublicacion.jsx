import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api.js'
import AvisoVerificacion from '../componentes/AvisoVerificacion.jsx'
import { NOMBRES_ROL, SIN_CAMBIO_CON_CONVIVENCIA, useCambioRol } from '../rol/CambioRol.jsx'
import { useSesion } from '../sesion/SesionContext.jsx'
import { estaVerificado } from '../sesion/verificacion.js'
import Campo from '../componentes/Campo.jsx'
import { OpcionesBoton } from '../componentes/FechaNacimiento.jsx'
import FotosPublicacion from '../componentes/FotosPublicacion.jsx'
import { IconoCheck, IconoPersona, IconoUbicacion } from '../componentes/Iconos.jsx'
import {
  IconoAgua, IconoAuto, IconoDucha, IconoGas, IconoInternet, IconoLuz, IconoCama,
} from '../componentes/IconosAlojamiento.jsx'
import SinFoto from '../componentes/SinFoto.jsx'
import { IconoHabito } from '../perfil/iconos.jsx'
import {
  aFormulario, aPayload, CARACTERISTICAS, formatearPesos, FORMULARIO_VACIO, GENEROS_PREFERIDOS, REGLAS,
  SERVICIOS, SI_NO, textoDe, TIPOS, ubicarDireccion,
} from '../publicaciones.js'
import './formPublicacion.css'

// Leaflet solo se descarga al abrir el formulario
const SelectorUbicacion = lazy(() => import('../componentes/SelectorUbicacion.jsx'))

const MAX_DESCRIPCION = 1000
const MAX_REGLAS = 300

const INCLUIDO = [
  { valor: 'si', texto: 'Incluido' },
  { valor: 'no', texto: 'Se paga aparte' },
]

const ICONO_SERVICIO = { agua: <IconoAgua />, luz: <IconoLuz />, gas: <IconoGas />, internet: <IconoInternet /> }
const ICONO_CARACTERISTICA = { amoblado: <IconoCama />, banio_privado: <IconoDucha />, estacionamiento: <IconoAuto /> }
// Las reglas usan los mismos íconos que los hábitos del perfil
const HABITO_DE_REGLA = { permite_fumar: 'fumar', permite_mascotas: 'mascotas', permite_visitas: 'visitas' }

// Una parte del formulario, numerada, con su título y para qué sirve. Al completarla, el número
// se vuelve un visto (lo mismo que muestra el índice de la derecha)
function Seccion({ numero, titulo, descripcion, completa, children, className = '' }) {
  return (
    <section className={`pf-seccion ${className}`} id={`pf-paso-${numero}`} aria-labelledby={`pf-seccion-${numero}`}>
      <div className="pf-seccion-cabeza">
        <span className="pf-numero" data-completa={completa || undefined} aria-hidden="true">
          {completa ? <IconoCheck /> : numero}
        </span>
        <div>
          <h2 id={`pf-seccion-${numero}`}>{titulo}</h2>
          <p>{descripcion}</p>
        </div>
      </div>
      <div className="pf-campos">{children}</div>
    </section>
  )
}

// Estado de la búsqueda de la dirección en el mapa, con su ícono
const TEXTO_UBICANDO = {
  buscando: 'Buscando la dirección en el mapa…',
  listo: 'Marcamos la dirección en el mapa. Si no quedó exacta, arrastra el marcador.',
  calle: 'El mapa no tiene ese número: marcamos la calle. Arrastra el marcador hasta el lugar exacto.',
  sin_resultado: 'No encontramos esa dirección. Revisa la calle y el número, o toca el mapa para marcarla.',
  falta: 'Escribe la calle y el número para ubicarla en el mapa.',
}

// HU-05 y HU-06 (/publicaciones/nueva) y HU-07 (/publicaciones/:id/editar): mismo formulario
// y mismas validaciones al publicar y al editar (CA-07.3)
function Formulario() {
  const { id } = useParams()
  const editando = Boolean(id)
  const navegar = useNavigate()

  const [comunas, setComunas] = useState(null)
  const [datos, setDatos] = useState(editando ? null : FORMULARIO_VACIO)
  const [fotos, setFotos] = useState([]) // al editar: las de la API; al publicar: archivos por subir
  const [errores, setErrores] = useState({})
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
  // Búsqueda del punto con la calle y el número: '' | 'buscando' | 'listo' | 'calle' | 'sin_resultado' | 'falta' | 'error'
  const [ubicando, setUbicando] = useState({ estado: '', texto: '' })
  const direccionTocada = useRef(false) // solo se busca sola si el oferente cambió la dirección
  const ultimaBusqueda = useRef(0) // descarta respuestas de búsquedas anteriores
  const [prohibido, setProhibido] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const { usuario, recargarUsuario } = useSesion()
  const { abrir: abrirCambioRol } = useCambioRol()
  const { state } = useLocation()
  const desdeBienvenida = Boolean(state?.desdeBienvenida)

  useEffect(() => {
    api('/catalogos/publicacion')
      .then(({ comunas: lista }) => setComunas(lista.map((c) => ({
        valor: c.id, texto: c.nombre, region: c.region, centro: [c.centro[1], c.centro[0]], // [lat, lng] para el mapa
      }))))
      .catch((err) => setMensaje({ tipo: 'alerta', texto: err.message }))
    if (!editando) return
    api(`/publicaciones/${id}`)
      .then((pub) => {
        // CA-07.4: aunque se entre con el enlace directo, solo el oferente ve el formulario
        if (!pub.es_propia) return setProhibido(true)
        setDatos(aFormulario(pub)) // CA-07.1: con los datos actuales
        setFotos(pub.fotos)
      })
      .catch((err) => setMensaje({ tipo: 'alerta', texto: err.message }))
  }, [id, editando])

  const marcarPunto = useCallback((punto) => {
    setDatos((actual) => ({ ...actual, 'ubicacion.punto': punto }))
    setErrores((actual) => Object.fromEntries(
      Object.entries(actual).filter(([clave]) => !clave.startsWith('ubicacion.punto')),
    ))
  }, [])

  // Marca el punto en el mapa con la calle, el número y la comuna; después se puede ajustar a mano
  const buscarDireccion = useCallback(async (direccion) => {
    const esta = ++ultimaBusqueda.current
    setUbicando({ estado: 'buscando', texto: '' })
    try {
      const punto = await ubicarDireccion(direccion)
      if (esta !== ultimaBusqueda.current) return
      if (punto) marcarPunto({ lat: punto.lat, lng: punto.lng })
      setUbicando({ estado: !punto ? 'sin_resultado' : punto.aproximado ? 'calle' : 'listo', texto: '' })
    } catch (err) {
      if (esta === ultimaBusqueda.current) setUbicando({ estado: 'error', texto: err.message })
    }
  }, [marcarPunto])

  // Con la comuna, la calle y el número escritos, la dirección se busca sola al dejar de escribir
  const calle = datos?.['ubicacion.calle'].trim() ?? ''
  const numero = datos?.['ubicacion.numero'].trim() ?? ''
  const comunaId = datos?.['ubicacion.comuna_id'] ?? ''
  useEffect(() => {
    const comuna = comunas?.find((c) => c.valor === comunaId)?.texto
    if (!direccionTocada.current || !comuna || !calle || !numero) return undefined
    const espera = setTimeout(() => buscarDireccion({ calle, numero, comuna }), 900)
    return () => clearTimeout(espera)
  }, [calle, numero, comunaId, comunas, buscarDireccion])

  // Publicar es del oferente (la API lo exige): a quien busca dónde vivir se le ofrece cambiar de rol
  if (!editando && usuario.modo !== 'oferente') {
    return (
      <main className="tarjeta pagina-form">
        <h1>Para publicar, cambia tu rol</h1>
        <p className="subtitulo">
          Hoy tu rol es «{NOMBRES_ROL[usuario.modo] ?? 'sin elegir'}». En RoomMatch cada estudiante busca
          dónde vivir u ofrece un espacio, no las dos cosas a la vez.
        </p>
        {usuario.con_convivencia ? (
          <p className="alerta">{SIN_CAMBIO_CON_CONVIVENCIA}.</p>
        ) : (
          <button type="button" className="boton" onClick={() => abrirCambioRol('oferente')}>
            Cambiar a «{NOMBRES_ROL.oferente}»
          </button>
        )}
        <Link to="/" className="boton secundario">Volver al inicio</Link>
      </main>
    )
  }
  if (prohibido) {
    return (
      <main className="tarjeta">
        <h1>No puedes editar esta publicación</h1>
        <p className="subtitulo">Solo quien publicó el alojamiento puede modificarlo.</p>
        <Link to="/" className="boton">Volver al inicio</Link>
      </main>
    )
  }
  if (!datos || !comunas) return <p className="cargando">{mensaje.texto || 'Cargando…'}</p>

  const cambiar = (e) => {
    const { name, value, type, checked } = e.target
    if (['ubicacion.calle', 'ubicacion.numero', 'ubicacion.comuna_id'].includes(name)) direccionTocada.current = true
    setDatos({ ...datos, [name]: type === 'checkbox' ? checked : value })
    // Se limpia el error del campo y el del grupo que lo contiene (por ejemplo «gastos.luz»)
    // Al cambiar la comuna también se limpia el del punto, que se revisa contra ella
    setErrores(Object.fromEntries(
      Object.entries(errores).filter(([clave]) => clave !== name && !name.startsWith(`${clave}.`)
        && !(name === 'ubicacion.comuna_id' && clave.startsWith('ubicacion.punto'))),
    ))
  }

  const comunaElegida = comunas.find((c) => c.valor === datos['ubicacion.comuna_id'])
  const ubicarAhora = () => {
    if (!comunaElegida || !calle || !numero) {
      setUbicando({ estado: 'falta', texto: '' })
      document.getElementById(!comunaElegida ? 'ubicacion.comuna_id' : !calle ? 'ubicacion.calle' : 'ubicacion.numero')?.focus()
      return
    }
    buscarDireccion({ calle, numero, comuna: comunaElegida.texto })
  }

  // Props comunes de cada campo: valor, cambio y su mensaje de error
  const campo = (nombre) => ({ nombre, value: datos[nombre], onChange: cambiar, error: errores[nombre] })

  // Al terminar se vuelve a «Mis publicaciones», que muestra el aviso arriba
  const avisar = (tipo, texto) => navegar('/mis-publicaciones', { state: { aviso: { tipo, texto } } })

  const enviar = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setMensaje({ tipo: '', texto: '' })
    try {
      const { publicacion } = await api(editando ? `/publicaciones/${id}` : '/publicaciones', {
        metodo: editando ? 'PUT' : 'POST',
        datos: aPayload(datos),
      })
      if (editando) {
        avisar('exito', `Se guardaron los cambios de «${publicacion.titulo}».`) // CA-07.2
        return
      }
      // Las fotos se suben una vez creada la publicación, porque quedan asociadas a ella
      const fallidas = []
      for (const { archivo } of fotos) {
        const formulario = new FormData()
        formulario.append('foto', archivo)
        await api(`/publicaciones/${publicacion.id}/fotos`, { metodo: 'POST', datos: formulario })
          .catch(() => fallidas.push(archivo.name))
      }
      if (fallidas.length) {
        avisar('alerta', `«${publicacion.titulo}» se publicó, pero no se pudieron subir estas fotos: `
          + `${fallidas.join(', ')}. Puedes agregarlas desde «Editar».`)
        return
      }
      avisar('exito', `Tu alojamiento «${publicacion.titulo}» ya está publicado.`)
    } catch (err) {
      if (!editando && err.estado === 409) {
        // El rol cambió (por ejemplo, en otra pestaña): con la sesión al día se ofrece cambiarlo
        await recargarUsuario()
        return
      }
      // CA-05.3: no se publica, se indica qué falta y lo escrito se conserva
      setErrores(err.errores ?? {})
      setMensaje({ tipo: 'alerta', texto: err.errores ? 'Revisa los campos marcados en rojo' : err.message })
      // Se lleva la vista al primer campo con error
      requestAnimationFrame(() => document.querySelector('.pf [aria-invalid="true"]')?.focus())
    } finally {
      setEnviando(false)
    }
  }

  const horarioAplica = datos['reglas.horario_silencio.aplica'] === 'si'
  // Para las opciones con forma de botón, que entregan solo el valor elegido
  const cambiarValor = (name, value) => cambiar({ target: { name, value, type: '' } })
  const opciones = (nombre) => ({ nombre, valor: datos[nombre], error: errores[nombre], alCambiar: (v) => cambiarValor(nombre, v) })

  // Lo obligatorio que falta en cada sección: el índice, el visto de cada una y la barra de publicar
  // (la API vuelve a validarlo)
  const contar = (lista) => lista.filter(Boolean).length
  const faltan = {
    1: contar([!datos.tipo, datos.titulo.trim().length < 5, !datos.descripcion.trim(), !datos.cupos_totales]),
    2: contar([
      !datos.costo_mensual,
      ...SERVICIOS.flatMap(({ clave }) => [
        !datos[`gastos.${clave}.incluido`],
        datos[`gastos.${clave}.incluido`] === 'no' && datos[`gastos.${clave}.monto_estimado`] === '',
      ]),
    ]),
    3: contar([!datos['ubicacion.comuna_id'], !datos['ubicacion.sector'].trim(), !calle, !numero]),
    4: contar([
      ...REGLAS.map(({ clave }) => !datos[`reglas.${clave}`]),
      !datos['reglas.horario_silencio.aplica'],
      horarioAplica && (!datos['reglas.horario_silencio.desde'] || !datos['reglas.horario_silencio.hasta']),
    ]),
  }
  const pendientes = Object.values(faltan).reduce((a, b) => a + b, 0)
  const conCaracteristicas = CARACTERISTICAS.filter(({ clave }) => datos[`caracteristicas.${clave}`]).length
  const PASOS = [
    { numero: 1, titulo: 'Lo básico' },
    { numero: 2, titulo: 'Precio y gastos' },
    { numero: 3, titulo: 'Ubicación' },
    { numero: 4, titulo: 'Reglas de la casa' },
    { numero: 5, titulo: 'Características', opcional: conCaracteristicas ? `${conCaracteristicas} marcadas` : 'Opcional' },
    { numero: 6, titulo: 'Fotos', opcional: fotos.length ? `${fotos.length} de 5` : 'Opcional' },
  ]
  const irA = (numero) => {
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById(`pf-paso-${numero}`)?.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'start' })
  }

  // Vista previa: la tarjeta como la verán los estudiantes en «Buscar alojamiento»
  const fotoVista = fotos.find((f) => f.es_principal) ?? fotos[0]
  const comunaVista = comunaElegida?.texto
  const caracteristicasVista = CARACTERISTICAS.filter(({ clave }) => datos[`caracteristicas.${clave}`])

  return (
    <main className="pf">
      <header className="pf-cabecera">
        <h1>{editando ? 'Editar publicación' : 'Publicar alojamiento'}</h1>
        <p>Mientras más clara sea la información, más fácil será encontrar a tu próximo roomie.</p>
        {/* Recién elegido el rol en «¿Qué te trae a RoomMatch?»: se puede dejar para más tarde */}
        {desdeBienvenida && (
          <p className="form-despues">
            ¿No tienes los datos a mano? <Link to="/" replace>Publicar después</Link>
          </p>
        )}
      </header>

      <div className="pf-cuerpo">
        <form id="pf-formulario" className="pf-formulario" onSubmit={enviar} noValidate>
          <Seccion numero={1} titulo="Lo básico" descripcion="Qué ofreces y a quién se lo ofreces." completa={!faltan[1]}>
            <div className="pf-fila">
              <OpcionesBoton etiqueta="Tipo de alojamiento" opciones={TIPOS} {...opciones('tipo')} />
              <OpcionesBoton etiqueta="¿A quién buscas?" opciones={GENEROS_PREFERIDOS} {...opciones('genero_preferido')} />
            </div>
            <Campo etiqueta="Título" {...campo('titulo')} maxLength={100} required
              placeholder="Por ejemplo: Habitación amoblada cerca de la UdeC"
              ayuda="Lo primero que leen en la búsqueda: menciona lo que la hace especial." />
            <Campo etiqueta="Descripción" {...campo('descripcion')} multilinea rows={5} required
              maxLength={MAX_DESCRIPCION} placeholder="Cómo es el espacio, qué incluye, cómo es la convivencia y qué hay cerca."
              ayuda={`${datos.descripcion.length}/${MAX_DESCRIPCION} caracteres`} />
            <div className="pf-fila">
              <Campo etiqueta="Cupos totales" {...campo('cupos_totales')} type="number" min={1} max={10} required
                ayuda="Cuántas personas pueden vivir en total." />
              <Campo etiqueta="Cupos disponibles" {...campo('cupos_disponibles')} type="number" min={0} max={10} required
                ayuda={editando ? 'Con 0 cupos la publicación deja de aparecer en las búsquedas.' : 'Cuántos cupos ofreces ahora.'} />
            </div>
          </Seccion>

          {/* CA-06.3: el arriendo y, por cada servicio, si está incluido o cuánto cuesta al mes */}
          <Seccion numero={2} titulo="Precio y gastos" completa={!faltan[2]}
            descripcion="Lo que se paga al mes: el arriendo y los servicios que no van incluidos.">
            <Campo etiqueta="Arriendo mensual (CLP)" {...campo('costo_mensual')} type="number"
              min={1} step={1000} inputMode="numeric" required placeholder="180000"
              ayuda={datos.costo_mensual ? `Se mostrará como ${formatearPesos(Number(datos.costo_mensual))} al mes.` : 'Sin puntos ni signo peso.'} />
            <div className="pf-servicios">
              {SERVICIOS.map(({ clave, texto }) => {
                const aparte = datos[`gastos.${clave}.incluido`] === 'no'
                return (
                  <div key={clave} className="pf-servicio" data-aparte={aparte || undefined}>
                    <OpcionesBoton etiqueta={<><span className="pf-icono">{ICONO_SERVICIO[clave]}</span>{texto}</>}
                      opciones={INCLUIDO} {...opciones(`gastos.${clave}.incluido`)}
                      error={errores[`gastos.${clave}.incluido`] ?? (aparte ? undefined : errores[`gastos.${clave}`])} />
                    {aparte && (
                      <Campo etiqueta={`¿Cuánto cuesta ${texto.toLowerCase()} al mes? (CLP)`}
                        {...campo(`gastos.${clave}.monto_estimado`)} type="number" min={0} step={500}
                        inputMode="numeric" required placeholder="15000"
                        error={errores[`gastos.${clave}.monto_estimado`] ?? errores[`gastos.${clave}`]} />
                    )}
                  </div>
                )
              })}
            </div>
          </Seccion>

          {/* CA-06.2: la dirección se muestra; el punto exacto del mapa, no (los demás ven una zona) */}
          <Seccion numero={3} titulo="Ubicación" completa={!faltan[3]} className="pf-seccion-ubicacion"
            descripcion="Con la calle y el número marcamos el alojamiento en el mapa. Los demás estudiantes ven la dirección y una zona aproximada, no el punto exacto.">
            <div className="pf-ubicacion">
              <div className="pf-ubicacion-campos">
                <div className="pf-fila">
                  <Campo etiqueta="Comuna" {...campo('ubicacion.comuna_id')} opciones={comunas} required />
                  {/* La región sale de la comuna: todas las de RoomMatch son de la misma región */}
                  <div className="campo pf-fijo">
                    <span className="pf-fijo-etiqueta">Región</span>
                    <p>{comunaElegida?.region ?? 'Según la comuna'}</p>
                  </div>
                </div>
                <Campo etiqueta="Barrio, villa o población" {...campo('ubicacion.sector')} maxLength={80} required
                  placeholder="Por ejemplo: Barrio Universitario"
                  ayuda="El nombre con que se conoce la zona dentro de la comuna." />
                <div className="pf-direccion">
                  <Campo etiqueta="Calle" {...campo('ubicacion.calle')} maxLength={100} required
                    placeholder="Por ejemplo: Avenida Collao" autoComplete="address-line1" />
                  <Campo etiqueta="Número" {...campo('ubicacion.numero')} maxLength={10} required placeholder="1202"
                    inputMode="numeric" />
                </div>
                <Campo etiqueta="Referencia (opcional)" {...campo('ubicacion.direccion_referencia')}
                  maxLength={150} placeholder="Por ejemplo: a dos cuadras del campus"
                  ayuda="Un lugar conocido cerca, para ubicarse más fácil." />
              </div>

              <div className="pf-ubicacion-mapa">
                <Suspense fallback={<div className="pf-mapa-cargando" aria-label="Cargando el mapa" />}>
                  <SelectorUbicacion centro={comunaElegida?.centro ?? null} punto={datos['ubicacion.punto']} onCambio={marcarPunto}
                    error={errores['ubicacion.punto'] ?? errores['ubicacion.punto.lat'] ?? errores['ubicacion.punto.lng']} />
                </Suspense>
                <div className="pf-ubicar" data-estado={ubicando.estado || undefined}>
                  <p role="status">
                    {ubicando.texto || TEXTO_UBICANDO[ubicando.estado]
                      || (datos['ubicacion.punto'] ? 'El punto ya está marcado. Puedes moverlo arrastrando el marcador.'
                        : 'Al escribir la calle y el número, el punto se marca solo.')}
                  </p>
                  <button type="button" className="pf-ubicar-boton" onClick={ubicarAhora} disabled={ubicando.estado === 'buscando'}>
                    <IconoUbicacion /> {datos['ubicacion.punto'] ? 'Volver a ubicar' : 'Ubicar en el mapa'}
                  </button>
                </div>
              </div>
            </div>
          </Seccion>

          {/* CA-06.4: opciones predefinidas más un texto libre de hasta 300 caracteres */}
          <Seccion numero={4} titulo="Reglas de la casa" completa={!faltan[4]}
            descripcion="Ayudan a encontrar a alguien con hábitos compatibles. También se usan para las propuestas de match.">
            <div className="pf-reglas">
              {REGLAS.map(({ clave, texto }) => (
                <OpcionesBoton key={clave} etiqueta={<><span className="pf-icono"><IconoHabito clave={HABITO_DE_REGLA[clave]} tamano={16} /></span>{texto}</>}
                  opciones={SI_NO} {...opciones(`reglas.${clave}`)} />
              ))}
              <OpcionesBoton etiqueta={<><span className="pf-icono"><IconoHabito clave="horario_sueno" tamano={16} /></span>¿Hay horario de silencio?</>}
                opciones={SI_NO} {...opciones('reglas.horario_silencio.aplica')} />
            </div>
            {horarioAplica && (
              <div className="pf-fila pf-horario">
                <Campo etiqueta="Desde" {...campo('reglas.horario_silencio.desde')} type="time" required
                  error={errores['reglas.horario_silencio']} />
                <Campo etiqueta="Hasta" {...campo('reglas.horario_silencio.hasta')} type="time" required />
              </div>
            )}
            <Campo etiqueta="Otras reglas (opcional)" {...campo('reglas.reglas_adicionales')} multilinea
              rows={3} maxLength={MAX_REGLAS} placeholder="Por ejemplo: turnos de aseo semanales para los espacios comunes."
              ayuda={`${datos['reglas.reglas_adicionales'].length}/${MAX_REGLAS} caracteres`} />
          </Seccion>

          <Seccion numero={5} titulo="Características" descripcion="Marca lo que tiene el alojamiento (opcional).">
            <div className="pf-chips">
              {CARACTERISTICAS.map(({ clave, texto }) => (
                <label key={clave} className="pf-chip">
                  <input type="checkbox" name={`caracteristicas.${clave}`}
                    checked={datos[`caracteristicas.${clave}`]} onChange={cambiar} />
                  <span>{ICONO_CARACTERISTICA[clave]}{texto}</span>
                </label>
              ))}
            </div>
          </Seccion>

          <Seccion numero={6} titulo="Fotos" descripcion="Las publicaciones con fotos reciben más mensajes. La primera es la que se ve en la búsqueda.">
            <FotosPublicacion publicacionId={id} fotos={fotos} onCambio={setFotos} />
          </Seccion>

          {/* Siempre a la vista al fondo de la pantalla, con lo que falta por responder */}
          <div className={`pf-barra${pendientes === 0 ? ' lista' : ''}`}>
            <p className={`pf-barra-texto ${mensaje.tipo}`} role={mensaje.tipo === 'alerta' ? 'alert' : 'status'}>
              {mensaje.texto || (pendientes > 0
                ? `Faltan ${pendientes} ${pendientes === 1 ? 'dato obligatorio' : 'datos obligatorios'}`
                : editando ? 'Listo para guardar' : 'Listo para publicar')}
            </p>
            <div className="pf-barra-acciones">
              <Link to="/mis-publicaciones" className="boton secundario pf-boton">Cancelar</Link>
              <button type="submit" className="boton pf-boton" disabled={enviando}>
                {enviando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Publicar'}
              </button>
            </div>
          </div>
        </form>

        {/* A la derecha: el avance por sección (lleva a cada una) y la tarjeta como la verán */}
        <aside className="pf-lateral" aria-label="Avance y vista previa">
          <nav className="pf-indice" aria-label="Secciones del formulario">
            <p className="pf-indice-titulo">
              Tu publicación
              <span>{pendientes === 0 ? 'Completa' : `${pendientes} por completar`}</span>
            </p>
            <ol>
              {PASOS.map(({ numero: n, titulo, opcional }) => {
                const completa = !opcional && !faltan[n]
                return (
                  <li key={n}>
                    <button type="button" onClick={() => irA(n)} data-completa={completa || undefined}>
                      <span className="pf-indice-numero" aria-hidden="true">{completa ? <IconoCheck /> : n}</span>
                      <span className="pf-indice-nombre">{titulo}</span>
                      <span className="pf-indice-estado">
                        {opcional ?? (completa ? 'Listo' : `Faltan ${faltan[n]}`)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </nav>

          <div className="pf-vista">
            <p className="pf-vista-rotulo">Así la verán los estudiantes</p>
            <div className="pf-vista-tarjeta" aria-hidden="true">
              <div className="pf-vista-foto">
                {fotoVista ? <img src={fotoVista.url ?? fotoVista.vista} alt="" /> : <SinFoto />}
                {datos.tipo && <span className="pf-vista-tipo">{textoDe(TIPOS, datos.tipo)}</span>}
              </div>
              <div className="pf-vista-cuerpo">
                <p className="pf-vista-precio">
                  {datos.costo_mensual ? formatearPesos(Number(datos.costo_mensual)) : '$ —'}<span> / mes</span>
                </p>
                <p className={`pf-vista-titulo${datos.titulo ? '' : ' vacio'}`}>{datos.titulo || 'El título de tu publicación'}</p>
                <p className="pf-vista-lugar">
                  <IconoUbicacion />
                  {[comunaVista, datos['ubicacion.sector']].filter(Boolean).join(', ') || 'Comuna y barrio'}
                </p>
                <ul className="pf-vista-datos">
                  <li><IconoPersona />{datos.cupos_disponibles || 0} {datos.cupos_disponibles === '1' ? 'cupo' : 'cupos'}</li>
                  {caracteristicasVista.map(({ clave, texto }) => <li key={clave}>{ICONO_CARACTERISTICA[clave]}{texto}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}

// Sin cuenta verificada no se publica (acceso limitado); editar una publicación propia sí se permite
export default function FormPublicacion() {
  const { id } = useParams()
  const { usuario } = useSesion()
  if (!id && !estaVerificado(usuario)) {
    return (
      <main className="aviso-pagina">
        <h1>Publicar alojamiento</h1>
        <AvisoVerificacion detalle="Podrás publicar cuando tu cuenta esté verificada." />
      </main>
    )
  }
  return <Formulario />
}
