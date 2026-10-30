import Avatar from '../componentes/Avatar.jsx'
import { IconoCalendario, IconoPersona, IconoUbicacion } from '../componentes/Iconos.jsx'
import InsigniaVerificacion from '../componentes/InsigniaVerificacion.jsx'
import { textoGenero } from '../perfil.js'
import { mayuscula } from './datos.js'

const mesYAnio = (fecha) => new Date(fecha).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })

/**
 * Portada «Conexión» a todo el ancho (con parallax, ver PaginaPerfil), foto grande superpuesta,
 * nombre, carrera · institución y chips. `sobreAvatar` son los controles de la foto (solo en el
 * propio) y `acciones` los botones de la derecha.
 */
export default function Cabecera({ perfil, sobreAvatar, acciones }) {
  const edadYGenero = [perfil.edad && `${perfil.edad} años`, textoGenero(perfil.genero)].filter(Boolean).join(' · ')
  const origen = [perfil.ciudad_origen, perfil.region_origen].filter(Boolean).join(', ')

  return (
    <header className="p2-cabecera">
      <div className="p2-portada" aria-hidden="true"><div className="p2-portada-imagen" /></div>
      <div className="p2-identidad-fila">
        <div className="p2-avatar-zona">
          <span className="p2-avatar-anillo" aria-hidden="true" />
          <Avatar nombre={perfil.nombre} apellido={perfil.ap_paterno} foto={perfil.foto_url}
            tamano={168} className="p2-avatar" />
          {sobreAvatar}
        </div>
        <div className="p2-identidad">
          <h1 className="p2-nombre">
            {mayuscula(perfil.nombre)} {mayuscula(perfil.ap_paterno ?? '')}
            <InsigniaVerificacion verificado={perfil.verificado} />
          </h1>
          <p className="p2-titular">
            {perfil.carrera ? mayuscula(perfil.carrera) : 'Carrera sin indicar'}
            {perfil.institucion && <> · {perfil.institucion_sigla || perfil.institucion}</>}
          </p>
          <ul className="p2-chips">
            {origen && <li><IconoUbicacion /> {origen}</li>}
            {edadYGenero && <li><IconoPersona /> {edadYGenero}</li>}
            <li><IconoCalendario /> Desde {mesYAnio(perfil.miembro_desde)}</li>
          </ul>
        </div>
        {acciones && <div className="p2-acciones">{acciones}</div>}
      </div>
    </header>
  )
}
