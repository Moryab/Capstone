import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import AnilloCompatibilidad from '../componentes/AnilloCompatibilidad.jsx'
import AvisoVerificacion from '../componentes/AvisoVerificacion.jsx'
import Avatar from '../componentes/Avatar.jsx'
import BotonMensaje from '../componentes/BotonMensaje.jsx'
import InsigniaVerificacion from '../componentes/InsigniaVerificacion.jsx'
import SinFoto from '../componentes/SinFoto.jsx'
import { tituloCategoria } from '../cuestionario.js'
import { mayusculaInicial } from '../inicio/utilidades.js'
import { IconoHabito } from '../perfil/iconos.jsx'
import { formatearPesos, textoDe, TIPOS } from '../publicaciones.js'
import { useSesion } from '../sesion/SesionContext.jsx'
import { estaVerificado } from '../sesion/verificacion.js'
import './roomies.css'

// Cuántos hábitos en común se muestran como etiqueta; el resto se resume como «+N»
const COINCIDENCIAS_VISIBLES = 3

// El alojamiento del oferente dentro de su tarjeta (solo lo ve quien busca)
function AlojamientoDe({ alojamiento: a, desde }) {
  return (
    <Link to={`/alojamientos/${a.id}`} state={{ desde }} className="rm-alojamiento">
      <span className="rm-alojamiento-foto">
        {a.foto_url ? <img src={a.foto_url} alt="" loading="lazy" /> : <SinFoto />}
      </span>
      <span className="rm-alojamiento-datos">
        <span className="rm-alojamiento-tipo">
          {textoDe(TIPOS, a.tipo)} · {a.comuna}
          {a.cantidad > 1 && ` · +${a.cantidad - 1} más`}
        </span>
        <strong>{a.titulo}</strong>
        <span className="rm-alojamiento-precio">{formatearPesos(a.costo_mensual)} <span>/ mes</span></span>
      </span>
    </Link>
  )
}

function TarjetaRoomie({ roomie, desde, orden }) {
  const { usuario: u, alojamiento, porcentaje, nivel, categorias_coincidentes: coinciden } = roomie
  const nombre = `${mayusculaInicial(u.nombre)} ${u.ap_paterno ? mayusculaInicial(u.ap_paterno) : ''}`.trim()
  const estudios = [u.carrera, u.institucion_sigla].filter(Boolean).join(' · ')
  const visibles = coinciden.slice(0, COINCIDENCIAS_VISIBLES)
  const resto = coinciden.length - visibles.length

  return (
    <li className="rm-tarjeta" style={{ '--orden': Math.min(orden, 9) }}>
      <div className="rm-cabeza">
        <Avatar nombre={u.nombre} apellido={u.ap_paterno} foto={u.foto_url} tamano={56} />
        <div className="rm-quien">
          <h2><Link to={`/usuarios/${u.id}`} state={{ desde }} className="rm-nombre">{nombre}</Link></h2>
          <p className="rm-estudios">{estudios || 'Carrera sin indicar'}</p>
          <InsigniaVerificacion verificado={u.verificado} />
        </div>
        <AnilloCompatibilidad porcentaje={porcentaje} nivel={nivel} />
      </div>

      {u.descripcion
        ? <p className="rm-sobre">{u.descripcion}</p>
        : <p className="rm-sobre vacio">{mayusculaInicial(u.nombre)} aún no escribe sobre sí.</p>}

      <div className="rm-coinciden">
        <p className="rm-rotulo">{visibles.length ? 'Coinciden en' : 'Hábitos'}</p>
        {visibles.length > 0 ? (
          <ul>
            {visibles.map((c) => (
              <li key={c}><IconoHabito clave={c} tamano={15} />{tituloCategoria(c)}</li>
            ))}
            {resto > 0 && <li className="rm-mas" title={coinciden.slice(COINCIDENCIAS_VISIBLES).map(tituloCategoria).join(', ')}>+{resto}</li>}
          </ul>
        ) : <p className="rm-ninguno">No coinciden exactamente en ninguno, pero sí se parecen.</p>}
      </div>

      {alojamiento && <AlojamientoDe alojamiento={alojamiento} desde={desde} />}

      <div className="rm-acciones">
        <Link to={`/usuarios/${u.id}`} state={{ desde }} className="boton secundario rm-boton">Ver perfil</Link>
        <BotonMensaje usuarioId={u.id} nombre={u.nombre} texto="Mensaje" className="boton rm-boton" />
      </div>
    </li>
  )
}

