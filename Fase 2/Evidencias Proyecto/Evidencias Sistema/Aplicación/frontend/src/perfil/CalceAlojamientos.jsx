import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { formatearPesos } from '../publicaciones.js'
import { mayuscula } from './datos.js'

const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
)
const Cruz = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" /></svg>
)

/**
 * «¿Tus alojamientos calzan con lo que busca…?»: en el perfil de un buscador visto por un oferente,
 * revisa cada alojamiento del oferente con las preferencias que guardó el buscador (las mismas que
 * usan las propuestas de match, GET /matches/calce/:id) y dice por qué RoomMatch los propuso o no.
 * Solo muestra el motivo de lo que no se cumple, no todo su perfil de búsqueda.
 */
export default function CalceAlojamientos({ usuarioId, nombre }) {
  const [datos, setDatos] = useState(null)

  useEffect(() => {
    let vigente = true
    api(`/matches/calce/${usuarioId}`).then((d) => vigente && setDatos(d)).catch(() => vigente && setDatos({ aplica: false }))
    return () => { vigente = false }
  }, [usuarioId])

  if (!datos?.aplica) return null
  const n = mayuscula(nombre)
  const calzan = datos.alojamientos.filter((a) => a.calza)
  // Lo que impide la propuesta aunque un alojamiento calce (en el orden en que lo revisa la plataforma)
  const bloqueos = [
    !datos.buscando && `${n} no está buscando alojamiento ahora: RoomMatch no le propone matches hasta que active la búsqueda.`,
    !datos.compatibilidad_alta && 'Su compatibilidad es menor a 75 %: RoomMatch solo propone match con compatibilidad alta.',
  ].filter(Boolean)
  const conclusion = datos.alojamientos.length === 0 ? null
    : calzan.length && !bloqueos.length
      ? { tono: 'ok', texto: `Cumplen lo necesario: RoomMatch puede proponerles un match con ${calzan.length === 1 ? 'ese alojamiento' : 'esos alojamientos'}.` }
      : { tono: 'no', texto: 'Por eso RoomMatch no les ha propuesto un match.' }

  return (
    <section className="p2-tarjeta p2-calce p2-anima" aria-labelledby="p2-titulo-calce">
      <h2 id="p2-titulo-calce">¿Tus alojamientos calzan con lo que busca {n}?</h2>
      <p className="p2-nota">RoomMatch solo propone un match cuando el alojamiento cumple lo que el estudiante guardó como preferencias de búsqueda.</p>

      {bloqueos.map((b) => <p key={b} className="p2-calce-bloqueo">{b}</p>)}

      {datos.alojamientos.length === 0 ? (
        <p className="p2-vacio">No tienes alojamientos activos con cupos. <Link to="/mis-publicaciones">Revisa tus publicaciones</Link>.</p>
      ) : (
        <>
          {!datos.con_preferencias && (
            <p className="p2-nota">{n} no guardó preferencias de búsqueda: cualquiera de tus alojamientos le sirve.</p>
          )}
          <ul className="p2-calce-lista">
            {datos.alojamientos.map((a) => {
              const fallas = a.revisiones.filter((r) => !r.ok)
              return (
                <li key={a.id} className="p2-calce-item" data-calza={a.calza || undefined}>
                  <div className="p2-calce-cabeza">
                    <span className="p2-calce-alojamiento">
                      <Link to={`/alojamientos/${a.id}`}>{a.titulo}</Link>
                      <small>{a.comuna} · {formatearPesos(a.costo_mensual)} / mes</small>
                    </span>
                    <span className="p2-calce-estado">{a.calza ? <><Check /> Calza</> : <><Cruz /> No calza</>}</span>
                  </div>
                  {fallas.length > 0 ? (
                    <ul className="p2-calce-motivos">
                      {fallas.map((r) => <li key={r.clave}><Cruz /> {r.motivo}</li>)}
                    </ul>
                  ) : datos.con_preferencias && (
                    <p className="p2-calce-cumple"><Check /> Cumple con todo lo que busca</p>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}

      {conclusion && <p className="p2-calce-conclusion" data-tono={conclusion.tono}>{conclusion.texto}</p>}
    </section>
  )
}
