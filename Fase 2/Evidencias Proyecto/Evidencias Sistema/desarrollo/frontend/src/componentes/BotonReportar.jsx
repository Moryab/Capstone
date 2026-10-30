import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { MAX_DESCRIPCION, MOTIVOS_PERFIL } from '../reportes.js'
import Campo from './Campo.jsx'
import './reportar.css'

const VACIO = { motivo: '', descripcion: '' }

/**
 * EP-06 · HU-24 y HU-25 (y CA-16.5): botón «Reportar perfil» o «Reportar publicación».
 * Ya está puesto en el perfil de otro estudiante (tipo="perfil") y en el detalle de un
 * alojamiento ajeno (tipo="publicacion"); nunca aparece en lo propio (CA-24.5 y CA-25.5).
 * El reporte de publicaciones (HU-25) aún no está implementado: con ese tipo no muestra nada.
 *
 * Props: tipo ('perfil' | 'publicacion'), id (del usuario o la publicación) y nombre (para el texto).
 */
export default function BotonReportar({ tipo, id, nombre }) {
  const dialogo = useRef(null)
  const [abierto, setAbierto] = useState(false)
  const [datos, setDatos] = useState(VACIO)
  const [errores, setErrores] = useState({})
  const [mensaje, setMensaje] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    const d = dialogo.current
    if (!d) return
    if (abierto && !d.open) d.showModal()
    if (!abierto && d.open) d.close()
  }, [abierto])

  if (tipo !== 'perfil') return null

  const cerrar = () => {
    setAbierto(false)
    setDatos(VACIO)
    setErrores({})
    setMensaje('')
    setConfirmacion('')
  }

  const cambiar = (e) => {
    setDatos({ ...datos, [e.target.name]: e.target.value })
    setErrores({ ...errores, [e.target.name]: undefined })
  }

  const enviar = async (e) => {
    e.preventDefault()
    // CA-24.3: se indica qué falta sin enviar; el backend vuelve a validar
    const faltan = {
      ...(!datos.motivo && { motivo: 'Elige un motivo' }),
      ...(datos.motivo === 'otro' && !datos.descripcion.trim() && { descripcion: 'Cuéntanos qué ocurrió' }),
    }
    if (Object.keys(faltan).length) {
      setErrores(faltan)
      return
    }

    setEnviando(true)
    setMensaje('')
    try {
      const respuesta = await api(`/reportes/perfiles/${id}`, { metodo: 'POST', datos })
      setConfirmacion(`${respuesta.mensaje}.`) // CA-24.2
    } catch (err) {
      // 422 datos inválidos; 409 si ya hay un reporte abierto sobre este perfil (CA-24.4)
      setErrores(err.errores ?? {})
      setMensaje(err.errores ? 'Revisa los campos marcados' : err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <button type="button" className="boton peligro-suave" onClick={() => setAbierto(true)}>
        Reportar perfil
      </button>

      {/* onCancel: Escape cierra el diálogo y limpia el formulario */}
      <dialog ref={dialogo} className="confirmar reportar" aria-labelledby="reportar-titulo"
        onCancel={(e) => { e.preventDefault(); cerrar() }}>
        <h2 id="reportar-titulo">Reportar perfil de {nombre}</h2>

        {confirmacion ? (
          <>
            <p className="exito" role="status">{confirmacion}</p>
            <p>Tu identidad no se le mostrará a la persona reportada.</p>
            <div className="acciones">
              <button type="button" className="boton" onClick={cerrar}>Cerrar</button>
            </div>
          </>
        ) : (
          <form onSubmit={enviar} noValidate>
            <p>{nombre} no sabrá quién envió este reporte.</p>
            <Campo etiqueta="Motivo" nombre="motivo" id="reporte-motivo" value={datos.motivo} onChange={cambiar}
              error={errores.motivo} opciones={MOTIVOS_PERFIL} required />
            <Campo etiqueta={datos.motivo === 'otro' ? 'Descripción' : 'Descripción (opcional)'}
              nombre="descripcion" id="reporte-descripcion" multilinea rows={4} value={datos.descripcion}
              onChange={cambiar} error={errores.descripcion} maxLength={MAX_DESCRIPCION}
              required={datos.motivo === 'otro'}
              ayuda={`${datos.descripcion.length}/${MAX_DESCRIPCION} caracteres`} />
            {mensaje && <p className="alerta" role="alert">{mensaje}</p>}
            <div className="acciones">
              <button type="button" className="boton secundario" onClick={cerrar} disabled={enviando}>
                Cancelar
              </button>
              <button type="submit" className="boton peligro" disabled={enviando}>
                {enviando ? 'Enviando…' : 'Enviar reporte'}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  )
}
