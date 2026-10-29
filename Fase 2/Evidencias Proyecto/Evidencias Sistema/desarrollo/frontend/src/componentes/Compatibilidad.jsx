import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { formatearPorcentaje, NIVELES_COMPATIBILIDAD, parecido } from '../compatibilidad.js'
import { CATEGORIAS, textoRespuesta, tituloCategoria } from '../cuestionario.js'

/**
 * Compatibilidad con otro estudiante, vista desde quien consulta (CA-15.5: nunca entre terceros).
 * Devuelve { estado: 'cargando' | 'lista' | 'no_disponible' | 'error', datos }. «no_disponible» es
 * cuando no hay cálculo: la otra persona no respondió el cuestionario o su cuenta no está activa.
 */
export function useCompatibilidad(otroId) {
  const [resultado, setResultado] = useState({ id: null, estado: 'cargando', datos: null })

  useEffect(() => {
    if (!otroId) return undefined
    let vigente = true // evita mostrar una respuesta vieja si se cambia de persona rápido
    api(`/compatibilidades/${otroId}`)
      .then((datos) => vigente && setResultado({ id: otroId, estado: 'lista', datos }))
      .catch((err) => vigente && setResultado({
        id: otroId, estado: err.estado === 404 ? 'no_disponible' : 'error', datos: null,
      }))
    return () => {
      vigente = false
    }
  }, [otroId])

  return resultado.id === otroId ? resultado : { estado: 'cargando', datos: null }
}

// CA-15.2: porcentaje con su nivel escrito; el color y la barra solo lo refuerzan
export function NivelCompatibilidad({ porcentaje, nivel }) {
  return (
    <span className={`compat compat-${nivel}`}>
      <span className="compat-cifras">
        <strong>{formatearPorcentaje(porcentaje)}</strong> {NIVELES_COMPATIBILIDAD[nivel]}
      </span>
      <span className="compat-barra" aria-hidden="true">
        <span style={{ width: `${porcentaje}%` }} />
      </span>
    </span>
  )
}

// Aviso de que el par se descartó por un choque en algo que alguien marcó como imprescindible
function AvisoDescarte({ categoria }) {
  return (
    <p className="compat-descarte">
      No se recomiendan como roomies: no coinciden en <strong>{tituloCategoria(categoria).toLowerCase()}</strong>,
      algo que uno de ustedes marcó como imprescindible.
    </p>
  )
}

// CA-15.3: compatibilidad con quien publicó un alojamiento, en el detalle de la publicación
export function CompatibilidadOferente({ oferente }) {
  const { estado, datos } = useCompatibilidad(oferente.id)

  if (estado === 'cargando') return <p className="compat-oferente sin-dato">Calculando compatibilidad…</p>
  if (estado !== 'lista') {
    return (
      <p className="compat-oferente sin-dato">
        {estado === 'no_disponible'
          ? `Compatibilidad no disponible: ${oferente.nombre} aún no responde el cuestionario de hábitos.`
          : 'No pudimos cargar la compatibilidad.'}
      </p>
    )
  }
  return (
    <div className="compat-oferente">
      <p className="compat-titulo">Tu compatibilidad con {oferente.nombre}</p>
      <NivelCompatibilidad porcentaje={datos.porcentaje} nivel={datos.nivel} />
      {datos.descartado && <AvisoDescarte categoria={datos.categoria_descarte} />}
    </div>
  )
}

// CA-16.2: en el perfil de otro estudiante, la compatibilidad categoría por categoría
export function SeccionCompatibilidad({ otroId, nombre }) {
  const { estado, datos } = useCompatibilidad(otroId)

  return (
    <section className="perfil-seccion compat-seccion" aria-labelledby="titulo-compat">
      <h2 id="titulo-compat">Tu compatibilidad con {nombre}</h2>
      {estado === 'cargando' && <p className="sin-dato">Calculando compatibilidad…</p>}
      {estado === 'no_disponible' && (
        <p className="sin-dato">
          Compatibilidad no disponible: {nombre} aún no responde el cuestionario de hábitos.
        </p>
      )}
      {estado === 'error' && <p className="alerta">No pudimos cargar la compatibilidad.</p>}
      {estado === 'lista' && (
        <>
          <NivelCompatibilidad porcentaje={datos.porcentaje} nivel={datos.nivel} />
          {datos.descartado && <AvisoDescarte categoria={datos.categoria_descarte} />}
          <ul className="compat-detalle">
            {CATEGORIAS.map(({ clave, titulo }) => {
              const d = datos.detalle.find((x) => x.categoria === clave)
              if (!d) return null
              const { clase, texto } = parecido(d.puntaje)
              return (
                <li key={clave} className={`compat-categoria ${clase}`}>
                  <div className="compat-categoria-cabecera">
                    <strong>{titulo}</strong>
                    <span className="compat-estado">{texto}</span>
                  </div>
                  <p>
                    <span>Tú: {textoRespuesta(clave, d.mi_respuesta)}</span>
                    <span>{nombre}: {textoRespuesta(clave, d.su_respuesta)}</span>
                  </p>
                  {d.conflicto_imprescindible && (
                    <span className="imprescindible">Imprescindible para alguno de ustedes</span>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
