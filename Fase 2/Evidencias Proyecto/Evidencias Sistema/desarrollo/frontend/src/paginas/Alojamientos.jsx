import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import Campo from '../componentes/Campo.jsx'
import { IconoLupa, IconoUbicacion } from '../componentes/Iconos.jsx'
import {
  aPreferencias, aURL, desdePreferencias, desdeURL, EXTRAS_FILTRO, FILTROS_VACIOS, hayFiltros,
  OPCIONES_REGLA, REGLAS_FILTRO, sinPreferencias, soloCosto, validarCosto, ZONAS,
} from '../busqueda.js'
import { formatearPesos, GENEROS_PREFERIDOS, textoDe, TIPOS } from '../publicaciones.js'

const TIPOS_FILTRO = [{ valor: '', texto: 'Habitación o departamento' }, ...TIPOS]

// Lista desplegable con una opción «da lo mismo» con valor vacío (Campo la deja deshabilitada)
function Selector({ etiqueta, nombre, value, onChange, opciones }) {
  return (
    <div className="campo">
      <label htmlFor={nombre}>{etiqueta}</label>
      <select id={nombre} name={nombre} value={value} onChange={onChange}>
        {opciones.map(({ valor, texto }) => <option key={valor} value={valor}>{texto}</option>)}
      </select>
    </div>
  )
}

// Tarjeta del listado (CA-09.2): foto principal, título, tipo, costo y comuna
function TarjetaAlojamiento({ pub, desde }) {
  const principal = pub.fotos.find((f) => f.es_principal)
  return (
    <li className="alojamiento">
      <div className="alojamiento-foto">
        {principal ? <img src={principal.url} alt="" loading="lazy" /> : <span>Sin fotos</span>}
      </div>
      <div className="alojamiento-info">
        <p className="publicacion-meta">{textoDe(TIPOS, pub.tipo)}</p>
        {/* El enlace cubre toda la tarjeta; `desde` permite volver al listado con los filtros */}
        <h2><Link to={`/alojamientos/${pub.id}`} state={{ desde }} className="alojamiento-enlace">{pub.titulo}</Link></h2>
        <p className="publicacion-meta"><IconoUbicacion /> {pub.ubicacion.comuna_nombre}, {pub.ubicacion.sector}</p>
        <p className="publicacion-precio">{formatearPesos(pub.costo_mensual)} <span>/ mes</span></p>
        <ul className="alojamiento-etiquetas">
          <li>{pub.cupos_disponibles} {pub.cupos_disponibles === 1 ? 'cupo' : 'cupos'}</li>
          {pub.gastos.todos_incluidos && <li>Gastos incluidos</li>}
          {pub.genero_preferido !== 'indiferente' && <li>{textoDe(GENEROS_PREFERIDOS, pub.genero_preferido)}</li>}
          {pub.es_propia && <li className="propia">Tu publicación</li>}
        </ul>
      </div>
    </li>
  )
}

