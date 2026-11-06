import { useState } from 'react'
import { api } from '../../api.js'
import Campo from '../../componentes/Campo.jsx'
import Confirmar from '../../componentes/Confirmar.jsx'
import { MAX_JUSTIFICACION } from '../../reportes.js'

// Eliminar una cuenta de estudiante desde su ficha (HU-28). Es una eliminación lógica: se conservan
// sus datos y su historial. Exige una justificación, que queda registrada en las acciones de moderación
export default function EliminarCuenta({ usuarioId, nombre, alEliminar }) {
  const [justificacion, setJustificacion] = useState('')
  const [error, setError] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const pedirConfirmacion = (e) => {
    e.preventDefault()
    if (!justificacion.trim()) {
      setError('Escribe la justificación')
      return
    }
    setConfirmando(true)
  }

  const eliminar = async () => {
    setEnviando(true)
    try {
      const respuesta = await api(`/moderacion/usuarios/${usuarioId}/eliminar`, {
        metodo: 'POST', datos: { justificacion },
      })
      await alEliminar(`${respuesta.mensaje}.`)
    } catch (err) {
      setError(err.errores?.justificacion ?? err.message)
      setConfirmando(false)
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={pedirConfirmacion} noValidate className="reporte-accion">
      <h2>Eliminar la cuenta</h2>
      <p className="revision-sub">
        La persona no podrá ingresar y dejará de aparecer para los demás estudiantes, junto con sus publicaciones.
        Si convive con alguien, la convivencia termina y esa persona queda libre. Sus convivencias, evaluaciones
        y reportes se conservan: si vuelve a registrarse con el mismo correo, recupera su historial.
      </p>
      <Campo etiqueta="Justificación" nombre="justificacion" id="eliminar-justificacion" multilinea rows={2}
        value={justificacion} onChange={(e) => { setJustificacion(e.target.value); setError('') }}
        error={error} maxLength={MAX_JUSTIFICACION} required />
      <div className="acciones">
        <button type="submit" className="boton peligro" disabled={enviando}>Eliminar cuenta</button>
      </div>
      <Confirmar
        abierto={confirmando}
        titulo="¿Eliminar esta cuenta?"
        mensaje={`${nombre} ya no podrá ingresar a RoomMatch y sus publicaciones dejarán de mostrarse. Sus datos e historial se conservan.`}
        textoConfirmar="Sí, eliminar"
        textoOcupado="Eliminando…"
        ocupado={enviando}
        onConfirmar={eliminar}
        onCancelar={() => setConfirmando(false)}
      />
    </form>
  )
}
