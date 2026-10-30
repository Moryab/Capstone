import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { describirFaltantes } from '../../perfil.js'

const Check = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
)

/**
 * Solo en el propio perfil: cuánto falta para que el perfil esté completo, con cada paso pendiente
 * a un clic. Reemplaza la alerta de perfil incompleto (CA-03.5). Si todo está listo, no se muestra.
 */
export default function ProgresoPerfil({ perfil, camposFaltantes }) {
  const pasos = [
    { titulo: 'Datos obligatorios', hecho: camposFaltantes.length === 0, a: '/perfil/editar',
      detalle: camposFaltantes.length ? `Falta: ${describirFaltantes(camposFaltantes)}` : null },
    { titulo: 'Hábitos de convivencia', hecho: Boolean(perfil.habitos), a: '/perfil/cuestionario' },
    { titulo: 'Foto de perfil', hecho: Boolean(perfil.foto_url), detalle: 'Usa el botón de cámara sobre tu foto' },
    { titulo: 'Descripción', hecho: Boolean(perfil.descripcion), a: '/perfil/editar', detalle: 'Cuéntales a tus posibles roomies cómo eres' },
  ]
  const hechos = pasos.filter((p) => p.hecho).length
  const avance = Math.round((hechos / pasos.length) * 100)
  // El anillo se llena al aparecer
  const [lleno, setLleno] = useState(false)
  useEffect(() => {
    const t = requestAnimationFrame(() => setLleno(true))
    return () => cancelAnimationFrame(t)
  }, [])

  if (hechos === pasos.length) return null

  return (
    <section className="pv-progreso pv-anima" aria-labelledby="pv-titulo-progreso">
      <div className="pv-anillo" role="img" aria-label={`Perfil completo al ${avance}%`}>
        <svg viewBox="0 0 60 60" aria-hidden="true">
          <circle cx="30" cy="30" r="25" className="pv-anillo-fondo" />
          <circle cx="30" cy="30" r="25" className="pv-anillo-avance" pathLength="100"
            style={{ strokeDashoffset: lleno ? 100 - avance : 100 }} />
        </svg>
        <span aria-hidden="true">{avance}%</span>
      </div>
      <div className="pv-progreso-textos">
        <h2 id="pv-titulo-progreso">Tu perfil está al {avance}%</h2>
        <p>Un perfil completo genera más confianza en tus posibles roomies.</p>
        <ul className="pv-progreso-pasos">
          {pasos.map((p) => (
            <li key={p.titulo} className={p.hecho ? 'hecho' : undefined}>
              <span className="pv-paso-marca" aria-hidden="true">{p.hecho && <Check />}</span>
              {!p.hecho && p.a ? <Link to={p.a}>{p.titulo}</Link> : <span>{p.titulo}</span>}
              {p.hecho && <span className="visualmente-oculto"> (listo)</span>}
              {!p.hecho && p.detalle && <span className="pv-paso-detalle">{p.detalle}</span>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
