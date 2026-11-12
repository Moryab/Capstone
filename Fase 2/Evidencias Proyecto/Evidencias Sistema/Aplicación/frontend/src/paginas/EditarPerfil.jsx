import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import Avatar from '../componentes/Avatar.jsx'
import Campo from '../componentes/Campo.jsx'
import SelectorCarrera from '../componentes/SelectorCarrera.jsx'
import SelectorComuna, { cambiosDeRegion } from '../componentes/SelectorComuna.jsx'
import FechaNacimiento, { OpcionesBoton } from '../componentes/FechaNacimiento.jsx'
import { IconoUbicacion } from '../componentes/Iconos.jsx'
import { IconoSede } from '../componentes/IconosAlojamiento.jsx'
import { IconoMensajes, IconoUsuario } from '../inicio/iconos.jsx'
import { mayusculaInicial } from '../inicio/utilidades.js'
import { IconoTelefono } from '../perfil/iconos.jsx'
import { CargandoPerfil } from './LayoutPerfil.jsx'
import {
  ANIO_INGRESO_MAX, ANIO_INGRESO_MIN, describirFaltantes, errorAnioIngreso, GENEROS, sinSignos,
} from '../perfil.js'
import { useSesion } from '../sesion/SesionContext.jsx'
import { formatearTelefono } from '../formatos.js'
import './editarPerfil.css'

const MAX_DESCRIPCION = 300

// Campos editables; la API devuelve null en los que aún no se completan
const CAMPOS = [
  'nombre', 'ap_paterno', 'ap_materno', 'fecha_nac', 'genero', 'correo', 'telefono',
  'institucion_id', 'sede', 'carrera', 'anio_ingreso',
  'direccion', 'ciudad_origen', 'region_origen', 'descripcion',
]

// El teléfono llega como +56912345678 y se muestra separado: 9 1234 5678
const aFormulario = (perfil) => ({
  ...Object.fromEntries(CAMPOS.map((campo) => {
    const valor = perfil[campo] == null ? '' : String(perfil[campo])
    return [campo, campo === 'telefono' ? formatearTelefono(valor) : valor]
  })),
  carrera_otra: Boolean(perfil.carrera_otra), // escrita a mano, fuera de la lista de su institución
})

// Una sección del formulario: a la izquierda qué es y para qué se usa; a la derecha, sus campos
function Seccion({ id, Icono, titulo, descripcion, children }) {
  return (
    <section className="ep-seccion" aria-labelledby={id}>
      <div className="ep-seccion-info">
        <span className="ep-seccion-icono" aria-hidden="true"><Icono /></span>
        <div>
          <h2 id={id}>{titulo}</h2>
          <p>{descripcion}</p>
        </div>
      </div>
      <div className="ep-campos">{children}</div>
    </section>
  )
}

