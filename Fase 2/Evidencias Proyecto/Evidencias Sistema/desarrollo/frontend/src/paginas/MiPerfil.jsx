import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import Campo from '../componentes/Campo.jsx'
import { useFondoCiudad } from '../fondo.js'
import { describirFaltantes, GENEROS } from '../perfil.js'
import { useSesion } from '../sesion/SesionContext.jsx'

const MAX_DESCRIPCION = 300
const ANIO_ACTUAL = new Date().getFullYear()

// Campos editables; la API devuelve null en los que aún no se completan
const CAMPOS = [
  'nombre', 'ap_paterno', 'ap_materno', 'fecha_nac', 'genero', 'correo', 'telefono',
  'institucion_id', 'sede', 'carrera', 'anio_ingreso',
  'direccion', 'ciudad_origen', 'region_origen', 'descripcion',
]

const aFormulario = (perfil) =>
  Object.fromEntries(CAMPOS.map((campo) => [campo, perfil[campo] == null ? '' : String(perfil[campo])]))

// HU-03 (completar perfil) y HU-04 (editar perfil)
export default function MiPerfil() {
  const { recargarUsuario } = useSesion()
  const [perfil, setPerfil] = useState(null)
  const [catalogo, setCatalogo] = useState(null)
  const [datos, setDatos] = useState(null)
  const [errores, setErrores] = useState({})
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
  const [enviando, setEnviando] = useState(false)

  useFondoCiudad()

  useEffect(() => {
    Promise.all([api('/perfil'), api('/catalogos/perfil')])
      .then(([perfilApi, catalogoApi]) => {
        setPerfil(perfilApi)
        setDatos(aFormulario(perfilApi))
        setCatalogo(catalogoApi)
      })
      .catch((err) => setMensaje({ tipo: 'alerta', texto: err.message }))
  }, [])

  if (!datos || !catalogo) {
    return <p className="cargando">{mensaje.texto || 'Cargando tu perfil…'}</p>
  }

  const institucion = catalogo.instituciones.find((i) => i.id === datos.institucion_id)
  const sedes = institucion?.sedes ?? []

  const cambiar = (e) => {
    const { name, value } = e.target
    const nuevos = { ...datos, [name]: value }
    if (name === 'institucion_id') {
      // Al cambiar de institución la sede anterior deja de servir; si hay una sola, se elige sola
      const elegida = catalogo.instituciones.find((i) => i.id === value)
      nuevos.sede = elegida?.sedes.length === 1 ? elegida.sedes[0] : ''
    }
    setDatos(nuevos)
    setErrores({ ...errores, [name]: undefined, ...(name === 'institucion_id' && { sede: undefined }) })
  }

  const enviar = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setMensaje({ tipo: '', texto: '' })
    try {
      const respuesta = await api('/perfil', {
        metodo: 'PUT',
        datos: {
          ...datos,
          anio_ingreso: datos.anio_ingreso === '' ? null : Number(datos.anio_ingreso),
          descripcion: datos.descripcion || null,
        },
      })
      setPerfil(respuesta.perfil)
      setDatos(aFormulario(respuesta.perfil))
      setErrores({})
      setMensaje({ tipo: 'exito', texto: 'Tu perfil se guardó correctamente.' }) // CA-03.2 y CA-04.1
      await recargarUsuario()
    } catch (err) {
      // CA-03.3 y CA-04.2: no se guarda nada y se marcan los campos a corregir
      setErrores(err.errores ?? {})
      setMensaje({ tipo: 'alerta', texto: err.errores ? 'Revisa los campos marcados' : err.message })
    } finally {
      setEnviando(false)
    }
  }

  const opcionesInstitucion = catalogo.instituciones.map((i) => ({
    valor: i.id,
    texto: `${i.nombre} (${i.sigla})`,
  }))
  const opcionesSede = sedes.map((sede) => ({ valor: sede, texto: sede }))
  const opcionesRegion = catalogo.regiones.map((region) => ({ valor: region, texto: region }))

  return (
    <main className="tarjeta pagina-perfil">
      <h1>Mi perfil</h1>
      <p className="subtitulo">
        {perfil.rut ? `RUT ${perfil.rut}` : 'Mantén tus datos al día para encontrar roomies compatibles'}
      </p>

      {!perfil.perfil_completo && (
        <p className="alerta">
          Para completar tu perfil falta: {describirFaltantes(perfil.campos_faltantes)}.
        </p>
      )}

      <form onSubmit={enviar} noValidate>
        <fieldset>
          <legend>Datos personales</legend>
          <div className="fila">
            <Campo etiqueta="Nombre" nombre="nombre" value={datos.nombre} onChange={cambiar}
              error={errores.nombre} autoComplete="given-name" maxLength={60} required />
            <Campo etiqueta="Correo" nombre="correo" type="email" value={datos.correo}
              onChange={cambiar} error={errores.correo} autoComplete="email" required />
          </div>
          <div className="fila">
            <Campo etiqueta="Apellido paterno" nombre="ap_paterno" value={datos.ap_paterno}
              onChange={cambiar} error={errores.ap_paterno} autoComplete="family-name"
              maxLength={60} required />
            <Campo etiqueta="Apellido materno" nombre="ap_materno" value={datos.ap_materno}
              onChange={cambiar} error={errores.ap_materno} maxLength={60} required />
          </div>
          <div className="fila">
            <Campo etiqueta="Fecha de nacimiento" nombre="fecha_nac" type="date" value={datos.fecha_nac}
              onChange={cambiar} error={errores.fecha_nac} autoComplete="bday" required />
            <Campo etiqueta="Género" nombre="genero" value={datos.genero} onChange={cambiar}
              error={errores.genero} opciones={GENEROS} required />
          </div>
          <Campo etiqueta="Teléfono" nombre="telefono" type="tel" value={datos.telefono}
            onChange={cambiar} error={errores.telefono} placeholder="9 1234 5678"
            autoComplete="tel" required />
        </fieldset>

        <fieldset>
          <legend>Datos de estudiante</legend>
          <Campo etiqueta="Institución" nombre="institucion_id" value={datos.institucion_id}
            onChange={cambiar} error={errores.institucion_id} opciones={opcionesInstitucion} required />
          <div className="fila">
            <Campo etiqueta="Sede" nombre="sede" value={datos.sede} onChange={cambiar}
              error={errores.sede} opciones={opcionesSede} disabled={!institucion} required />
            <Campo etiqueta="Año de ingreso (opcional)" nombre="anio_ingreso" type="number"
              value={datos.anio_ingreso} onChange={cambiar} error={errores.anio_ingreso}
              min={1980} max={ANIO_ACTUAL} />
          </div>
          <Campo etiqueta="Carrera" nombre="carrera" value={datos.carrera} onChange={cambiar}
            error={errores.carrera} maxLength={100} required />
        </fieldset>

        <fieldset>
          <legend>Origen y residencia</legend>
          <div className="fila">
            <Campo etiqueta="Ciudad de origen" nombre="ciudad_origen" value={datos.ciudad_origen}
              onChange={cambiar} error={errores.ciudad_origen} maxLength={80} required />
            <Campo etiqueta="Región de origen" nombre="region_origen" value={datos.region_origen}
              onChange={cambiar} error={errores.region_origen} opciones={opcionesRegion} required />
          </div>
          <Campo etiqueta="Dirección en la ciudad donde estudias" nombre="direccion"
            value={datos.direccion} onChange={cambiar} error={errores.direccion} maxLength={150}
            autoComplete="street-address" required
            ayuda="Si aún no tienes alojamiento, indica dónde te estás quedando." />
        </fieldset>

        <fieldset>
          <legend>Sobre ti</legend>
          <Campo etiqueta="Descripción breve (opcional)" nombre="descripcion" multilinea rows={4}
            value={datos.descripcion} onChange={cambiar} error={errores.descripcion}
            maxLength={MAX_DESCRIPCION}
            ayuda={`${datos.descripcion.length}/${MAX_DESCRIPCION} caracteres`} />
        </fieldset>

        {mensaje.texto && (
          <p className={mensaje.tipo} role={mensaje.tipo === 'alerta' ? 'alert' : 'status'}>
            {mensaje.texto}
          </p>
        )}

        <div className="acciones">
          <Link to="/" className="boton secundario">Volver</Link>
          <button type="submit" className="boton" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </main>
  )
}