// Mientras llega la primera respuesta: tarjetas silueta del mismo tamaño que las reales
function Siluetas() {
  return (
    <ul className="rm-grilla" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <li key={i} className="rm-tarjeta rm-silueta">
          <div className="rm-cabeza"><span className="rm-sil redonda" /><span className="rm-sil" /></div>
          <span className="rm-sil" /><span className="rm-sil corta" /><span className="rm-sil alta" />
        </li>
      ))}
    </ul>
  )
}

// HU-15: «Posibles roomies», los estudiantes del más al menos compatible (CA-15.1)
function ListaRoomies() {
  const { usuario } = useSesion()
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
  // Solo se muestran estudiantes con el rol opuesto (la API filtra; la compatibilidad no cambia)
  const oferente = usuario.modo === 'oferente'

  return (
    <main className="rm-pagina">
      <header className="rm-encabezado">
        <h1>Posibles roomies</h1>
        <p>
          {oferente
            ? 'Estudiantes que buscan alojamiento, de los más a los menos compatibles contigo.'
            : 'Estudiantes que ofrecen alojamiento, de los más a los menos compatibles contigo.'}
        </p>
        {datos?.total > 0 && (
          <p className="rm-total" role="status">
            {datos.total === 1 ? '1 posible roomie' : `${datos.total} posibles roomies`}
          </p>
        )}
      </header>

      {error && !cargando && <p className="alerta" role="alert">{error}</p>}
      {!datos && !error && <Siluetas />}

      {/* CA-15.4: se explica qué falta para ver resultados */}
      {datos && !datos.cuestionario_completo && (
        <div className="rm-vacio">
          <h2>Primero responde el cuestionario de hábitos</h2>
          <p>Con tus respuestas calculamos qué tan compatible eres con cada estudiante.</p>
          <Link to="/cuestionario" className="boton">Responder el cuestionario</Link>
        </div>
      )}

      {datos?.cuestionario_completo && datos.total === 0 && (
        <div className="rm-vacio">
          <h2>Todavía no encontramos posibles roomies para ti</h2>
          <p>
            {oferente
              ? 'Aparecerán aquí cuando estudiantes compatibles contigo activen la búsqueda de alojamiento.'
              : 'Aparecerán aquí cuando estudiantes compatibles contigo publiquen un alojamiento con cupos.'}
            {' '}Mientras tanto, puedes revisar tus respuestas.
          </p>
          <Link to="/perfil/cuestionario" className="boton secundario">Ver mis hábitos</Link>
        </div>
      )}

      {datos?.cuestionario_completo && datos.total > 0 && (
        <>
          <ul className={`rm-grilla${cargando ? ' actualizando' : ''}`} aria-busy={cargando}>
            {datos.resultados.map((r, i) => (
              <TarjetaRoomie key={r.usuario.id} roomie={r} desde={pathname + search} orden={i} />
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

// Sin cuenta verificada se muestra el aviso en lugar de la lista de roomies (acceso limitado)
export default function Roomies() {
  const { usuario } = useSesion()
  if (!estaVerificado(usuario)) {
    return (
      <main className="aviso-pagina">
        <h1>Posibles roomies</h1>
        <AvisoVerificacion detalle="Cuando tu cuenta esté verificada verás aquí a los estudiantes compatibles contigo." />
      </main>
    )
  }
  return <ListaRoomies />
}
