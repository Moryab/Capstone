import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { IconoBandera, IconoCampana, IconoCerrar, IconoVerificado } from '../inicio/iconos.jsx'
import { haceCuanto } from '../notificaciones.js'
import { esAtrasado, esNuevo, filtrarAvisos, textoAviso } from './avisosAdmin.js'
import './avisos.css'

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`

function Aviso({ aviso, nuevo, alAbrir }) {
  const { titulo, mensaje } = textoAviso(aviso)
  return (
    <li>
      <button type="button" className={`aviso av-aviso${nuevo ? ' no-leido' : ''}`} data-tipo={aviso.tipo} onClick={() => alAbrir(aviso)}>
        <span className="av-icono" aria-hidden="true">{aviso.tipo === 'reporte' ? <IconoBandera /> : <IconoVerificado />}</span>
        <span className="av-textos">
          <strong>{titulo}</strong>
          <span>{mensaje}</span>
          <span className="av-pie">
            <time dateTime={aviso.fecha}>{haceCuanto(aviso.fecha)}</time>
            {aviso.estado === 'en_revision' && <span className="av-etiqueta">En revisión</span>}
            {nuevo && <span className="av-etiqueta av-nuevo">Nuevo</span>}
          </span>
        </span>
      </button>
    </li>
  )
}

/**
 * La campana del administrador: lo que espera revisión (reportes y solicitudes de verificación), con
 * lo que lleva más de 2 días esperando arriba. Mismo panel lateral que la configuración. Al abrirlo,
 * lo que había queda visto (el contador baja), pero se sigue marcando como «Nuevo» mientras está abierto.
 */
export default function AvisosAdmin({ abierto, alCerrar, preferencias, visto, alVer, abrirConfig }) {
  const dialogo = useRef(null)
  const navegar = useNavigate()
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  // La última visita anterior a esta apertura: lo posterior se marca «Nuevo»
  const [vistoAntes, setVistoAntes] = useState(visto)

  useEffect(() => {
    const d = dialogo.current
    if (abierto && !d.open) d.showModal()
    if (!abierto && d.open) d.close()
    if (!abierto) return
    setVistoAntes(visto)
    alVer()
    api('/admin/avisos')
      .then((r) => {
        setDatos(r)
        setError('')
      })
      .catch((err) => setError(err.message))
    // Solo al abrir: `visto` cambia justamente porque se acaba de abrir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  const ir = (enlace) => {
    alCerrar()
    navegar(enlace)
  }

  const visibles = filtrarAvisos(datos?.avisos, preferencias)
  const atrasados = preferencias.atrasados ? visibles.filter((a) => esAtrasado(a)) : []
  const recientes = visibles.filter((a) => !atrasados.includes(a))
  const nuevos = visibles.filter((a) => esNuevo(a, vistoAntes)).length
  const ningunTipo = !preferencias.reportes && !preferencias.verificaciones

  return (
    <dialog ref={dialogo} className="i-config av-admin" aria-labelledby="i-titulo-avisos" onClose={alCerrar}
      onClick={(e) => e.target === dialogo.current && alCerrar()}>
      <div className="i-config-contenido">
        <div className="i-config-barra">
          <div className="i-config-titulo">
            <h2 id="i-titulo-avisos">Avisos</h2>
            <p>
              {!datos ? 'Revisando lo pendiente…'
                : nuevos ? `${plural(nuevos, 'aviso nuevo', 'avisos nuevos')} desde tu última visita`
                  : visibles.length ? 'Nada nuevo desde tu última visita' : 'Todo al día'}
            </p>
          </div>
          <button type="button" className="i-cerrar" onClick={alCerrar} aria-label="Cerrar avisos">
            <IconoCerrar />
          </button>
        </div>

        {error && <p className="alerta" role="alert">{error}</p>}

        {/* Lo pendiente en total, con acceso directo a cada bandeja */}
        {!ningunTipo && (
          <div className="av-resumen" aria-busy={!datos}>
            {preferencias.reportes && (
              <Link to="/admin/reportes" className="av-bandeja" data-tipo="reporte" onClick={alCerrar}>
                <span className="av-icono" aria-hidden="true"><IconoBandera /></span>
                <span><strong>{datos ? datos.reportes_pendientes : '–'}</strong> {datos?.reportes_pendientes === 1 ? 'reporte' : 'reportes'} por revisar</span>
              </Link>
            )}
            {preferencias.verificaciones && (
              <Link to="/admin/verificaciones" className="av-bandeja" data-tipo="verificacion" onClick={alCerrar}>
                <span className="av-icono" aria-hidden="true"><IconoVerificado /></span>
                <span><strong>{datos ? datos.verificaciones_pendientes : '–'}</strong> {datos?.verificaciones_pendientes === 1 ? 'verificación' : 'verificaciones'} por revisar</span>
              </Link>
            )}
          </div>
        )}

        {!datos && !error && (
          <ul className="avisos-lista av-silueta" aria-hidden="true">
            {[0, 1, 2].map((i) => <li key={i}><span /><span /></li>)}
          </ul>
        )}

        {datos && atrasados.length > 0 && (
          <section className="av-grupo" data-tono="atrasado" aria-labelledby="av-titulo-atrasados">
            <h3 id="av-titulo-atrasados">Esperan hace más de 2 días</h3>
            <ul className="avisos-lista">
              {atrasados.map((a) => <Aviso key={a.id} aviso={a} nuevo={esNuevo(a, vistoAntes)} alAbrir={(x) => ir(x.enlace)} />)}
            </ul>
          </section>
        )}

        {datos && recientes.length > 0 && (
          <section className="av-grupo" aria-labelledby="av-titulo-recientes">
            <h3 id="av-titulo-recientes">{atrasados.length ? 'Recientes' : 'Por revisar'}</h3>
            <ul className="avisos-lista">
              {recientes.map((a) => <Aviso key={a.id} aviso={a} nuevo={esNuevo(a, vistoAntes)} alAbrir={(x) => ir(x.enlace)} />)}
            </ul>
          </section>
        )}

        {datos && visibles.length === 0 && (
          <div className="avisos-vacio av-vacio">
            <span aria-hidden="true"><IconoCampana /></span>
            <strong>{ningunTipo ? 'Desactivaste todos los avisos' : 'Todo al día'}</strong>
            <p>
              {ningunTipo ? 'Actívalos en Configuración para ver aquí los reportes y las verificaciones.'
                : 'No hay reportes ni solicitudes de verificación esperando revisión.'}
            </p>
          </div>
        )}

        <button type="button" className="av-config" onClick={() => { alCerrar(); abrirConfig() }}>
          Elegir qué avisos ver
        </button>
      </div>
    </dialog>
  )
}
