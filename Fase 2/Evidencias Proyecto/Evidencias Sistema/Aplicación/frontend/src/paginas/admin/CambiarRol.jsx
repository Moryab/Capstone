import { useState } from 'react'
import { api } from '../../api.js'
import Confirmar from '../../componentes/Confirmar.jsx'
import { MAX_JUSTIFICACION } from '../../reportes.js'
import { MODOS, textoModo } from './datos.js'
import { EtiquetaRol } from './ui/componentes.jsx'

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`
const cerraran = (n, sufijo) => `Se ${n === 1 ? 'cerrará 1 propuesta de match abierta' : `cerrarán ${n} propuestas de match abiertas`} ${sufijo}.`

// Qué pasará al cambiar el rol, con lo que devuelve GET /admin/usuarios/{id}/rol (modos.py)
function consecuencias(destino, r) {
  if (destino === 'buscador') {
    return [
      r.publicaciones_activas > 0 && `${plural(r.publicaciones_activas, 'publicación activa quedará', 'publicaciones activas quedarán')} pausada${r.publicaciones_activas === 1 ? '' : 's'}.`,
      r.propuestas_como_oferente > 0 && cerraran(r.propuestas_como_oferente, 'sobre sus publicaciones'),
      'Su búsqueda queda apagada hasta que la active con sus preferencias.',
    ].filter(Boolean)
  }
  return [
    r.buscando && 'Su búsqueda de alojamiento se pausará.',
    r.propuestas_como_buscador > 0 && cerraran(r.propuestas_como_buscador, 'como buscador'),
    r.publicaciones_pausadas > 0 && `Al entrar se le preguntará si ${r.publicaciones_pausadas === 1 ? 'su publicación pausada sigue disponible' : `sus ${r.publicaciones_pausadas} publicaciones pausadas siguen disponibles`}.`,
    'Podrá publicar alojamientos.',
  ].filter(Boolean)
}

/**
 * Cambiar el rol buscador/oferente de un estudiante desde su ficha, por ejemplo si quedó en el
 * equivocado. Antes de aplicarlo muestra qué cambiará; exige justificación (queda registrada como
 * acción de moderación) y una confirmación. Al estudiante le llega un aviso.
 */
export default function CambiarRol({ usuarioId, nombre, modo, alTerminar }) {
  const [destino, setDestino] = useState(null)
  const [resumen, setResumen] = useState(null)
  const [justificacion, setJustificacion] = useState('')
  const [error, setError] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const opciones = MODOS.filter((m) => m.valor !== modo)

  const elegir = async (valor) => {
    setDestino(valor)
    setResumen(null)
    setError('')
    try {
      setResumen(await api(`/admin/usuarios/${usuarioId}/rol`))
    } catch (err) {
      setError(err.message)
    }
  }

  const cancelar = () => {
    setDestino(null)
    setResumen(null)
    setJustificacion('')
    setError('')
  }

  const pedirConfirmacion = (e) => {
    e.preventDefault()
    if (!justificacion.trim()) {
      setError('Escribe la justificación')
      return
    }
    setConfirmando(true)
  }

  const aplicar = async () => {
    setEnviando(true)
    try {
      const respuesta = await api(`/admin/usuarios/${usuarioId}/rol`, { metodo: 'PUT', datos: { modo: destino, justificacion } })
      cancelar()
      setConfirmando(false)
      await alTerminar(`${respuesta.mensaje}.`)
    } catch (err) {
      setError(err.errores?.justificacion ?? err.message)
      setConfirmando(false)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="md-tarjeta du-rol" aria-labelledby="titulo-rol">
      <div className="du-tarjeta-cabeza">
        <p className="md-rotulo" id="titulo-rol">Rol en RoomMatch</p>
        <EtiquetaRol modo={modo} />
      </div>

      {!destino && (
        <>
          <p className="md-decision-ayuda du-sin-margen">
            Cámbialo solo si es necesario, por ejemplo si quedó con el rol equivocado. Antes de aplicarlo verás qué cambiará.
          </p>
          <div className="md-enlaces">
            {opciones.map((o) => (
              <button key={o.valor} type="button" className="md-enlace du-rol-boton" onClick={() => elegir(o.valor)}>
                Cambiar a {o.texto.toLowerCase()}
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            ))}
          </div>
        </>
      )}

      {destino && !resumen && !error && (
        <div className="du-silueta-bloque" role="status" aria-label="Revisando qué cambiaría">
          <span /><span /><span />
        </div>
      )}
      {destino && !resumen && error && (
        <>
          <p className="dv-alerta du-alerta-error" role="alert">{error}</p>
          <div className="md-enlaces"><button type="button" className="md-enlace" onClick={cancelar}>Volver</button></div>
        </>
      )}

      {destino && resumen?.con_convivencia && (
        <>
          <p className="dv-alerta" role="alert">
            No se puede cambiar el rol mientras tenga una convivencia activa. Podrá cambiarse cuando la convivencia termine.
          </p>
          <div className="md-enlaces"><button type="button" className="md-enlace" onClick={cancelar}>Volver</button></div>
        </>
      )}

      {destino && resumen && !resumen.con_convivencia && (
        <form className="du-rol-form du-aparecer" onSubmit={pedirConfirmacion} noValidate>
          <div className="md-avisos">
            <p className="md-avisos-titulo">Al pasar a {textoModo(destino).toLowerCase()}</p>
            <ul>
              {consecuencias(destino, resumen).map((t) => <li key={t}>{t}</li>)}
              <li>Se le enviará un aviso con la justificación.</li>
            </ul>
          </div>
          <label className="md-campo">
            <span className="md-campo-etiqueta">Justificación</span>
            <textarea rows={3} value={justificacion} maxLength={MAX_JUSTIFICACION} autoFocus aria-invalid={Boolean(error) || undefined}
              onChange={(e) => { setJustificacion(e.target.value); setError('') }}
              placeholder="Ej.: se registró como buscador, pero arrienda una pieza." />
            {error
              ? <span className="md-campo-pie du-error" role="alert">{error}</span>
              : <span className="md-campo-pie">La persona verá este motivo en su aviso.</span>}
          </label>
          <div className="dv-botones">
            <button type="button" className="md-enlace" onClick={cancelar} disabled={enviando}>Cancelar</button>
            <button type="submit" className="md-aplicar" disabled={enviando || !justificacion.trim()}>
              {enviando ? 'Cambiando…' : `Cambiar a ${textoModo(destino).toLowerCase()}`}
            </button>
          </div>
          <Confirmar abierto={confirmando} titulo={`¿Cambiar a ${textoModo(destino).toLowerCase()}?`} tono=""
            mensaje={`${nombre} pasará a ser ${textoModo(destino).toLowerCase()}. ${consecuencias(destino, resumen)[0]}`}
            textoConfirmar="Sí, cambiar rol" textoOcupado="Cambiando…" ocupado={enviando}
            onConfirmar={aplicar} onCancelar={() => setConfirmando(false)} />
        </form>
      )}
    </section>
  )
}
