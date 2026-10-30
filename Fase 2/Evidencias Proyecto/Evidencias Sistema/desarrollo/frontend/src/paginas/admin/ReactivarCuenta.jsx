import { useState } from 'react'
import { api } from '../../api.js'
import Campo from '../../componentes/Campo.jsx'
import { MAX_JUSTIFICACION } from '../../reportes.js'

// CA-27.5: la reactivación también exige una justificación y queda registrada.
// Se usa en el reporte con que se suspendió la cuenta y en la ficha del usuario (HU-28)
export default function ReactivarCuenta({ usuarioId, alTerminar }) {
  const [justificacion, setJustificacion] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const reactivar = async (e) => {
    e.preventDefault()
    if (!justificacion.trim()) {
      setError('Escribe la justificación')
      return
    }
    setEnviando(true)
    try {
      const respuesta = await api(`/moderacion/usuarios/${usuarioId}/reactivar`, {
        metodo: 'POST', datos: { justificacion },
      })
      await alTerminar(`${respuesta.mensaje}.`)
    } catch (err) {
      setError(err.errores?.justificacion ?? err.message)
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={reactivar} noValidate className="reporte-accion">
      <h2>Reactivar la cuenta</h2>
      <Campo etiqueta="Justificación" nombre="justificacion" id="reactivar-justificacion" multilinea rows={2}
        value={justificacion} onChange={(e) => { setJustificacion(e.target.value); setError('') }}
        error={error} maxLength={MAX_JUSTIFICACION} required />
      <div className="acciones">
        <button type="submit" className="boton" disabled={enviando}>
          {enviando ? 'Reactivando…' : 'Reactivar cuenta'}
        </button>
      </div>
    </form>
  )
}
