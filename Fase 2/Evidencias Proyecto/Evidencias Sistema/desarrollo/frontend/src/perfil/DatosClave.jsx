import { IconoBirrete, IconoCalendario, IconoUbicacion } from '../componentes/Iconos.jsx'
import { mayuscula } from './datos.js'
import { IconoCasa } from './iconos.jsx'

function Dato({ icono, etiqueta, valor }) {
  return (
    <li className="p2-dato">
      <span className="p2-dato-icono" aria-hidden="true">{icono}</span>
      <span className="p2-dato-textos">
        <span className="p2-dato-etiqueta">{etiqueta}</span>
        <span className={valor ? 'p2-dato-valor' : 'p2-dato-valor p2-sin'}>{valor || 'Sin indicar'}</span>
      </span>
    </li>
  )
}

// Estudios y origen en una sola tarjeta. La dirección nunca se muestra (CA-16.3)
export default function DatosClave({ perfil }) {
  const origen = [perfil.ciudad_origen, perfil.region_origen].filter(Boolean).join(', ')
  return (
    <section className="p2-tarjeta p2-anima" aria-labelledby="p2-titulo-datos">
      <h2 id="p2-titulo-datos">Datos clave</h2>
      <ul className="p2-datos">
        <Dato icono={<IconoCasa tamano={18} />} etiqueta="Institución" valor={perfil.institucion} />
        <Dato icono={<IconoUbicacion />} etiqueta="Sede" valor={perfil.sede} />
        <Dato icono={<IconoBirrete />} etiqueta="Carrera" valor={perfil.carrera && mayuscula(perfil.carrera)} />
        <Dato icono={<IconoCalendario />} etiqueta="Año de ingreso" valor={perfil.anio_ingreso} />
        <Dato icono={<IconoUbicacion />} etiqueta="Origen" valor={origen} />
      </ul>
    </section>
  )
}