// HU-09 a HU-12: «Alojamientos», el listado de publicaciones activas con sus filtros
export default function Alojamientos() {
  const [params, setParams] = useSearchParams()
  const { pathname, search } = useLocation()
  const clave = params.toString()

  const [opciones, setOpciones] = useState(null) // comunas con publicaciones e institución del perfil
  const [borrador, setBorrador] = useState(() => desdeURL(params))
  const [claveBorrador, setClaveBorrador] = useState(clave)
  const [errores, setErrores] = useState({})
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
  const [resultado, setResultado] = useState({ clave: null, datos: null, error: '' })
  const [ocupado, setOcupado] = useState(false)
  const listado = useRef(null)

  // Si la dirección cambia (atrás/adelante del navegador), el panel muestra los filtros aplicados
  if (claveBorrador !== clave) {
    setClaveBorrador(clave)
    setBorrador(desdeURL(params))
  }

  useEffect(() => {
    api('/publicaciones/filtros')
      .then(setOpciones)
      .catch((err) => setMensaje({ tipo: 'alerta', texto: err.message }))
  }, [])

  useEffect(() => {
    let vigente = true // evita mostrar una respuesta vieja si se cambia de filtros rápido
    api(`/publicaciones?${clave}`)
      .then((datos) => vigente && setResultado({ clave, datos, error: '' }))
      .catch((err) => {
        if (!vigente) return
        setResultado({ clave, datos: null, error: err.message })
        if (err.errores) setErrores(err.errores)
      })
    return () => {
      vigente = false
    }
  }, [clave])

  const cambiar = (e) => {
    const { name, value, type, checked } = e.target
    const nuevo = { ...borrador, [name]: type === 'checkbox' ? checked : value }
    // «Cerca de mi institución» reemplaza la lista de comunas, que se oculta
    if (name === 'cerca_institucion' && checked) nuevo.comunas = []
    setBorrador(nuevo)
    setErrores({ ...errores, [name]: undefined })
  }

  const alternarComunas = (ids, marcar) => {
    const resto = borrador.comunas.filter((id) => !ids.includes(id))
    setBorrador({ ...borrador, comunas: marcar ? [...resto, ...ids] : resto })
  }

  const ir = (nuevos) => {
    setParams(nuevos)
    listado.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  const aplicar = (e) => {
    e.preventDefault()
    setMensaje({ tipo: '', texto: '' })
    const encontrados = validarCosto(borrador)
    setErrores(encontrados)
    if (Object.keys(encontrados).length) return // CA-10.3: el filtro no se aplica
    ir(aURL(borrador))
  }

  // CA-10.5: vuelve el listado completo
  const limpiar = () => {
    setBorrador(FILTROS_VACIOS)
    setErrores({})
    setMensaje({ tipo: '', texto: '' })
    ir({})
  }

  const usarPreferencias = async () => {
    setOcupado(true)
    setMensaje({ tipo: '', texto: '' })
    try {
      const preferencias = await api('/perfil/preferencias-busqueda')
      if (sinPreferencias(preferencias)) {
        setMensaje({
          tipo: 'alerta',
          texto: 'Aún no guardas preferencias. Elige tus filtros y presiona «Guardar como mis preferencias».',
        })
        return
      }
      // CA-12.2: se completan los filtros, pero se busca recién al presionar «Aplicar filtros»
      const disponibles = new Set(opciones?.comunas.map((c) => c.id))
      const filtros = desdePreferencias(preferencias)
      setBorrador({ ...filtros, comunas: filtros.comunas.filter((id) => disponibles.has(id)) })
      setErrores({})
      setMensaje({ tipo: 'exito', texto: 'Cargamos tus preferencias. Ajústalas si quieres y presiona «Aplicar filtros».' })
    } catch (err) {
      setMensaje({ tipo: 'alerta', texto: err.message })
    } finally {
      setOcupado(false)
    }
  }

  const guardarPreferencias = async () => {
    const encontrados = validarCosto(borrador)
    setErrores(encontrados)
    if (Object.keys(encontrados).length) return
    setOcupado(true)
    try {
      await api('/perfil/preferencias-busqueda', { metodo: 'PUT', datos: aPreferencias(borrador) })
      setMensaje({ tipo: 'exito', texto: 'Guardamos estos filtros como tus preferencias.' })
    } catch (err) {
      setErrores(err.errores ?? {})
      setMensaje({ tipo: 'alerta', texto: err.message })
    } finally {
      setOcupado(false)
    }
  }

  const cargando = resultado.clave !== clave
  const { datos } = resultado
  const conFiltros = hayFiltros(params)
  const institucion = opciones?.institucion
  const zonas = ZONAS.map((zona) => ({
    ...zona,
    comunas: opciones?.comunas.filter((c) => c.sector === zona.valor) ?? [],
  })).filter((zona) => zona.comunas.length)

  return (
    <main className="pagina-alojamientos">
      <div className="encabezado-pagina">
        <div>
          <h1>Alojamientos</h1>
          <p className="subtitulo">Habitaciones y departamentos publicados por otros estudiantes.</p>
        </div>
      </div>

      <div className="alojamientos-cuerpo">
        <form className="filtros" onSubmit={aplicar} noValidate aria-labelledby="titulo-filtros">
          <h2 id="titulo-filtros"><IconoLupa /> Filtros</h2>

          <button type="button" className="boton secundario filtros-preferencias" onClick={usarPreferencias}
            disabled={ocupado}>
            Usar mis preferencias
          </button>

          {/* HU-10 */}
          <fieldset>
            <legend>Costo mensual (CLP)</legend>
            <div className="fila">
              <Campo etiqueta="Mínimo" nombre="costo_min" value={borrador.costo_min} onChange={cambiar}
                error={errores.costo_min} inputMode="numeric" placeholder="0" />
              <Campo etiqueta="Máximo" nombre="costo_max" value={borrador.costo_max} onChange={cambiar}
                error={errores.costo_max} inputMode="numeric" placeholder="Sin tope" />
            </div>
          </fieldset>

          {/* HU-11. CA-11.2: solo comunas que tienen publicaciones activas */}
          <fieldset>
            <legend>Ubicación</legend>
            <label className="casilla">
              <input type="checkbox" name="cerca_institucion" checked={borrador.cerca_institucion}
                onChange={cambiar} disabled={!institucion} />
              Cerca de mi institución{institucion && ` (${institucion.sigla})`}
            </label>
            {errores.cerca_institucion && <p className="campo-error">{errores.cerca_institucion}</p>}
            {opciones && !institucion && (
              <p className="campo-ayuda">
                <Link to="/perfil/editar">Indica tu institución en tu perfil</Link> para usar esta opción.
              </p>
            )}
            {borrador.cerca_institucion && (
              <p className="campo-ayuda">Se muestran las comunas cercanas a tu sede.</p>
            )}

            {!borrador.cerca_institucion && zonas.map((zona) => {
              const ids = zona.comunas.map((c) => c.id)
              const todas = ids.every((id) => borrador.comunas.includes(id))
              return (
                <div key={zona.valor} className="filtro-zona">
                  <label className="casilla zona">
                    <input type="checkbox" checked={todas} onChange={(e) => alternarComunas(ids, e.target.checked)} />
                    {zona.texto}
                  </label>
                  <div className="casillas">
                    {zona.comunas.map((c) => (
                      <label key={c.id} className="casilla">
                        <input type="checkbox" checked={borrador.comunas.includes(c.id)}
                          onChange={(e) => alternarComunas([c.id], e.target.checked)} />
                        {c.nombre} <span className="cantidad">({c.cantidad})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
            {errores.comunas && <p className="campo-error">{errores.comunas}</p>}
          </fieldset>

          {/* HU-12 */}
          <fieldset>
            <legend>Preferencias</legend>
            <Selector etiqueta="Tipo de alojamiento" nombre="tipo_alojamiento" value={borrador.tipo_alojamiento}
              onChange={cambiar} opciones={TIPOS_FILTRO} />
            {REGLAS_FILTRO.map(({ clave: regla, texto }) => (
              <Selector key={regla} etiqueta={texto} nombre={regla} value={borrador[regla]} onChange={cambiar}
                opciones={OPCIONES_REGLA} />
            ))}
            <div className="casillas">
              {EXTRAS_FILTRO.map(({ clave: extra, texto }) => (
                <label key={extra} className="casilla">
                  <input type="checkbox" name={extra} checked={borrador[extra]} onChange={cambiar} />
                  {texto}
                </label>
              ))}
            </div>
          </fieldset>

          {mensaje.texto && (
            <p className={mensaje.tipo} role={mensaje.tipo === 'alerta' ? 'alert' : 'status'}>{mensaje.texto}</p>
          )}

          <div className="filtros-acciones">
            <button type="submit" className="boton">Aplicar filtros</button>
            <button type="button" className="boton secundario" onClick={limpiar}>Limpiar filtros</button>
            <button type="button" className="enlace-boton" onClick={guardarPreferencias} disabled={ocupado}>
              Guardar como mis preferencias
            </button>
          </div>
        </form>

        <section ref={listado} className="alojamientos-resultados" aria-labelledby="titulo-resultados"
          aria-busy={cargando}>
          <h2 id="titulo-resultados" className="visualmente-oculto">Resultados</h2>

          {resultado.error && !cargando && <p className="alerta" role="alert">{resultado.error}</p>}
          {!datos && !resultado.error && <p className="cargando">Cargando alojamientos…</p>}

          {datos && (
            <>
              <p className="alojamientos-total" role="status">
                {datos.total === 1 ? '1 alojamiento' : `${datos.total} alojamientos`}
                {conFiltros && ' con los filtros aplicados'}
              </p>

              {datos.total === 0 && (
                <div className="alojamientos-vacio">
                  {!conFiltros ? (
                    <h3>No hay alojamientos disponibles por ahora</h3> // CA-09.4
                  ) : soloCosto(params) ? (
                    <>
                      <h3>No encontramos alojamientos en ese rango</h3>
                      <p>Prueba ampliando el rango de precios.</p>{/* CA-10.4 */}
                    </>
                  ) : (
                    <>
                      <h3>No encontramos alojamientos con esos filtros</h3>
                      <p>Prueba quitando alguno de los filtros.</p>{/* CA-11.5 y CA-12.4 */}
                    </>
                  )}
                  {conFiltros && (
                    <button type="button" className="boton secundario" onClick={limpiar}>Limpiar filtros</button>
                  )}
                </div>
              )}

              <ul className={`alojamientos-lista${cargando ? ' actualizando' : ''}`}>
                {datos.resultados.map((pub) => (
                  <TarjetaAlojamiento key={pub.id} pub={pub} desde={pathname + search} />
                ))}
              </ul>

              {datos.paginas > 1 && (
                <nav className="paginacion" aria-label="Páginas de resultados">
                  <button type="button" className="boton secundario" disabled={datos.pagina <= 1}
                    onClick={() => ir(aURL(desdeURL(params), datos.pagina - 1))}>
                    Anterior
                  </button>
                  <span>Página {datos.pagina} de {datos.paginas}</span>
                  <button type="button" className="boton secundario" disabled={datos.pagina >= datos.paginas}
                    onClick={() => ir(aURL(desdeURL(params), datos.pagina + 1))}>
                    Siguiente
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  )
}
