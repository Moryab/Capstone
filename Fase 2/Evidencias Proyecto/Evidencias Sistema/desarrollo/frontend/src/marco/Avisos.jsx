import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { IconoCampana, IconoCerrar } from '../inicio/iconos.jsx'
import { enlaceDe, haceCuanto } from '../notificaciones.js'
import './avisos.css'

/**
 * Panel de avisos (la campana). Mismo diálogo lateral que la configuración: en escritorio entra
 * desde la derecha y en móvil sube desde abajo. Al abrir un aviso se marca como leído.
 */
export default function Avisos({ abierto, alCerrar, alCambiar }) {
  const dialogo = useRef(null)
  const navegar = useNavigate()
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const d = dialogo.current
    if (abierto && !d.open) d.showModal()
    if (!abierto && d.open) d.close()
    if (!abierto) return
    api('/notificaciones')
      .then((r) => {
        setDatos(r)
        setError('')
      })
      .catch((err) => setError(err.message))
  }, [abierto])

  const abrir = async (aviso) => {
    if (!aviso.leido) {
      await api(`/notificaciones/${aviso.id}/leida`, { metodo: 'PUT' }).catch(() => {})
      alCambiar()
    }
    const enlace = enlaceDe(aviso)
    if (enlace) {
      alCerrar()
      navegar(enlace)
    } else {
      setDatos((d) => ({ ...d, avisos: d.avisos.map((a) => (a.id === aviso.id ? { ...a, leido: true } : a)) }))
    }
  }

  const marcarTodas = async () => {
    await api('/notificaciones/leidas', { metodo: 'PUT' }).catch(() => {})
    setDatos((d) => ({ no_leidas: 0, avisos: d.avisos.map((a) => ({ ...a, leido: true })) }))
    alCambiar()
  }

  return (
    <dialog ref={dialogo} className="i-config" aria-labelledby="i-titulo-avisos" onClose={alCerrar}
      onClick={(e) => e.target === dialogo.current && alCerrar()}>
      <div className="i-config-contenido">
        <div className="i-config-barra">
          <div className="i-config-titulo">
            <h2 id="i-titulo-avisos">Avisos</h2>
            <p>{datos?.no_leidas ? `${datos.no_leidas} sin leer` : 'Estás al día'}</p>
          </div>
          <button type="button" className="i-cerrar" onClick={alCerrar} aria-label="Cerrar avisos">
            <IconoCerrar />
          </button>
        </div>

        {error && <p className="alerta" role="alert">{error}</p>}
        {!datos && !error && <p className="avisos-vacio">Cargando…</p>}

        {datos && datos.avisos.length === 0 && (
          <div className="avisos-vacio">
            <span aria-hidden="true"><IconoCampana /></span>
            <p>Aún no tienes avisos. Aquí verás tus propuestas de match y otras novedades.</p>
          </div>
        )}

        {datos && datos.avisos.length > 0 && (
          <>
            {datos.no_leidas > 0 && (
              <button type="button" className="avisos-todas" onClick={marcarTodas}>Marcar todo como leído</button>
            )}
            <ul className="avisos-lista">
              {datos.avisos.map((a) => (
                <li key={a.id}>
                  <button type="button" className={`aviso${a.leido ? '' : ' no-leido'}`} onClick={() => abrir(a)}>
                    <strong>{a.titulo}</strong>
                    <span>{a.mensaje}</span>
                    <time dateTime={a.fecha}>{haceCuanto(a.fecha)}</time>
                    {!a.leido && <span className="visualmente-oculto">(sin leer)</span>}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </dialog>
  )
}