// HU-03 (completar perfil) y HU-04 (editar perfil). Es la pestaña «Editar perfil» de Mi perfil
export default function EditarPerfil() {
  const { recargarUsuario } = useSesion()
  const [perfil, setPerfil] = useState(null)
  const [catalogo, setCatalogo] = useState(null)
  const [datos, setDatos] = useState(null)
  const [errores, setErrores] = useState({})
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
  const [enviando, setEnviando] = useState(false)
  // Cambia al descartar o guardar: la fecha guarda sus partes por dentro y así vuelve a leer el valor
  const [version, setVersion] = useState(0)

  useEffect(() => {
    Promise.all([api('/perfil'), api('/catalogos/perfil')])
      .then(([perfilApi, catalogoApi]) => {
        setPerfil(perfilApi)
        setDatos(aFormulario(perfilApi))
        setCatalogo(catalogoApi)
      })
      .catch((err) => setMensaje({ tipo: 'alerta', texto: err.message }))
  }, [])

  // Hay cambios sin guardar: lo que se ve no es lo que tiene la API
  const sinGuardar = Boolean(datos && perfil) && JSON.stringify(datos) !== JSON.stringify(aFormulario(perfil))

  // Si se cierra o recarga la pestaña con cambios pendientes, el navegador pregunta antes
  useEffect(() => {
    if (!sinGuardar) return undefined
    const avisar = (e) => e.preventDefault()
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [sinGuardar])

  // El aviso de «guardado» se va solo después de unos segundos
  useEffect(() => {
    if (mensaje.tipo !== 'exito') return undefined
    const t = setTimeout(() => setMensaje({ tipo: '', texto: '' }), 4000)
    return () => clearTimeout(t)
  }, [mensaje])

  if (!datos || !catalogo) {
    return <CargandoPerfil texto={mensaje.texto} />
  }

  const institucion = catalogo.instituciones.find((i) => i.id === datos.institucion_id)
  const sedes = institucion?.sedes ?? []

  const cambiar = (e) => {
    const { name, value } = e.target
    // El teléfono se separa solo mientras se escribe y no acepta letras
    const nuevos = { ...datos, [name]: name === 'telefono' ? formatearTelefono(value) : value }
    if (name === 'institucion_id') {
      // Al cambiar de institución la sede anterior deja de servir; si hay una sola, se elige sola
      const elegida = catalogo.instituciones.find((i) => i.id === value)
      nuevos.sede = elegida?.sedes.length === 1 ? elegida.sedes[0] : ''
      // y la carrera, que se elige de la lista de cada institución
      nuevos.carrera = ''
      nuevos.carrera_otra = false
    }
    setDatos(nuevos)
    setErrores({ ...errores, [name]: undefined, ...(name === 'institucion_id' && { sede: undefined, carrera: undefined }) })
  }

  // Para los campos que no son un <input> (fecha en partes y género)
  const cambiarValor = (nombre, valor) => {
    setDatos((d) => ({ ...d, [nombre]: valor }))
    setErrores((e) => ({ ...e, [nombre]: undefined }))
  }

  const descartar = () => {
    setDatos(aFormulario(perfil))
    setErrores({})
    setMensaje({ tipo: '', texto: '' })
    setVersion((v) => v + 1)
  }

  const enviar = async (e) => {
    e.preventDefault()
    // El año de ingreso fuera de rango se marca al escribir: no se envía hasta corregirlo
    if (errorAnioIngreso(datos.anio_ingreso)) {
      document.querySelector('[name="anio_ingreso"]')?.focus()
      return
    }
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
      setVersion((v) => v + 1)
      setMensaje({ tipo: 'exito', texto: 'Tu perfil se guardó correctamente.' }) // CA-03.2 y CA-04.1
      await recargarUsuario()
    } catch (err) {
      // CA-03.3 y CA-04.2: no se guarda nada y se marcan los campos a corregir
      setErrores(err.errores ?? {})
      setMensaje({ tipo: 'alerta', texto: err.errores ? 'Revisa los campos marcados en rojo' : err.message })
      // Se lleva la vista al primer campo con error
      requestAnimationFrame(() => document.querySelector('.ep [aria-invalid="true"]')?.focus())
    } finally {
      setEnviando(false)
    }
  }

  // «Duoc UC (Duoc UC)» se ve repetido: la sigla solo va si es distinta del nombre
  const opcionesInstitucion = catalogo.instituciones.map((i) => ({
    valor: i.id,
    texto: i.nombre === i.sigla ? i.nombre : `${i.nombre} (${i.sigla})`,
  }))
  const opcionesRegion = catalogo.regiones.map((region) => ({ valor: region, texto: region }))
  const opcionesSede = sedes.map((sede) => ({ valor: sede, texto: sede }))
  const nombreCompleto = [perfil.nombre, perfil.ap_paterno].filter(Boolean).map(mayusculaInicial).join(' ')

  return (
    <main className="ep">
      <header className="ep-cabecera">
        <Avatar nombre={perfil.nombre} apellido={perfil.ap_paterno} foto={perfil.foto_url} tamano={64} />
        <div className="ep-quien">
          <h1>{nombreCompleto}</h1>
          <p>{perfil.rut ? `RUT ${perfil.rut} · no se puede cambiar` : 'Mantén tus datos al día para encontrar roomies compatibles'}</p>
        </div>
        <span className={`ep-estado${perfil.perfil_completo ? ' completo' : ''}`}>
          {perfil.perfil_completo ? '✓ Perfil completo' : 'Perfil incompleto'}
        </span>
      </header>

      {!perfil.perfil_completo && (
        <p className="ep-falta" role="note">
          <strong>Para completar tu perfil falta:</strong> {describirFaltantes(perfil.campos_faltantes)}.
        </p>
      )}

      <form id="ep-formulario" onSubmit={enviar} noValidate>
        <Seccion id="ep-personales" Icono={IconoUsuario} titulo="Datos personales"
          descripcion="Tu nombre y tu edad aparecen en tu perfil. La fecha exacta no se muestra.">
          <Campo etiqueta="Nombre" nombre="nombre" value={datos.nombre} onChange={cambiar}
            error={errores.nombre} autoComplete="given-name" maxLength={60} required />
          <div className="ep-fila">
            <Campo etiqueta="Apellido paterno" nombre="ap_paterno" value={datos.ap_paterno}
              onChange={cambiar} error={errores.ap_paterno} autoComplete="family-name" maxLength={60} required />
            <Campo etiqueta="Apellido materno" nombre="ap_materno" value={datos.ap_materno}
              onChange={cambiar} error={errores.ap_materno} maxLength={60} required />
          </div>
          {/* Mismo diseño que en el registro: fecha en día, mes y año, y género como opciones visibles */}
          <FechaNacimiento key={`fecha-${version}`} valor={datos.fecha_nac} error={errores.fecha_nac}
            alCambiar={(v) => cambiarValor('fecha_nac', v)} />
          <OpcionesBoton etiqueta="Género" nombre="genero" valor={datos.genero} opciones={GENEROS}
            error={errores.genero} alCambiar={(v) => cambiarValor('genero', v)} />
        </Seccion>

        <Seccion id="ep-contacto" Icono={IconoTelefono} titulo="Contacto"
          descripcion="Tu teléfono solo lo ven las personas con las que confirmas un match.">
          <div className="ep-fila">
            <Campo etiqueta="Correo" nombre="correo" type="email" value={datos.correo}
              onChange={cambiar} error={errores.correo} autoComplete="email" required
              ayuda="Lo usas para iniciar sesión." />
            <Campo etiqueta="Teléfono" nombre="telefono" type="tel" value={datos.telefono}
              onChange={cambiar} error={errores.telefono} placeholder="9 1234 5678" inputMode="numeric" maxLength={11}
              autoComplete="tel" required />
          </div>
        </Seccion>

        <Seccion id="ep-estudios" Icono={IconoSede} titulo="Datos de estudiante"
          descripcion="Con tu sede calculamos qué tan lejos está cada alojamiento.">
          <Campo etiqueta="Institución" nombre="institucion_id" value={datos.institucion_id}
            onChange={cambiar} error={errores.institucion_id} opciones={opcionesInstitucion} required />
          <div className="ep-fila">
            <Campo etiqueta="Sede" nombre="sede" value={datos.sede} onChange={cambiar}
              error={errores.sede} opciones={opcionesSede} disabled={!institucion} required
              ayuda={!institucion ? 'Primero elige tu institución.' : undefined} />
            <Campo etiqueta="Año de ingreso (opcional)" nombre="anio_ingreso" type="number"
              value={datos.anio_ingreso} onChange={cambiar} onKeyDown={sinSignos}
              error={errores.anio_ingreso ?? errorAnioIngreso(datos.anio_ingreso)}
              min={ANIO_INGRESO_MIN} max={ANIO_INGRESO_MAX} placeholder={String(ANIO_INGRESO_MAX)} inputMode="numeric" />
          </div>
          <SelectorCarrera institucionId={datos.institucion_id} valor={datos.carrera} otra={datos.carrera_otra}
            error={errores.carrera} alCambiar={(cambios) => {
              setDatos((d) => ({ ...d, ...cambios }))
              setErrores((e) => ({ ...e, carrera: undefined }))
            }} />
        </Seccion>

        <Seccion id="ep-origen" Icono={IconoUbicacion} titulo="Origen y residencia"
          descripcion="Ayuda a otros estudiantes a conocerte. La dirección no se muestra en tu perfil.">
          <div className="ep-fila">
            {/* Primero la región; la ciudad se busca entre las comunas de esa región */}
            <Campo etiqueta="Región de origen" nombre="region_origen" value={datos.region_origen}
              onChange={(e) => {
                const cambios = cambiosDeRegion(e.target.value, datos.ciudad_origen)
                setDatos((d) => ({ ...d, ...cambios }))
                setErrores((er) => ({ ...er, region_origen: undefined, ciudad_origen: undefined }))
              }}
              error={errores.region_origen} opciones={opcionesRegion} required />
            <SelectorComuna region={datos.region_origen} valor={datos.ciudad_origen} error={errores.ciudad_origen}
              alCambiar={(cambios) => {
                setDatos((d) => ({ ...d, ...cambios }))
                setErrores((e) => ({ ...e, ciudad_origen: undefined }))
              }} />
          </div>
          <Campo etiqueta="Dirección de tu ciudad de origen" nombre="direccion"
            value={datos.direccion} onChange={cambiar} error={errores.direccion} maxLength={150}
            autoComplete="street-address" required placeholder="Por ejemplo: Los Carrera 1250, depto. 304"
            ayuda="Calle y número. Si aún no tienes alojamiento, indica dónde te estás quedando." />
        </Seccion>

        <Seccion id="ep-sobre" Icono={IconoMensajes} titulo="Sobre ti"
          descripcion="Lo primero que leen los demás en tu perfil y en «Encontrar roomie».">
          <Campo etiqueta="Descripción breve (opcional)" nombre="descripcion" multilinea rows={4}
            value={datos.descripcion} onChange={cambiar} error={errores.descripcion}
            maxLength={MAX_DESCRIPCION} placeholder="Por ejemplo: estudio de día, me gusta cocinar y soy ordenada."
            ayuda={`${datos.descripcion.length}/${MAX_DESCRIPCION} caracteres`} />
        </Seccion>

        {/* Siempre a la vista al fondo de la pantalla; se destaca cuando hay cambios sin guardar */}
        <div className={`ep-barra${sinGuardar ? ' con-cambios' : ''}`}>
          <p className={`ep-barra-texto ${mensaje.tipo}`} role={mensaje.tipo === 'alerta' ? 'alert' : 'status'}>
            {mensaje.texto || (sinGuardar ? 'Tienes cambios sin guardar' : 'Todo está guardado')}
          </p>
          <div className="ep-barra-acciones">
            {sinGuardar ? (
              <button type="button" className="boton secundario ep-boton" onClick={descartar} disabled={enviando}>
                Descartar
              </button>
            ) : (
              <Link to="/perfil" className="boton secundario ep-boton">Ver mi perfil</Link>
            )}
            <button type="submit" className="boton ep-boton" disabled={enviando || !sinGuardar}>
              {enviando ? 'Guardando…' : <>Guardar<span className="ep-largo"> cambios</span></>}
            </button>
          </div>
        </div>
      </form>
    </main>
  )
}
