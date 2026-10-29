import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import Avatar from '../componentes/Avatar.jsx'
import { NivelCompatibilidad } from '../componentes/Compatibilidad.jsx'
import InsigniaVerificacion from '../componentes/InsigniaVerificacion.jsx'
import { tituloCategoria } from '../cuestionario.js'
import { mayusculaInicial } from '../inicio/utilidades.js'

// Cuántas coincidencias se nombran en la tarjeta; el resto se resume como «y N más»
const COINCIDENCIAS_VISIBLES = 3

function TarjetaRoomie({ roomie, desde }) {
  const { usuario, porcentaje, nivel, categorias_coincidentes: coinciden } = roomie
  const nombre = `${mayusculaInicial(usuario.nombre)} ${usuario.ap_paterno ?? ''}`.trim()
  const estudios = [usuario.carrera, usuario.institucion_sigla].filter(Boolean).join(' · ')
  const visibles = coinciden.slice(0, COINCIDENCIAS_VISIBLES).map((c) => tituloCategoria(c).toLowerCase())
  const resto = coinciden.length - visibles.length

  return (
    <li className="roomie">
      <div className="roomie-persona">
        <Avatar nombre={usuario.nombre} apellido={usuario.ap_paterno} foto={usuario.foto_url} tamano={56} />
        <div>
          <h2>
            {/* El enlace cubre toda la tarjeta; `desde` permite volver a esta misma página */}
            <Link to={`/usuarios/${usuario.id}`} state={{ desde }} className="roomie-enlace">{nombre}</Link>
            <InsigniaVerificacion verificado={usuario.verificado} />
          </h2>
          <p className="publicacion-meta">{estudios || 'Carrera sin indicar'}</p>
        </div>
      </div>
      <NivelCompatibilidad porcentaje={porcentaje} nivel={nivel} />
      <p className="roomie-coinciden">
        {visibles.length > 0
          ? <>Coinciden en {visibles.join(', ')}{resto > 0 && ` y ${resto} más`}</>
          : 'No coinciden exactamente en ninguna categoría'}
      </p>
    </li>
  )
}

// HU-15: «Posibles roomies», los estudiantes del más al menos compatible (CA-15.1)
export default function Roomies() {
  const [params, setParams] = useSearchParams()
  const { pathname, search } = useLocation()
  const pagina = Math.max(1, Number(params.get('pagina')) || 1)
  const [resultado, setResultado] = useState({ pagina: null, datos: null, error: '' })

  useEffect(() => {
    let vigente = true
    api(`/compatibilidades?pagina=${pagina}`)
      .then((datos) => vigente && setResultado({ pagina, datos, error: '' }))
      .catch((err) => vigente && setResultado({ pagina, datos: null, error: err.message }))
    return () => {
      vigente = false
    }
  }, [pagina])

  const irA = (nueva) => {
    setParams(nueva > 1 ? { pagina: String(nueva) } : {})
    window.scrollTo({ top: 0 })
  }

  const { datos, error } = resultado
  const cargando = resultado.pagina !== pagina

  return (
    <main className="pagina-roomies">
      <div className="encabezado-pagina">
        <div>
          <h1>Posibles roomies</h1>
          <p className="subtitulo">
            Estudiantes ordenados según qué tan compatibles son sus hábitos de convivencia con los tuyos.
          </p>
        </div>
      </div>

      {error && !cargando && <p className="alerta" role="alert">{error}</p>}
      {!datos && !error && <p className="cargando">Buscando posibles roomies…</p>}

      {/* CA-15.4: se explica qué falta para ver resultados */}
      {datos && !datos.cuestionario_completo && (
        <div className="alojamientos-vacio">
          <h3>Primero responde el cuestionario de hábitos</h3>
          <p>Con tus respuestas calculamos qué tan compatible eres con cada estudiante.</p>
          <Link to="/cuestionario" className="boton">Responder el cuestionario</Link>
        </div>
      )}

      {datos?.cuestionario_completo && datos.total === 0 && (
        <div className="alojamientos-vacio">
          <h3>Todavía no encontramos posibles roomies para ti</h3>
          <p>
            Aparecerán aquí cuando otros estudiantes respondan el cuestionario de hábitos.
            Mientras tanto, puedes revisar tus respuestas.
          </p>
          <Link to="/perfil/cuestionario" className="boton secundario">Ver mis hábitos</Link>
        </div>
      )}

      {datos?.cuestionario_completo && datos.total > 0 && (
        <>
          <p className="alojamientos-total" role="status">
            {datos.total === 1 ? '1 posible roomie' : `${datos.total} posibles roomies`}
          </p>
          <ul className={`roomies-lista${cargando ? ' actualizando' : ''}`} aria-busy={cargando}>
            {datos.resultados.map((r) => (
              <TarjetaRoomie key={r.usuario.id} roomie={r} desde={pathname + search} />
            ))}
          </ul>

          {datos.paginas > 1 && (
            <nav className="paginacion" aria-label="Páginas de resultados">
              <button type="button" className="boton secundario" disabled={datos.pagina <= 1}
                onClick={() => irA(datos.pagina - 1)}>
                Anterior
              </button>
              <span>Página {datos.pagina} de {datos.paginas}</span>
              <button type="button" className="boton secundario" disabled={datos.pagina >= datos.paginas}
                onClick={() => irA(datos.pagina + 1)}>
                Siguiente
              </button>
            </nav>
          )}
        </>
      )}
    </main>
  )
}
