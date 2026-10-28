import { useEffect, useRef } from 'react'

// Ventana modal de confirmación. Usa <dialog>, que ya maneja el foco y la tecla Escape
export default function Confirmar({
  abierto, titulo, mensaje, textoConfirmar, textoOcupado = 'Procesando…', onConfirmar, onCancelar, ocupado,
}) {
  const dialogo = useRef(null)

  useEffect(() => {
    const d = dialogo.current
    if (abierto && !d.open) d.showModal()
    if (!abierto && d.open) d.close()
  }, [abierto])

  return (
    // onCancel: Escape cierra el diálogo y se avisa como una cancelación más
    <dialog ref={dialogo} className="confirmar" aria-labelledby="confirmar-titulo"
      onCancel={(e) => { e.preventDefault(); onCancelar() }}>
      <h2 id="confirmar-titulo">{titulo}</h2>
      <p>{mensaje}</p>
      <div className="acciones">
        <button type="button" className="boton secundario" onClick={onCancelar} disabled={ocupado}>
          Cancelar
        </button>
        <button type="button" className="boton peligro" onClick={onConfirmar} disabled={ocupado}>
          {ocupado ? textoOcupado : textoConfirmar}
        </button>
      </div>
    </dialog>
  )
}
