import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useSesion } from '../sesion/SesionContext.jsx'
import { IconoBuscador, IconoOferente } from './iconos.jsx'
import './rol.css'

/**
 * Cambio de rol buscador ↔ oferente (modos.py en la API). El Marco pone el proveedor; cualquier
 * página con el marco abre el modal con `useCambioRol().abrir()`.
 */
const CambioRolContext = createContext({ abrir: () => {} })
export const useCambioRol = () => useContext(CambioRolContext)

export const NOMBRES_ROL = { buscador: 'Busco dónde vivir', oferente: 'Tengo un espacio' }
export const SIN_CAMBIO_CON_CONVIVENCIA = 'Puedes cambiar de rol cuando termines tu convivencia actual'

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`

// Qué pasa al cambiar, con los números reales de la persona (GET /perfil/modo)
function consecuencias(destino, r) {
  if (destino === 'oferente') {
    return [
      r.buscando ? 'Tu búsqueda de alojamiento se pausa.' : 'Dejas de recibir propuestas de alojamientos.',
      r.propuestas_como_buscador > 0
        ? `${plural(r.propuestas_como_buscador, 'propuesta pendiente', 'propuestas pendientes')} donde buscas alojamiento ${r.propuestas_como_buscador === 1 ? 'se cierra' : 'se cierran'}.`
        : 'No tienes propuestas pendientes como buscador.',
      r.publicaciones_pausadas > 0
        && `${plural(r.publicaciones_pausadas, 'publicación pausada vuelve', 'publicaciones pausadas vuelven')} a estar ${r.publicaciones_pausadas === 1 ? 'visible' : 'visibles'}.`,
      'Después te llevamos a publicar tu alojamiento.',
    ].filter(Boolean)
  }
  return [
    r.publicaciones_activas > 0
      ? `${plural(r.publicaciones_activas, 'publicación activa pasa', 'publicaciones activas pasan')} a «pausada»: nadie ${r.publicaciones_activas === 1 ? 'la' : 'las'} verá hasta que vuelvas a ofrecer un espacio.`
      : 'No tienes publicaciones activas que pausar.',
    r.propuestas_como_oferente > 0
      ? `${plural(r.propuestas_como_oferente, 'propuesta pendiente', 'propuestas pendientes')} para tus alojamientos ${r.propuestas_como_oferente === 1 ? 'se cierra' : 'se cierran'}.`
      : 'No tienes propuestas pendientes para tus alojamientos.',
    'Después eliges tu presupuesto y comuna para empezar a buscar.',
  ]
}

/** Modal de confirmación. Usa <dialog>, que ya maneja el foco, Escape y el fondo. */
function ModalCambioRol({ destino, alCerrar }) {
  const { recargarUsuario } = useSesion()
  const navegar = useNavigate()
  const dialogo = useRef(null)
  const [resumen, setResumen] = useState(null)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!destino) return undefined
    const d = dialogo.current
    if (!d.open) d.showModal()
    let vigente = true
    setResumen(null)
    setError('')
    api('/perfil/modo')
      .then((r) => vigente && setResumen(r))
      .catch((err) => vigente && setError(err.message))
    return () => {
      vigente = false
    }
  }, [destino])

  useEffect(() => {
    if (!destino && dialogo.current?.open) dialogo.current.close()
  }, [destino])

  const confirmar = async () => {
    setEnviando(true)
    setError('')
    try {
      await api('/perfil/modo', { metodo: 'PUT', datos: { modo: destino } })
      await recargarUsuario()
      alCerrar()
      if (destino === 'oferente') navegar('/publicaciones/nueva', { state: { cambioRol: true } })
      else navegar('/', { state: { preguntar: true } }) // el inicio abre «¿Qué estás buscando?»
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  const bloqueado = resumen?.con_convivencia
  const Desde = destino === 'oferente' ? IconoBuscador : IconoOferente
  const Hacia = destino === 'oferente' ? IconoOferente : IconoBuscador

  return (
    <dialog ref={dialogo} className="r-modal" aria-labelledby="r-modal-titulo" aria-describedby="r-modal-texto"
      onClose={alCerrar} onClick={(e) => e.target === dialogo.current && !enviando && alCerrar()}>
      {destino && (
        <div className="r-modal-cuerpo">
          <div className="r-modal-roles" aria-hidden="true">
            <span className="r-modal-rol"><Desde /></span>
            <svg className="r-modal-flecha" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            <span className="r-modal-rol destino"><Hacia /></span>
          </div>
          <h2 id="r-modal-titulo">¿Cambiar a «{NOMBRES_ROL[destino]}»?</h2>
          <p id="r-modal-texto" className="r-modal-texto">
            {destino === 'oferente'
              ? 'Ofrecerás un espacio y RoomMatch te propondrá estudiantes compatibles que buscan dónde vivir.'
              : 'Buscarás dónde vivir y RoomMatch te propondrá alojamientos de estudiantes compatibles contigo.'}
          </p>

          {bloqueado ? (
            <p className="r-modal-aviso" role="alert">{SIN_CAMBIO_CON_CONVIVENCIA}.</p>
          ) : resumen ? (
            <ul className="r-modal-lista" aria-label="Qué cambia">
              {consecuencias(destino, resumen).map((t) => <li key={t}>{t}</li>)}
            </ul>
          ) : !error && (
            <p className="r-modal-cargando" role="status">Revisando tus propuestas y publicaciones…</p>
          )}

          {error && <p className="r-modal-aviso" role="alert">{error}</p>}

          <div className="r-modal-acciones">
            <button type="button" className="r-boton secundario" onClick={alCerrar} disabled={enviando}>
              {bloqueado ? 'Entendido' : 'Cancelar'}
            </button>
            {!bloqueado && (
              <button type="button" className="r-boton" onClick={confirmar} disabled={enviando || !resumen}>
                {enviando ? 'Cambiando…' : `Sí, cambiar de rol`}
              </button>
            )}
          </div>
        </div>
      )}
    </dialog>
  )
}

export function CambioRolProvider({ children }) {
  const [destino, setDestino] = useState(null)
  const abrir = useCallback((hacia) => setDestino(hacia), [])
  return (
    <CambioRolContext.Provider value={{ abrir }}>
      {children}
      <ModalCambioRol destino={destino} alCerrar={() => setDestino(null)} />
    </CambioRolContext.Provider>
  )
}

/**
 * Enlace discreto para pasar al otro rol, dentro de la tarjeta del inicio. Con una convivencia
 * activa queda deshabilitado y explica por qué (la API lo vuelve a revisar).
 */
export function EnlaceCambioRol({ claro = false }) {
  const { usuario } = useSesion()
  const { abrir } = useCambioRol()
  const idMotivo = useId()
  const destino = usuario.modo === 'buscador' ? 'oferente' : 'buscador'
  const pregunta = destino === 'oferente' ? '¿Ahora tienes un espacio para ofrecer?' : '¿Ahora buscas dónde vivir?'

  if (usuario.con_convivencia) {
    return (
      <p className={`r-enlace bloqueado${claro ? ' claro' : ''}`}>
        <button type="button" disabled aria-describedby={idMotivo}>Cambiar a {destino}</button>
        <span id={idMotivo}>{SIN_CAMBIO_CON_CONVIVENCIA}.</span>
      </p>
    )
  }
  return (
    <p className={`r-enlace${claro ? ' claro' : ''}`}>
      {pregunta}{' '}
      <button type="button" onClick={() => abrir(destino)} aria-haspopup="dialog">Cambiar a {destino}</button>
    </p>
  )
}
