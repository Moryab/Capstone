import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api.js'
import { NOMBRES_ROL, SIN_CAMBIO_CON_CONVIVENCIA, useCambioRol } from '../rol/CambioRol.jsx'
import { useSesion } from '../sesion/SesionContext.jsx'
import Campo from '../componentes/Campo.jsx'
import FotosPublicacion from '../componentes/FotosPublicacion.jsx'
import {
  aFormulario, aPayload, CARACTERISTICAS, FORMULARIO_VACIO, GENEROS_PREFERIDOS, REGLAS, SERVICIOS,
  SI_NO, TIPOS,
} from '../publicaciones.js'

const MAX_DESCRIPCION = 1000
const MAX_REGLAS = 300

const INCLUIDO = [
  { valor: 'si', texto: 'Incluido en el arriendo' },
  { valor: 'no', texto: 'No incluido' },
]

// HU-05 y HU-06 (/publicaciones/nueva) y HU-07 (/publicaciones/:id/editar): mismo formulario
// y mismas validaciones al publicar y al editar (CA-07.3)
export default function FormPublicacion() {
  const { id } = useParams()
  const editando = Boolean(id)
  const navegar = useNavigate()

  const [comunas, setComunas] = useState(null)
  const [datos, setDatos] = useState(editando ? null : FORMULARIO_VACIO)
  const [fotos, setFotos] = useState([]) // al editar: las de la API; al publicar: archivos por subir
  const [errores, setErrores] = useState({})
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
  const [prohibido, setProhibido] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const { usuario, recargarUsuario } = useSesion()
  const { abrir: abrirCambioRol } = useCambioRol()
  const { state } = useLocation()
  const desdeBienvenida = Boolean(state?.desdeBienvenida)

  useEffect(() => {
    api('/catalogos/publicacion')
      .then(({ comunas: lista }) => setComunas(lista.map((c) => ({ valor: c.id, texto: c.nombre }))))
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
    setDatos({ ...datos, [name]: type === 'checkbox' ? checked : value })
    // Se limpia el error del campo y el del grupo que lo contiene (por ejemplo «gastos.luz»)
    setErrores(Object.fromEntries(
      Object.entries(errores).filter(([clave]) => clave !== name && !name.startsWith(`${clave}.`)),
    ))
  }

  // Props comunes de cada campo: valor, cambio y su mensaje de error
  const campo = (nombre) => ({ nombre, value: datos[nombre], onChange: cambiar, error: errores[nombre] })

  // Al terminar se vuelve al perfil, que muestra el aviso en la sección «Mis publicaciones»
  const avisar = (tipo, texto) => navegar('/perfil', { state: { aviso: { tipo, texto } } })

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
      setMensaje({ tipo: 'alerta', texto: err.errores ? 'Revisa los campos marcados' : err.message })
    } finally {
      setEnviando(false)
    }
  }

  const horarioAplica = datos['reglas.horario_silencio.aplica'] === 'si'

  return (
    <main className="tarjeta pagina-form">
      <h1>{editando ? 'Editar publicación' : 'Publicar alojamiento'}</h1>
      <p className="subtitulo">
        Mientras más clara sea la información, más fácil será encontrar a tu próximo roomie.
      </p>
      {/* Recién elegido el rol en «¿Qué te trae a RoomMatch?»: se puede dejar para más tarde */}
      {desdeBienvenida && (
        <p className="form-despues">
          ¿No tienes los datos a mano? <Link to="/" replace>Publicar después</Link>
        </p>
      )}

      <form onSubmit={enviar} noValidate>
        <fieldset>
          <legend>Datos básicos</legend>
          <div className="fila">
            <Campo etiqueta="Tipo de alojamiento" {...campo('tipo')} opciones={TIPOS} required />
            <Campo etiqueta="¿A quién buscas?" {...campo('genero_preferido')}
              opciones={GENEROS_PREFERIDOS} />
          </div>
          <Campo etiqueta="Título" {...campo('titulo')} maxLength={100} required
            placeholder="Por ejemplo: Habitación amoblada cerca de la UdeC" />
          <Campo etiqueta="Descripción" {...campo('descripcion')} multilinea rows={5} required
            maxLength={MAX_DESCRIPCION}
            ayuda={`${datos.descripcion.length}/${MAX_DESCRIPCION} caracteres`} />
          <div className="fila">
            <Campo etiqueta="Cupos totales" {...campo('cupos_totales')} type="number" min={1} max={10}
              required />
            <Campo etiqueta="Cupos disponibles" {...campo('cupos_disponibles')} type="number" min={0}
              max={10} required
              ayuda={editando ? 'Con 0 cupos la publicación deja de aparecer en las búsquedas.' : undefined} />
          </div>
        </fieldset>

        <fieldset>
          <legend>Costo y ubicación</legend>
          <Campo etiqueta="Costo mensual del arriendo (CLP)" {...campo('costo_mensual')} type="number"
            min={1} step={1000} inputMode="numeric" required placeholder="180000" />
          <div className="fila">
            <Campo etiqueta="Comuna" {...campo('ubicacion.comuna_id')} opciones={comunas} required />
            <Campo etiqueta="Sector o barrio" {...campo('ubicacion.sector')} maxLength={80} required
              placeholder="Por ejemplo: Barrio Universitario" />
          </div>
          <Campo etiqueta="Dirección de referencia (opcional)" {...campo('ubicacion.direccion_referencia')}
            maxLength={150} placeholder="Por ejemplo: a dos cuadras del Campus"
            ayuda="No es necesario poner la dirección exacta." />
        </fieldset>

        {/* CA-06.3: por cada servicio, si está incluido o cuánto cuesta al mes */}
        <fieldset>
          <legend>Gastos mensuales</legend>
          {SERVICIOS.map(({ clave, texto }) => {
            const incluido = datos[`gastos.${clave}.incluido`]
            return (
              <div key={clave} className="fila">
                <Campo etiqueta={texto} {...campo(`gastos.${clave}.incluido`)} opciones={INCLUIDO} required />
                {incluido === 'no' && (
                  <Campo etiqueta={`Monto estimado de ${texto.toLowerCase()} (CLP)`}
                    {...campo(`gastos.${clave}.monto_estimado`)} type="number" min={0} step={500}
                    inputMode="numeric" required
                    error={errores[`gastos.${clave}.monto_estimado`] ?? errores[`gastos.${clave}`]} />
                )}
              </div>
            )
          })}
        </fieldset>

        {/* CA-06.4: opciones predefinidas más un texto libre de hasta 300 caracteres */}
        <fieldset>
          <legend>Reglas de la casa</legend>
          <div className="fila fila-3">
            {REGLAS.map(({ clave, texto }) => (
              <Campo key={clave} etiqueta={texto} {...campo(`reglas.${clave}`)} opciones={SI_NO} required />
            ))}
          </div>
          <div className="fila fila-3">
            <Campo etiqueta="¿Hay horario de silencio?" {...campo('reglas.horario_silencio.aplica')}
              opciones={SI_NO} required />
            {horarioAplica && (
              <>
                <Campo etiqueta="Desde" {...campo('reglas.horario_silencio.desde')} type="time" required
                  error={errores['reglas.horario_silencio']} />
                <Campo etiqueta="Hasta" {...campo('reglas.horario_silencio.hasta')} type="time" required />
              </>
            )}
          </div>
          <Campo etiqueta="Otras reglas (opcional)" {...campo('reglas.reglas_adicionales')} multilinea
            rows={3} maxLength={MAX_REGLAS}
            ayuda={`${datos['reglas.reglas_adicionales'].length}/${MAX_REGLAS} caracteres`} />
        </fieldset>

        <fieldset>
          <legend>Características (opcional)</legend>
          <div className="casillas">
            {CARACTERISTICAS.map(({ clave, texto }) => (
              <label key={clave} className="casilla">
                <input type="checkbox" name={`caracteristicas.${clave}`}
                  checked={datos[`caracteristicas.${clave}`]} onChange={cambiar} />
                {texto}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Fotos (opcional)</legend>
          <FotosPublicacion publicacionId={id} fotos={fotos} onCambio={setFotos} />
        </fieldset>

        {mensaje.texto && (
          <p className={mensaje.tipo} role={mensaje.tipo === 'alerta' ? 'alert' : 'status'}>{mensaje.texto}</p>
        )}

        <div className="acciones">
          <Link to="/perfil" className="boton secundario">Cancelar</Link>
          <button type="submit" className="boton" disabled={enviando}>
            {enviando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Publicar'}
          </button>
        </div>
      </form>
    </main>
  )
}
