import { Link } from 'react-router-dom'
import { CATEGORIAS, textoRespuesta } from '../../cuestionario.js'

// Íconos de línea, monocromos, uno por categoría
const Icono = ({ children }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
)
const ICONOS = {
  horario_sueno: <Icono><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></Icono>,
  horario_estudio: <Icono><path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4z" /><path d="M20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z" /></Icono>,
  orden_limpieza: <Icono><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z" /><path d="M18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z" /></Icono>,
  ruido: <Icono><path d="M4 10v4h4l5 4V6L8 10z" /><path d="M16.5 8.5a5 5 0 0 1 0 7" /><path d="M19 6a8.5 8.5 0 0 1 0 12" /></Icono>,
  visitas: <Icono><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 4.8a3.2 3.2 0 0 1 0 6.4M18 14.4a6 6 0 0 1 3 5.6" /></Icono>,
  fumar: <Icono><rect x="2.5" y="14" width="15" height="4" rx="1" /><path d="M20.5 14v4M17.5 10c0-2 2-2 2-4M20.5 10c0-2 2-2 2-4" /></Icono>,
  mascotas: <Icono><circle cx="7" cy="9" r="1.8" /><circle cx="12" cy="6.5" r="1.8" /><circle cx="17" cy="9" r="1.8" /><path d="M8 17c0-2.8 1.8-5 4-5s4 2.2 4 5c0 1.7-1.6 2.5-4 2.5S8 18.7 8 17z" /></Icono>,
}
const Diamante = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinejoin="round" aria-hidden="true"><path d="M6 4h12l3 5-9 11L3 9z" /></svg>
)

// Nombre corto de cada opción para la escala (el texto completo va debajo)
const CORTOS = {
  horario_sueno: { temprano: 'Temprano', intermedio: 'Intermedio', tarde: 'Tarde' },
  horario_estudio: { manana: 'Mañana', tarde: 'Tarde', noche: 'Noche', variable: 'Varía' },
  orden_limpieza: { alto: 'Alto', medio: 'Medio', bajo: 'Bajo' },
  ruido: { bajo: 'Poco', moderado: 'Moderado', alto: 'Bastante' },
  visitas: { nunca: 'Casi nunca', ocasional: 'A veces', frecuente: 'Seguido' },
  fumar: { no_fuma_no_tolera: 'Sin humo', no_fuma_tolera: 'Tolera', fuma: 'Fuma' },
  mascotas: { no_tiene_no_tolera: 'No', no_tiene_tolera: 'Le gustan', tiene: 'Tiene' },
}
// Las que van de un extremo a otro se dibujan como escala; el resto, como opciones separadas
const CONTINUAS = new Set(['horario_sueno', 'orden_limpieza', 'ruido', 'visitas'])

function Habito({ clave, titulo, opciones, valor, imprescindible }) {
  const indice = Math.max(0, opciones.findIndex((o) => o.valor === valor))
  const continua = CONTINUAS.has(clave)
  const texto = textoRespuesta(clave, valor)

  return (
    <li className={`pv-habito pv-anima${imprescindible ? ' es-imprescindible' : ''}`}>
      <div className="pv-habito-cabecera">
        <span className="pv-habito-icono">{ICONOS[clave]}</span>
        <span className="pv-habito-titulo">{titulo}</span>
        {imprescindible && <span className="pv-imprescindible"><Diamante /> Imprescindible</span>}
      </div>

      {/* La escala es visual; el texto completo de la respuesta va debajo para lectores de pantalla */}
      {continua ? (
        <div className="pv-escala" style={{ '--pos': indice / (opciones.length - 1) }} aria-hidden="true">
          <div className="pv-escala-pista">
            <span className="pv-escala-relleno" />
            {opciones.map((o) => <span key={o.valor} className="pv-escala-marca" />)}
            <span className="pv-escala-punto" />
          </div>
          <div className="pv-escala-etiquetas">
            {opciones.map((o) => (
              <span key={o.valor} className={o.valor === valor ? 'activa' : undefined}>{CORTOS[clave][o.valor]}</span>
            ))}
          </div>
        </div>
      ) : (
        <div className="pv-segmentos" style={{ '--n': opciones.length }} aria-hidden="true">
          {opciones.map((o) => (
            <span key={o.valor} className={o.valor === valor ? 'activo' : undefined}>{CORTOS[clave][o.valor]}</span>
          ))}
        </div>
      )}
      <p className="pv-habito-texto">{texto}</p>
    </li>
  )
}

/**
 * «Así convive …»: las respuestas del cuestionario (HU-13) como escalas, con los imprescindibles
 * destacados (CA-16.1). Lo usan el propio perfil y el de otros estudiantes.
 */
export default function HabitosPerfil({ perfil }) {
  const propio = perfil.es_propio
  const imprescindibles = CATEGORIAS.filter(({ clave }) => perfil.imprescindibles?.includes(clave))

  return (
    <section className="perfil-seccion pv-seccion pv-anima" aria-labelledby="pv-titulo-habitos">
      <div className="pv-seccion-cabecera">
        <h2 id="pv-titulo-habitos">{propio ? 'Tus hábitos de convivencia' : `Así convive ${perfil.nombre}`}</h2>
        {propio && perfil.habitos && <Link to="/perfil/cuestionario" className="pv-enlace">Editar hábitos</Link>}
      </div>

      {!perfil.habitos ? (
        <p className="sin-dato">
          {propio
            ? <>Aún no respondes el cuestionario. <Link to="/perfil/cuestionario">Responderlo ahora</Link></>
            : 'Este estudiante aún no responde el cuestionario de hábitos.'}
        </p>
      ) : (
        <>
          <p className="pv-resumen">
            {imprescindibles.length ? (
              <>
                <Diamante /> No negociable para {propio ? 'ti' : perfil.nombre}:{' '}
                <strong>{imprescindibles.map((c) => c.titulo.toLowerCase()).join(', ')}</strong>
              </>
            ) : `${propio ? 'No marcaste' : 'No marcó'} imprescindibles: se adapta con facilidad.`}
          </p>
          <ul className="pv-habitos">
            {CATEGORIAS.map(({ clave, titulo, opciones }) => (
              <Habito key={clave} clave={clave} titulo={titulo} opciones={opciones} valor={perfil.habitos[clave]}
                imprescindible={perfil.imprescindibles.includes(clave)} />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
