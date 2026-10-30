import { Link } from 'react-router-dom'
import { describirFaltantes } from '../perfil.js'
import { IconoCheck, IconoFlecha } from './iconos.jsx'

/**
 * Solo en el propio perfil: qué tan completo está (CA-03.5) y el siguiente paso sugerido.
 * `alSubirFoto` abre el selector de la foto. Con todo listo, queda un sello discreto.
 */
export default function Completitud({ perfil, camposFaltantes, alSubirFoto }) {
  const pasos = [
    { clave: 'datos', titulo: 'Datos obligatorios', hecho: camposFaltantes.length === 0, a: '/perfil/editar',
      detalle: camposFaltantes.length ? `Falta: ${describirFaltantes(camposFaltantes)}.` : null, accion: 'Completar datos' },
    { clave: 'habitos', titulo: 'Hábitos de convivencia', hecho: Boolean(perfil.habitos), a: '/perfil/cuestionario',
      detalle: 'Con tus hábitos se calcula tu compatibilidad.', accion: 'Responder cuestionario' },
    { clave: 'foto', titulo: 'Foto de perfil', hecho: Boolean(perfil.foto_url),
      detalle: 'Un perfil con foto genera más confianza.', accion: 'Subir foto' },
    { clave: 'descripcion', titulo: 'Sobre mí', hecho: Boolean(perfil.descripcion),
      detalle: 'Cuenta cómo eres y qué buscas en un roomie.', accion: 'Escribir descripción', ancla: '#p2-titulo-sobre' },
  ]
  const hechos = pasos.filter((p) => p.hecho).length
  const avance = Math.round((hechos / pasos.length) * 100)
  const siguiente = pasos.find((p) => !p.hecho)

  let botonSiguiente = null
  if (siguiente?.a) botonSiguiente = <Link to={siguiente.a} className="boton">{siguiente.accion} <IconoFlecha /></Link>
  else if (siguiente?.clave === 'foto') botonSiguiente = <button type="button" className="boton" onClick={alSubirFoto}>{siguiente.accion}</button>
  else if (siguiente) botonSiguiente = <a href={siguiente.ancla} className="boton">{siguiente.accion}</a>

  return (
    <section className={`p2-tarjeta p2-completitud p2-anima${siguiente ? '' : ' completo'}`} aria-labelledby="p2-titulo-completitud">
      <div className="p2-completitud-cabecera">
        <div className="p2-anillo chico" role="img" aria-label={`Perfil completo al ${avance}%`}>
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="52" className="p2-anillo-fondo" />
            <circle cx="60" cy="60" r="52" className="p2-anillo-avance" pathLength="100" style={{ '--avance': avance }} />
          </svg>
          <span className="p2-anillo-cifra" aria-hidden="true"><strong data-valor={avance}>{avance}</strong>%</span>
        </div>
        <div>
          <h2 id="p2-titulo-completitud">{siguiente ? 'Completa tu perfil' : 'Perfil completo'}</h2>
          <p className="p2-nota">{hechos} de {pasos.length} pasos listos</p>
        </div>
      </div>

      {siguiente && (
        <div className="p2-siguiente">
          <p className="p2-etiqueta">Siguiente paso</p>
          <p className="p2-siguiente-titulo">{siguiente.titulo}</p>
          {siguiente.detalle && <p className="p2-nota">{siguiente.detalle}</p>}
          {botonSiguiente}
        </div>
      )}

      <ul className="p2-pasos">
        {pasos.map((p) => (
          <li key={p.clave} className={p.hecho ? 'hecho' : undefined}>
            <span className="p2-paso-marca" aria-hidden="true">{p.hecho && <IconoCheck tamano={12} />}</span>
            {p.titulo}
            <span className="visualmente-oculto">{p.hecho ? ' (listo)' : ' (pendiente)'}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
