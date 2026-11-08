import { useState } from 'react'
import { api } from '../../api.js'
import Campo from '../../componentes/Campo.jsx'
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
    <section className="reporte-accion a-cambiar-rol" aria-labelledby="titulo-rol">
      <h2 id="titulo-rol">Rol en RoomMatch</h2>
      <p className="a-rol-actual">Rol actual: <EtiquetaRol modo={modo} /></p>

      {!destino && (
        <>
          <p className="revision-sub">
            Cámbialo solo si es necesario, por ejemplo si quedó con el rol equivocado. Antes de aplicarlo verás qué cambiará.
          </p>
          <div className="acciones">
            {opciones.map((o) => (
              <button key={o.valor} type="button" className="a-boton" onClick={() => elegir(o.valor)}>
                Cambiar a {o.texto.toLowerCase()}
              </button>
            ))}
          </div>
        </>
      )}

      {destino && !resumen && !error && <p className="cargando" role="status">Revisando qué cambiaría…</p>}
      {destino && !resumen && error && (
        <>
          <p className="alerta" role="alert">{error}</p>
          <div className="acciones"><button type="button" className="a-boton" onClick={cancelar}>Volver</button></div>
        </>
      )}

      {destino && resumen?.con_convivencia && (
        <>
          <p className="alerta" role="alert">
            No se puede cambiar el rol mientras tenga una convivencia activa. Podrá cambiarse cuando la convivencia termine.
          </p>
          <div className="acciones"><button type="button" className="a-boton" onClick={cancelar}>Volver</button></div>
        </>
      )}

      {destino && resumen && !resumen.con_convivencia && (
        <form onSubmit={pedirConfirmacion} noValidate>
          <p className="revision-sub">Al pasar a <strong>{textoModo(destino).toLowerCase()}</strong>:</p>
          <ul className="a-consecuencias">
            {consecuencias(destino, resumen).map((t) => <li key={t}>{t}</li>)}
            <li>Se le enviará un aviso con la justificación.</li>
          </ul>
          <Campo etiqueta="Justificación" nombre="justificacion" id="rol-justificacion" multilinea rows={2} autoFocus
            value={justificacion} onChange={(e) => { setJustificacion(e.target.value); setError('') }}
            error={error} maxLength={MAX_JUSTIFICACION} required
            ayuda="La persona verá este motivo en su aviso." />
          <div className="acciones">
            <button type="button" className="a-boton" onClick={cancelar} disabled={enviando}>Cancelar</button>
            <button type="submit" className="a-boton primario" disabled={enviando}>Cambiar a {textoModo(destino).toLowerCase()}</button>
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
