import { useState } from 'react'
import { api } from '../../api.js'
import Campo from '../../componentes/Campo.jsx'
import Confirmar from '../../componentes/Confirmar.jsx'
import { MAX_JUSTIFICACION } from '../../reportes.js'

// Acciones sobre la cuenta desde la ficha del usuario (HU-28): advertir, quitar la verificación,
// suspender o eliminar. Exigen una justificación, que queda registrada en las acciones de moderación,
// y una confirmación. Las de advertir, quitar la verificación y suspender también resuelven sus
// reportes abiertos y le avisan a la persona con el motivo (CA-27.1)
const ACCIONES = {
  advertir: {
    leve: true,
    titulo: 'Advertir',
    descripcion: 'Para faltas menores. La persona recibe un aviso con el motivo y la advertencia suma a su historial. '
      + 'Su cuenta sigue funcionando con normalidad.',
    boton: 'Enviar advertencia',
    confirmar: 'Sí, advertir',
    ocupado: 'Enviando…',
    pregunta: '¿Enviar una advertencia?',
    mensaje: (nombre) => `${nombre} recibirá un aviso con el motivo que escribiste.`,
  },
  quitar_verificacion: {
    titulo: 'Quitar la verificación',
    descripcion: 'Su perfil deja de mostrarse como estudiante verificado y pierde las funciones que lo exigen. '
      + 'Recibe el motivo y puede volver a verificarse con un comprobante actualizado.',
    boton: 'Quitar verificación',
    confirmar: 'Sí, quitarla',
    ocupado: 'Quitando…',
    pregunta: '¿Quitar la verificación?',
    mensaje: (nombre) => `${nombre} dejará de aparecer como estudiante verificado.`,
  },
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
      // Advertir puede repetirse: el formulario sigue en la ficha y queda listo para otra vez
      setJustificacion('')
      setConfirmando(false)
      setEnviando(false)
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
        <button type="submit" className={textos.leve ? 'boton' : 'boton peligro'} disabled={enviando}>{textos.boton}</button>
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
