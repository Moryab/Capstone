import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useApi } from '../datos/useApi.js'
import AnilloCompatibilidad from '../componentes/AnilloCompatibilidad.jsx'
import Avatar from '../componentes/Avatar.jsx'
import BotonMensaje from '../componentes/BotonMensaje.jsx'
import BotonReportar from '../componentes/BotonReportar.jsx'
import { useCompatibilidad } from '../componentes/Compatibilidad.jsx'
import { ErrorCarga, Esqueleto, EsqueletoTexto } from '../componentes/Esqueleto.jsx'
import FichaPublicacion, { SiluetaFicha } from '../componentes/FichaPublicacion.jsx'
import { IconoSiguiente } from '../componentes/IconosAlojamiento.jsx'
import InsigniaVerificacion from '../componentes/InsigniaVerificacion.jsx'
import { parecido } from '../compatibilidad.js'
import { CATEGORIAS, textoRespuesta, tituloCategoria } from '../cuestionario.js'
import { mayusculaInicial } from '../inicio/utilidades.js'
import { textoGenero } from '../perfil.js'
import { IconoHabito } from '../perfil/iconos.jsx'
import { ESTADOS } from '../publicaciones.js'

// Los hábitos según cuánto se parecen sus respuestas (mismo cálculo que el perfil, CA-16.2)
const GRUPOS = [
  { clase: 'coincide', uno: 'coincide', varios: 'coinciden' },
  { clase: 'parecido', uno: 'se parece', varios: 'se parecen' },
  { clase: 'distinto', uno: 'distinto', varios: 'distintos' },
]
const ESTADO_HABITO = { coincide: 'Coinciden', parecido: 'Se parecen', distinto: 'Distintos' }

// El detalle hábito por hábito, en una ventana aparte: no alarga la columna de la publicación
function HabitosDialogo({ habitos, nombre, datos, cerrar }) {
  const dialogo = useRef(null)
  useEffect(() => {
    const d = dialogo.current
    d.showModal()
    return () => d.close()
  }, [])

  return (
    <dialog ref={dialogo} className="fp-habitos-dialogo" aria-labelledby="fp-habitos-titulo"
      onCancel={(e) => { e.preventDefault(); cerrar() }}
      onClick={(e) => e.target === e.currentTarget && cerrar()}>
      <header>
        <AnilloCompatibilidad porcentaje={datos.porcentaje} nivel={datos.nivel} />
        <div>
          <h2 id="fp-habitos-titulo">Tus hábitos y los de {nombre}</h2>
          <p>Cómo responden cada uno el cuestionario de convivencia</p>
        </div>
        <button type="button" className="fp-dialogo-cerrar" onClick={cerrar} aria-label="Cerrar">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </header>
      <ul>
        {habitos.map((h) => (
          <li key={h.categoria} className={h.clase}>
            <span className="fp-habito-nombre">
              <IconoHabito clave={h.categoria} tamano={16} />
              {tituloCategoria(h.categoria)}
              {h.conflicto_imprescindible && (
                <span className="fp-imprescindible" title="Imprescindible para alguno de ustedes">!</span>
              )}
            </span>
            <span className="fp-habito-estado">{ESTADO_HABITO[h.clase]}</span>
            <dl className="fp-habito-respuestas">
              <div><dt>Tú</dt><dd>{textoRespuesta(h.categoria, h.mi_respuesta)}</dd></div>
              <div><dt>{nombre}</dt><dd>{textoRespuesta(h.categoria, h.su_respuesta)}</dd></div>
            </dl>
          </li>
        ))}
      </ul>
    </dialog>
  )
}

// CA-15.3: compatibilidad con quien publicó. A la vista, solo el porcentaje y cómo se reparten los
// hábitos; el detalle hábito por hábito (con las respuestas de ambos) se abre en una ventana
function CompatibilidadCon({ oferente }) {
  const { estado, datos } = useCompatibilidad(oferente.id)
  const [abierto, setAbierto] = useState(false)
  const nombre = mayusculaInicial(oferente.nombre)

  if (estado === 'cargando') {
    return (
      <div className="fp-compat cargando" role="status" aria-label="Calculando compatibilidad">
        <div className="fp-compat-cabeza">
          <Esqueleto forma="circulo" ancho={56} alto={56} />
          <EsqueletoTexto lineas={2} />
        </div>
      </div>
    )
  }
  if (estado !== 'lista') {
    return (
      <p className="fp-compat-nota">
        {{
          no_disponible: `Verás su compatibilidad cuando ${nombre} responda el cuestionario de hábitos.`,
          sin_verificar: 'Verás tu compatibilidad cuando tu cuenta esté verificada.',
        }[estado] ?? 'No pudimos cargar la compatibilidad.'}
      </p>
    )
  }

  const habitos = CATEGORIAS
    .map(({ clave }) => datos.detalle?.find((d) => d.categoria === clave))
    .filter(Boolean)
    .map((d) => ({ ...d, clase: parecido(d.puntaje).clase }))
  const cuenta = Object.fromEntries(GRUPOS.map(({ clase }) => [clase, habitos.filter((h) => h.clase === clase).length]))

  return (
    <div className="fp-compat">
      <div className="fp-compat-cabeza">
        <AnilloCompatibilidad porcentaje={datos.porcentaje} nivel={datos.nivel} />
        <div>
          <p className="fp-compat-titulo">Tu compatibilidad con {nombre}</p>
          {habitos.length > 0 && (
            <p className="fp-compat-resumen">Coinciden en {cuenta.coincide} de {habitos.length} hábitos</p>
          )}
        </div>
      </div>

      {habitos.length > 0 && (
        <>
          <div className="fp-compat-barra" aria-hidden="true">
            {GRUPOS.map(({ clase }) => cuenta[clase] > 0 && (
              <span key={clase} className={clase} style={{ flexGrow: cuenta[clase] }} />
            ))}
          </div>
          <ul className="fp-compat-leyenda">
            {GRUPOS.map(({ clase, uno, varios }) => cuenta[clase] > 0 && (
              <li key={clase} className={clase}><strong>{cuenta[clase]}</strong> {cuenta[clase] === 1 ? uno : varios}</li>
            ))}
          </ul>
        </>
      )}

      {datos.descartado && (
        <p className="fp-compat-descarte">
          No coinciden en {tituloCategoria(datos.categoria_descarte).toLowerCase()}, algo que uno marcó como imprescindible.
        </p>
      )}

      {habitos.length > 0 && (
        <button type="button" className="fp-compat-abrir" aria-haspopup="dialog" onClick={() => setAbierto(true)}>
          Ver hábito por hábito <IconoSiguiente />
        </button>
      )}
      {abierto && <HabitosDialogo habitos={habitos} nombre={nombre} datos={datos} cerrar={() => setAbierto(false)} />}
    </div>
  )
}

