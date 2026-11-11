import { useState } from 'react'
import { api } from '../../api.js'
import Confirmar from '../../componentes/Confirmar.jsx'

// Deshace una revocación (CA-23.4): el estudiante vuelve a quedar verificado con la misma solicitud
// o el mismo correo institucional. Se usa en el detalle de la solicitud y en la ficha del usuario
export default function RestaurarVerificacion({ usuarioId, nombre, className = 'a-boton aprobar', alTerminar, alFallar }) {
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const restaurar = async () => {
    setEnviando(true)
    try {
      const respuesta = await api(`/verificacion/usuarios/${usuarioId}/restaurar`, { metodo: 'POST' })
      setConfirmando(false)
      await alTerminar(respuesta.mensaje)
    } catch (err) {
      setConfirmando(false)
      alFallar(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setConfirmando(true)} disabled={enviando}>
        Volver a verificar
      </button>
      <Confirmar abierto={confirmando} titulo="¿Volver a verificar a este estudiante?" ocupado={enviando}
        mensaje={`${nombre} volverá a mostrar la insignia de verificado y podrá recibir propuestas de match. Le avisaremos con una notificación.`}
        textoConfirmar="Sí, volver a verificar" textoOcupado="Verificando…" tono=""
        onConfirmar={restaurar} onCancelar={() => setConfirmando(false)} />
    </>
  )
}
