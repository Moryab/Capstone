import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api } from '../api.js'
import AnilloCompatibilidad from '../componentes/AnilloCompatibilidad.jsx'
import Avatar from '../componentes/Avatar.jsx'
import BotonMensaje from '../componentes/BotonMensaje.jsx'
import BotonReportar from '../componentes/BotonReportar.jsx'
import { useCompatibilidad } from '../componentes/Compatibilidad.jsx'
import FichaPublicacion from '../componentes/FichaPublicacion.jsx'
import { IconoSiguiente } from '../componentes/IconosAlojamiento.jsx'
import InsigniaVerificacion from '../componentes/InsigniaVerificacion.jsx'
import { parecido } from '../compatibilidad.js'
import { CATEGORIAS, textoRespuesta, tituloCategoria } from '../cuestionario.js'
import { mayusculaInicial } from '../inicio/utilidades.js'
import { IconoHabito } from '../perfil/iconos.jsx'
import { ESTADOS } from '../publicaciones.js'

// Los hábitos agrupados según cuánto se parecen sus respuestas (mismo cálculo que el perfil, CA-16.2)
const GRUPOS = [
  { clase: 'coincide', titulo: 'Coinciden en', marca: '✓' },
  { clase: 'parecido', titulo: 'Se parecen en', marca: '≈' },
  { clase: 'distinto', titulo: 'Son distintos en', marca: '✕' },
]