// Detalle de un alojamiento (CA-05.5). Lo ven todos los estudiantes si está activo; el oferente
// lo ve siempre y desde aquí puede ir a editarlo
export default function DetallePublicacion() {
  const { id } = useParams()
  const { state } = useLocation()
  // Con caché: una publicación ya abierta aparece al instante y se actualiza por detrás. Al cambiar de
  // publicación nunca se ve la anterior (useApi descarta las respuestas que llegan tarde)
  const { datos: pub, error, recargar } = useApi(`/publicaciones/${id}`)

  if (!pub && !error) {
    return <main className="detalle-publicacion"><SiluetaFicha /></main>
  }

  if (!pub) {
    return (
      <main className="tarjeta">
        <h1>No pudimos abrir este alojamiento</h1>
        <ErrorCarga mensaje={`${error}. Es posible que ya no esté disponible.`} alReintentar={recargar} />
        <Link to="/" className="boton secundario">Volver al inicio</Link>
      </main>
    )
  }

  const { oferente } = pub
  const aqui = `/alojamientos/${pub.id}`
  // Lo principal de quien publica: edad y género, como en su perfil (CA-16.3)
  const personales = oferente && [oferente.edad && `${oferente.edad} años`, textoGenero(oferente.genero)]
    .filter(Boolean).join(', ')

  return (
    <main className="detalle-publicacion">
      {/* CA-12.5: desde el listado se vuelve con los mismos filtros */}
      <Link to={state?.desde ?? (pub.es_propia ? '/perfil' : '/alojamientos')} className="volver">Volver</Link>

      {pub.es_propia && pub.estado !== 'activa' && (
        <p className="alerta">
          Estado: {ESTADOS[pub.estado] ?? pub.estado}. Los demás estudiantes no ven esta publicación.
        </p>
      )}

      {/* EP-06 · HU-25: reportar va aparte y discreto, nunca en la propia publicación (CA-25.5) */}
      <FichaPublicacion key={pub.id} pub={pub}
        acciones={pub.es_propia ? (
          <Link to={`/publicaciones/${pub.id}/editar`} className="boton">Editar publicación</Link>
        ) : oferente && (
          // Chat con quien publica: la conversación se abre con este alojamiento adjunto
          <BotonMensaje usuarioId={oferente.id} nombre={oferente.nombre} texto="Enviar mensaje"
            publicacion={{
              id: pub.id,
              titulo: pub.titulo,
              costo_mensual: pub.costo_mensual,
              comuna: pub.ubicacion.comuna_nombre,
              foto_url: pub.fotos.find((f) => f.es_principal)?.url ?? null,
            }} />
        )}
        herramientas={!pub.es_propia && <BotonReportar tipo="publicacion" id={pub.id} nombre={pub.titulo} texto="Reportar" />}>
        {oferente && (
          <section className="fp-tarjeta fp-quien" aria-label={pub.es_propia ? 'Tu publicación' : 'Quién publica'}>
            <Link to={pub.es_propia ? '/perfil' : `/usuarios/${oferente.id}`} className="fp-oferente" state={{ desde: aqui }}>
              <Avatar nombre={oferente.nombre} apellido={oferente.ap_paterno} foto={oferente.foto_url} tamano={120} />
              <span className="fp-oferente-datos">
                <span className="fp-oferente-rol">{pub.es_propia ? 'Tu publicación' : 'Publicado por'}</span>
                <strong>{mayusculaInicial(oferente.nombre)} {oferente.ap_paterno ? mayusculaInicial(oferente.ap_paterno) : ''}</strong>
                {personales && <span className="fp-oferente-personal">{personales}</span>}
                <InsigniaVerificacion verificado={oferente.verificado} />
              </span>
              <IconoSiguiente />
            </Link>
            {/* CA-15.3: compatibilidad con quien publica; en la propia publicación no aplica */}
            {!pub.es_propia && <CompatibilidadCon oferente={oferente} />}
          </section>
        )}
      </FichaPublicacion>
    </main>
  )
}
