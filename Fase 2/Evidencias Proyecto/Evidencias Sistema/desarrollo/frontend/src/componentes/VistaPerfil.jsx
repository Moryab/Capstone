import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { textoGenero } from '../perfil.js'
import Avatar from './Avatar.jsx'
import { IconoBirrete, IconoCalendario, IconoPersona, IconoUbicacion } from './Iconos.jsx'
import InsigniaVerificacion from './InsigniaVerificacion.jsx'
import { useAparecer } from './perfil/aparecer.js'
import ContactoPerfil from './perfil/ContactoPerfil.jsx'
import HabitosPerfil from './perfil/HabitosPerfil.jsx'

const mesYAnio = (fecha) =>
  new Date(fecha).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })

const Icono = ({ children }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
)
const IconoEdificio = () => <Icono><path d="M4 21V6l8-3 8 3v15" /><path d="M9 21v-5h6v5M8 9h1M15 9h1M8 13h1M15 13h1" /></Icono>
const IconoPin = () => <Icono><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></Icono>
const IconoComillas = () => (
  <svg viewBox="0 0 32 24" width="34" height="26" fill="currentColor" aria-hidden="true">
    <path d="M0 24V14C0 6.3 4.3 1.6 12 0l1.4 3.6C8.8 5 6.6 7.7 6.4 11H12v13zm18 0V14c0-7.7 4.3-12.4 12-14l1.4 3.6C26.8 5 24.6 7.7 24.4 11H30v13z" />
  </svg>
)

// Fila de «Datos clave»: si el valor falta, se indica en vez de dejar el hueco
function Dato({ icono, etiqueta, valor }) {
  return (
    <li className="pv-dato">
      <span className="pv-dato-icono">{icono}</span>
      <span className="pv-dato-textos">
        <span className="pv-dato-etiqueta">{etiqueta}</span>
        <span className={valor ? 'pv-dato-valor' : 'pv-dato-valor sin-dato'}>{valor || 'Sin indicar'}</span>
      </span>
    </li>
  )
}

/**
 * Perfil tal como lo ven los demás estudiantes (HU-16). Lo usan «Mi perfil», el perfil de otra
 * persona y la vista previa «Ver como me ven».
 * `sobreAvatar`: controles de la foto (solo en el propio) · `acciones`: botones de la cabecera ·
 * `aviso`: bajo la cabecera (en el propio, el avance del perfil) · `children`: secciones extra a
 * todo el ancho, bajo los datos (publicaciones o compatibilidad).
 */
export default function VistaPerfil({ perfil, sobreAvatar, acciones, aviso, children }) {
  const ref = useRef(null)
  useAparecer(ref, perfil)
  const propio = perfil.es_propio
  const edadYGenero = [perfil.edad && `${perfil.edad} años`, textoGenero(perfil.genero)].filter(Boolean).join(' · ')
  const origen = [perfil.ciudad_origen, perfil.region_origen].filter(Boolean).join(', ')

  return (
    <article ref={ref} className="perfil-vista pv">
      <div className="perfil-portada pv-portada" aria-hidden="true" />

      <header className="perfil-cabecera pv-cabecera">
        <div className="perfil-avatar-zona pv-avatar-zona">
          <span className="pv-avatar-anillo" aria-hidden="true" />
          <Avatar nombre={perfil.nombre} apellido={perfil.ap_paterno} foto={perfil.foto_url}
            tamano={148} className="perfil-avatar" />
          {sobreAvatar}
        </div>

        <div className="perfil-identidad pv-identidad">
          <h1>
            {perfil.nombre} {perfil.ap_paterno}
            <InsigniaVerificacion verificado={perfil.verificado} />
          </h1>
          <p className="perfil-titular">
            {perfil.carrera || 'Carrera sin indicar'}
            {perfil.institucion && <> · {perfil.institucion_sigla || perfil.institucion}</>}
          </p>
          <ul className="perfil-datos">
            {origen && <li><IconoUbicacion /> De {origen}</li>}
            {edadYGenero && <li><IconoPersona /> {edadYGenero}</li>}
            <li><IconoCalendario /> En RoomMatch desde {mesYAnio(perfil.miembro_desde)}</li>
          </ul>
        </div>

        {acciones && <div className="perfil-acciones">{acciones}</div>}
      </header>

      {aviso}

      <div className="perfil-cuerpo pv-cuerpo">
        <div className="perfil-principal">
          <section className="perfil-seccion pv-seccion pv-sobre pv-anima" aria-labelledby="pv-titulo-sobre">
            <h2 id="pv-titulo-sobre">Sobre {propio ? 'mí' : perfil.nombre}</h2>
            {perfil.descripcion ? (
              <blockquote className="pv-cita">
                <span className="pv-cita-comillas"><IconoComillas /></span>
                <p className="perfil-descripcion">{perfil.descripcion}</p>
              </blockquote>
            ) : propio ? (
              <div className="pv-vacio">
                <p className="sin-dato">Cuéntales a tus posibles roomies cómo eres, qué estudias y qué buscas.</p>
                <Link to="/perfil/editar" className="boton secundario">Agregar descripción</Link>
              </div>
            ) : (
              <p className="sin-dato">Este estudiante aún no agrega una descripción.</p>
            )}
          </section>

          {/* CA-16.1 y CA-03.4: respuestas del cuestionario de hábitos (HU-13) */}
          <HabitosPerfil perfil={perfil} />
        </div>

        <aside className="perfil-lateral">
          <ContactoPerfil perfil={perfil} />

          <section className="perfil-seccion pv-seccion pv-anima" aria-labelledby="pv-titulo-datos">
            <h2 id="pv-titulo-datos">Datos clave</h2>
            <ul className="pv-datos">
              <Dato icono={<IconoEdificio />} etiqueta="Institución" valor={perfil.institucion} />
              <Dato icono={<IconoPin />} etiqueta="Sede" valor={perfil.sede} />
              <Dato icono={<IconoBirrete />} etiqueta="Carrera" valor={perfil.carrera} />
              <Dato icono={<IconoCalendario />} etiqueta="Año de ingreso" valor={perfil.anio_ingreso} />
              <Dato icono={<IconoUbicacion />} etiqueta="Origen" valor={origen} />
            </ul>
          </section>
        </aside>

        {children && <div className="perfil-ancho pv-anima">{children}</div>}
      </div>
    </article>
  )
}
