import { textoGenero } from '../perfil.js'
import Avatar from './Avatar.jsx'
import {
  IconoBirrete, IconoCalendario, IconoHogar, IconoPersona, IconoUbicacion, IconoVerificado,
} from './Iconos.jsx'

const mesYAnio = (fecha) =>
  new Date(fecha).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })

// Fila de datos: si el valor falta, se indica en vez de dejar el hueco
function Dato({ etiqueta, valor }) {
  return (
    <>
      <dt>{etiqueta}</dt>
      <dd className={valor ? undefined : 'sin-dato'}>{valor || 'Sin indicar'}</dd>
    </>
  )
}

// Perfil tal como lo ven los demás estudiantes (HU-16). Lo usan «Mi perfil» y el perfil de otra persona.
// `sobreAvatar` son los controles de la foto (solo en el propio) y `acciones` los botones de la cabecera
export default function VistaPerfil({ perfil, sobreAvatar, acciones, aviso }) {
  const propio = perfil.es_propio
  const edadYGenero = [perfil.edad && `${perfil.edad} años`, textoGenero(perfil.genero)]
    .filter(Boolean)
    .join(' · ')
  const origen = [perfil.ciudad_origen, perfil.region_origen].filter(Boolean).join(', ')

  return (
    <article className="perfil-vista">
      <div className="perfil-portada" aria-hidden="true" />

      <header className="perfil-cabecera">
        <div className="perfil-avatar-zona">
          <Avatar nombre={perfil.nombre} apellido={perfil.ap_paterno} foto={perfil.foto_url}
            tamano={148} className="perfil-avatar" />
          {sobreAvatar}
        </div>

        <div className="perfil-identidad">
          <h1>
            {perfil.nombre} {perfil.ap_paterno}
            {perfil.verificado && (
              <span className="insignia-verificado" title="Estudiante con su condición acreditada">
                <IconoVerificado /> Verificado
              </span>
            )}
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

      <div className="perfil-cuerpo">
        <div className="perfil-principal">
          <section className="perfil-seccion">
            <h2>Sobre {propio ? 'mí' : perfil.nombre}</h2>
            {perfil.descripcion ? (
              <p className="perfil-descripcion">{perfil.descripcion}</p>
            ) : (
              <p className="sin-dato">
                {propio
                  ? 'Aún no agregas una descripción. Cuéntales a tus posibles roomies cómo eres.'
                  : 'Este estudiante aún no agrega una descripción.'}
              </p>
            )}
          </section>

          {/* CA-16.1 pide mostrar las respuestas del cuestionario de hábitos (HU-13), que aún no existe */}
          <section className="perfil-seccion">
            <h2><IconoHogar /> Hábitos de convivencia</h2>
            <p className="sin-dato">
              Aquí aparecerán los hábitos y preferencias de convivencia cuando
              {propio ? ' completes' : ' complete'} el cuestionario.
            </p>
          </section>
        </div>

        <aside className="perfil-lateral">
          <section className="perfil-seccion">
            <h2><IconoBirrete /> Estudios</h2>
            <dl className="perfil-lista">
              <Dato etiqueta="Institución" valor={perfil.institucion} />
              <Dato etiqueta="Sede" valor={perfil.sede} />
              <Dato etiqueta="Carrera" valor={perfil.carrera} />
              <Dato etiqueta="Año de ingreso" valor={perfil.anio_ingreso} />
            </dl>
          </section>

          <section className="perfil-seccion">
            <h2><IconoUbicacion /> Origen</h2>
            <dl className="perfil-lista">
              <Dato etiqueta="Ciudad" valor={perfil.ciudad_origen} />
              <Dato etiqueta="Región" valor={perfil.region_origen} />
            </dl>
          </section>
        </aside>
      </div>
    </article>
  )
}