// Hábito por hábito, sin salir de la publicación: etiquetas por grupo y, al abrir, las respuestas de ambos
function DetalleHabitos({ detalle, nombre }) {
  const habitos = CATEGORIAS
    .map(({ clave }) => detalle.find((d) => d.categoria === clave))
    .filter(Boolean)
    .map((d) => ({ ...d, clase: parecido(d.puntaje).clase }))

  return (
    <div className="fp-habitos">
      {GRUPOS.map(({ clase, titulo, marca }) => {
        const delGrupo = habitos.filter((h) => h.clase === clase)
        if (!delGrupo.length) return null
        return (
          <div key={clase} className={`fp-habitos-grupo ${clase}`}>
            <p>{titulo}</p>
            <ul>
              {delGrupo.map((h) => (
                <li key={h.categoria}>
                  <span className="fp-habito-marca" aria-hidden="true">{marca}</span>
                  <IconoHabito clave={h.categoria} tamano={14} />
                  {tituloCategoria(h.categoria)}
                  {h.conflicto_imprescindible && <span className="fp-imprescindible" title="Imprescindible para alguno de ustedes">!</span>}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
      <details className="fp-respuestas">
        <summary>Ver las respuestas de ambos</summary>
        <dl>
          {habitos.map((h) => (
            <div key={h.categoria} className={h.clase}>
              <dt>{tituloCategoria(h.categoria)}</dt>
              <dd>
                <span>Tú: {textoRespuesta(h.categoria, h.mi_respuesta)}</span>
                <span>{nombre}: {textoRespuesta(h.categoria, h.su_respuesta)}</span>
                {h.conflicto_imprescindible && <span className="fp-imprescindible-texto">Imprescindible para alguno de ustedes</span>}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  )
}

// CA-15.3: compatibilidad con quien publicó: el anillo de las tarjetas y el detalle por hábito
function CompatibilidadCon({ oferente, desde }) {
  const { estado, datos } = useCompatibilidad(oferente.id)
  const nombre = mayusculaInicial(oferente.nombre)

  if (estado === 'cargando') return <p className="fp-compat-nota">Calculando compatibilidad…</p>
  if (estado !== 'lista') {
    return (
      <p className="fp-compat-nota">
        {{
          no_disponible: `Compatibilidad no disponible: ${nombre} aún no responde el cuestionario de hábitos.`,
          sin_verificar: 'Verás tu compatibilidad cuando tu cuenta esté verificada.',
        }[estado] ?? 'No pudimos cargar la compatibilidad.'}
      </p>
    )
  }
  return (
    <div className="fp-compat">
      <div className="fp-compat-cabeza">
        <AnilloCompatibilidad porcentaje={datos.porcentaje} nivel={datos.nivel} />
        <div>
          <p>Tu compatibilidad con {nombre}</p>
          <Link to={`/usuarios/${oferente.id}`} state={{ desde }}>Ver su perfil completo</Link>
        </div>
      </div>
      {datos.descartado && (
        <p className="fp-compat-descarte">
          No se recomiendan como roomies: no coinciden en {tituloCategoria(datos.categoria_descarte).toLowerCase()},
          algo que uno marcó como imprescindible.
        </p>
      )}
      {datos.detalle?.length > 0 && <DetalleHabitos detalle={datos.detalle} nombre={nombre} />}
    </div>
  )
}

// Detalle de un alojamiento (CA-05.5). Lo ven todos los estudiantes si está activo; el oferente
// lo ve siempre y desde aquí puede ir a editarlo
export default function DetallePublicacion() {
  const { id } = useParams()
  const { state } = useLocation()
  const [resultado, setResultado] = useState({ id: null, pub: null, error: '' })

  useEffect(() => {
    let vigente = true // evita mostrar una respuesta vieja si se cambia de publicación rápido
    api(`/publicaciones/${id}`)
      .then((pub) => vigente && setResultado({ id, pub, error: '' }))
      .catch((err) => vigente && setResultado({ id, pub: null, error: err.message }))
    return () => {
      vigente = false
    }
  }, [id])

  if (resultado.id !== id) return <p className="cargando">Cargando alojamiento…</p>

  if (resultado.error) {
    return (
      <main className="tarjeta">
        <h1>{resultado.error}</h1>
        <p className="subtitulo">Es posible que el alojamiento ya no esté disponible.</p>
        <Link to="/" className="boton">Volver al inicio</Link>
      </main>
    )
  }

  const { pub } = resultado
  const { oferente } = pub
  const aqui = `/alojamientos/${pub.id}`

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
        pie={!pub.es_propia && <BotonReportar tipo="publicacion" id={pub.id} nombre={pub.titulo} />}>
        {oferente && (
          <Link to={pub.es_propia ? '/perfil' : `/usuarios/${oferente.id}`} className="fp-oferente" state={{ desde: aqui }}>
            <Avatar nombre={oferente.nombre} apellido={oferente.ap_paterno} foto={oferente.foto_url} tamano={48} />
            <span className="fp-oferente-datos">
              <span className="fp-oferente-rol">{pub.es_propia ? 'Tu publicación' : 'Publicado por'}</span>
              <strong>{mayusculaInicial(oferente.nombre)} {oferente.ap_paterno ? mayusculaInicial(oferente.ap_paterno) : ''}</strong>
              <InsigniaVerificacion verificado={oferente.verificado} />
            </span>
            <IconoSiguiente />
          </Link>
        )}
        {/* Chat con quien publica: la conversación se abre con este alojamiento adjunto */}
        {oferente && !pub.es_propia && (
          <BotonMensaje usuarioId={oferente.id} nombre={oferente.nombre} texto="Enviar mensaje al oferente"
            publicacion={{
              id: pub.id,
              titulo: pub.titulo,
              costo_mensual: pub.costo_mensual,
              comuna: pub.ubicacion.comuna_nombre,
              foto_url: pub.fotos.find((f) => f.es_principal)?.url ?? null,
            }} />
        )}
        {/* CA-15.3: compatibilidad con quien publica; en la propia publicación no aplica */}
        {oferente && !pub.es_propia && <CompatibilidadCon oferente={oferente} desde={aqui} />}

        {pub.es_propia && (
          <Link to={`/publicaciones/${pub.id}/editar`} className="boton">Editar publicación</Link>
        )}
      </FichaPublicacion>
    </main>
  )
}
