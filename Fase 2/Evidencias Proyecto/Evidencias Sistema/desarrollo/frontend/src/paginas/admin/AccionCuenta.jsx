import { useState } from 'react'
import { api } from '../../api.js'
import Campo from '../../componentes/Campo.jsx'
import Confirmar from '../../componentes/Confirmar.jsx'
import { MAX_JUSTIFICACION } from '../../reportes.js'

// Acciones sobre la cuenta desde la ficha del usuario (HU-28): suspender o eliminar. Exigen una
// justificación, que queda registrada en las acciones de moderación, y una confirmación
const ACCIONES = {
  suspender: {
    titulo: 'Suspender la cuenta',
    descripcion: 'Para faltas graves. La persona no podrá ingresar y sus publicaciones se ocultan. Como su registro '
      + 'se mantiene, tampoco podrá crear otra cuenta con el mismo correo, RUT o teléfono. Se puede reactivar.',
    boton: 'Suspender cuenta',
    confirmar: 'Sí, suspender',
    ocupado: 'Suspendiendo…',
    pregunta: '¿Suspender esta cuenta?',
    mensaje: (nombre) => `${nombre} no podrá ingresar a RoomMatch ni registrarse otra vez con sus datos.`,
  },
  eliminar: {
    titulo: 'Eliminar la cuenta',
    descripcion: 'La persona no podrá ingresar y dejará de aparecer para los demás estudiantes, junto con sus '
      + 'publicaciones. Si convive con alguien, la convivencia termina y esa persona queda libre. Sus convivencias, '
      + 'evaluaciones y reportes se conservan: si vuelve a registrarse con el mismo correo, recupera su historial.',
    boton: 'Eliminar cuenta',
    confirmar: 'Sí, eliminar',
    ocupado: 'Eliminando…',
    pregunta: '¿Eliminar esta cuenta?',
    mensaje: (nombre) => `${nombre} ya no podrá ingresar a RoomMatch y sus publicaciones dejarán de mostrarse. `
      + 'Sus datos e historial se conservan.',
  },
}

export default function AccionCuenta({ accion, usuarioId, nombre, alTerminar }) {
  const textos = ACCIONES[accion]
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

  const aplicar = async () => {
    setEnviando(true)
    try {
      const respuesta = await api(`/moderacion/usuarios/${usuarioId}/${accion}`, {
        metodo: 'POST', datos: { justificacion },
      })
      await alTerminar(`${respuesta.mensaje}.`)
    } catch (err) {
      setError(err.errores?.justificacion ?? err.message)
      setConfirmando(false)
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={pedirConfirmacion} noValidate className="reporte-accion">
      <h2>{textos.titulo}</h2>
      <p className="revision-sub">{textos.descripcion}</p>
      <Campo etiqueta="Justificación" nombre="justificacion" id={`${accion}-justificacion`} multilinea rows={2}
        value={justificacion} onChange={(e) => { setJustificacion(e.target.value); setError('') }}
        error={error} maxLength={MAX_JUSTIFICACION} required />
      <div className="acciones">
        <button type="submit" className="boton peligro" disabled={enviando}>{textos.boton}</button>
      </div>
      <Confirmar
        abierto={confirmando}
        titulo={textos.pregunta}
        mensaje={textos.mensaje(nombre)}
        textoConfirmar={textos.confirmar}
        textoOcupado={textos.ocupado}
        ocupado={enviando}
        onConfirmar={aplicar}
        onCancelar={() => setConfirmando(false)}
      />
    </form>
  )
}
