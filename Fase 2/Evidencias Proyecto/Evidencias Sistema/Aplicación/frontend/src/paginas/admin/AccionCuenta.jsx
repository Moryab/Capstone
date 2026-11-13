import { useState } from 'react'
import { api } from '../../api.js'
import Confirmar from '../../componentes/Confirmar.jsx'
import { MAX_JUSTIFICACION } from '../../reportes.js'

/*
 * Acciones sobre la cuenta desde la ficha del usuario (HU-28): reactivar, advertir, quitar la
 * verificación, suspender o eliminar. Se elige una opción (de la más leve a la más grave), se escribe
 * la justificación, que queda registrada en las acciones de moderación, y se confirma. Advertir, quitar
 * la verificación y suspender también resuelven sus reportes abiertos y le avisan a la persona con el
 * motivo (CA-27.1). Reactivar exige justificación y queda registrada (CA-27.5)
 */
function accionesDe(perfil, n) {
  const estado = perfil.estado_cuenta
  const verificada = perfil.verificacion_estado === 'verificado'
  const advertencias = perfil.advertencias_recibidas ?? 0
  const opciones = [
    {
      valor: 'advertir', tono: 'espera', texto: 'Advertir',
      disponible: estado === 'activa',
      efecto: estado === 'activa'
        ? `Para faltas menores. Recibe un aviso con el motivo y su cuenta sigue igual. Sería su advertencia n.º ${advertencias + 1}.`
        : 'Solo se advierte a una cuenta activa.',
      boton: 'Enviar advertencia', pregunta: '¿Enviar una advertencia?', confirmar: 'Sí, advertir', ocupado: 'Enviando…',
      mensaje: `${n} recibirá un aviso con el motivo que escribiste.`,
      avisos: [`${n}: recibe la advertencia con tu justificación.`],
    },
    {
      valor: 'quitar_verificacion', tono: 'vino', texto: 'Quitar la verificación',
      disponible: verificada && estado !== 'eliminada',
      efecto: verificada
        ? 'Pierde la insignia de estudiante verificado y las funciones que la exigen. Puede volver a verificarse con un comprobante actualizado.'
        : 'No tiene una verificación vigente que quitar.',
      boton: 'Quitar verificación', pregunta: '¿Quitar la verificación?', confirmar: 'Sí, quitarla', ocupado: 'Quitando…',
      mensaje: `${n} dejará de aparecer como estudiante verificado.`,
      avisos: [`${n}: pierde su verificación y recibe tu justificación.`],
    },
    {
      valor: 'suspender', tono: 'error', texto: 'Suspender la cuenta',
      // Una eliminada también se suspende, para que no vuelva a registrarse con sus datos
      disponible: ['activa', 'eliminada'].includes(estado),
      efecto: estado === 'suspendida'
        ? 'La cuenta ya está suspendida.'
        : 'Para faltas graves. No podrá ingresar, sus publicaciones se ocultan y tampoco podrá crear otra cuenta con el mismo correo, RUT o teléfono. Se puede reactivar.',
      boton: 'Suspender cuenta', pregunta: '¿Suspender esta cuenta?', confirmar: 'Sí, suspender', ocupado: 'Suspendiendo…',
      mensaje: `${n} no podrá ingresar a RoomMatch ni registrarse otra vez con sus datos.`,
      avisos: [`${n}: su cuenta queda suspendida y recibe tu justificación.`, 'Sus publicaciones dejan de verse.'],
    },
    {
      valor: 'eliminar', tono: 'error', texto: 'Eliminar la cuenta',
      // Una suspendida no: eliminada podría volver a registrarse y se perdería el bloqueo
      disponible: estado === 'activa',
      efecto: estado === 'activa'
        ? 'Deja de aparecer junto con sus publicaciones y, si convive con alguien, la convivencia termina. Su historial se conserva: si vuelve con el mismo correo, lo recupera.'
        : estado === 'suspendida' ? 'Una cuenta suspendida no se elimina: perdería el bloqueo.' : 'La cuenta ya fue eliminada.',
      boton: 'Eliminar cuenta', pregunta: '¿Eliminar esta cuenta?', confirmar: 'Sí, eliminar', ocupado: 'Eliminando…',
      mensaje: `${n} ya no podrá ingresar a RoomMatch y sus publicaciones dejarán de mostrarse. Sus datos e historial se conservan.`,
      avisos: [`${n}: su cuenta se elimina.`, 'Si convive con alguien, esa persona queda libre.'],
    },
  ]
  if (estado === 'suspendida') {
    opciones.unshift({
      valor: 'reactivar', tono: 'ok', texto: 'Reactivar la cuenta', disponible: true,
      efecto: 'Vuelve a ingresar con normalidad. Sus publicaciones ocultas por la suspensión vuelven a verse.',
      boton: 'Reactivar cuenta', pregunta: '¿Reactivar esta cuenta?', confirmar: 'Sí, reactivar', ocupado: 'Reactivando…',
      mensaje: `${n} podrá volver a ingresar a RoomMatch.`, positiva: true,
      avisos: [`${n}: su cuenta vuelve a estar activa.`],
    })
  }
  return opciones
}

export default function AccionCuenta({ perfil, nombre, alTerminar, alEliminar }) {
  const opciones = accionesDe(perfil, nombre)
  const [accion, setAccion] = useState('')
  const [justificacion, setJustificacion] = useState('')
  const [error, setError] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  // Tras aplicar, la tarjeta muestra un check que se dibuja un momento
  const [hecho, setHecho] = useState('')

  const elegida = opciones.find((o) => o.valor === accion && o.disponible)
  const listo = Boolean(elegida && justificacion.trim())

  const pedirConfirmacion = (e) => {
    e.preventDefault()
    if (!elegida) return
    if (!justificacion.trim()) {
      setError('Escribe la justificación')
      return
    }
    setConfirmando(true)
  }

  const aplicar = async () => {
    setEnviando(true)
    try {
      const respuesta = await api(`/moderacion/usuarios/${perfil.id}/${elegida.valor}`, {
        metodo: 'POST', datos: { justificacion: justificacion.trim() },
      })
      setConfirmando(false)
      if (elegida.valor === 'eliminar') {
        alEliminar(`${respuesta.mensaje}.`)
        return
      }
      setAccion('')
      setJustificacion('')
      setHecho(respuesta.mensaje)
      setTimeout(() => setHecho(''), 2400)
      await alTerminar(`${respuesta.mensaje}.`)
    } catch (err) {
      setError(err.errores?.justificacion ?? err.message)
      setConfirmando(false)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="md-tarjeta md-decision du-acciones" noValidate aria-labelledby="du-titulo-acciones" onSubmit={pedirConfirmacion}>
      <h2 id="du-titulo-acciones">Moderar la cuenta</h2>
      <p className="md-decision-ayuda">De la más leve a la más grave. Cada acción queda registrada con tu justificación.</p>

      {hecho && (
        <div className="du-hecho" role="status">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M7 12.5l3.2 3.2L17 9" /></svg>
          <span>{hecho}</span>
        </div>
      )}

      <fieldset className="md-opciones">
        <legend className="visualmente-oculto">Acción sobre la cuenta</legend>
        {opciones.map((o) => (
          <label key={o.valor} className="md-opcion" data-tono={o.tono} data-elegida={accion === o.valor || undefined}
            data-bloqueada={!o.disponible || undefined}>
            <input type="radio" name="accion-cuenta" value={o.valor} checked={accion === o.valor} disabled={!o.disponible}
              onChange={() => { setAccion(o.valor); setError('') }} />
            <span className="md-opcion-texto">
              <strong>{o.texto}</strong>
              <span>{o.efecto}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {elegida && (
        <label className="md-campo du-aparecer">
          <span className="md-campo-etiqueta">Justificación</span>
          <textarea rows={3} value={justificacion} maxLength={MAX_JUSTIFICACION} autoFocus aria-invalid={Boolean(error) || undefined}
            onChange={(e) => { setJustificacion(e.target.value); setError('') }}
            placeholder={elegida.valor === 'reactivar'
              ? 'Ej.: aclaró la situación y se comprometió a respetar las normas.'
              : 'Ej.: publicó datos de contacto falsos después de una advertencia.'} />
          {error
            ? <span className="md-campo-pie du-error" role="alert">{error}</span>
            : <span className="md-campo-pie">Queda en el registro de moderación. {justificacion.length} de {MAX_JUSTIFICACION} caracteres.</span>}
        </label>
      )}

      {elegida && (
        <div className="md-avisos du-aparecer" role="status">
          <p className="md-avisos-titulo">Al aplicar</p>
          <ul>{elegida.avisos.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      )}

      <button type="submit" className="md-aplicar" data-tono={elegida && !elegida.positiva ? elegida.tono : undefined}
        disabled={!listo || enviando}>
        {enviando ? elegida?.ocupado : elegida ? elegida.boton : 'Elige una acción'}
      </button>
      <p className="md-aplicar-ayuda">
        {!elegida ? 'Primero elige qué hacer.'
          : !justificacion.trim() ? 'Escribe la justificación para continuar.' : 'Te pediremos confirmar antes de aplicarla.'}
      </p>

      {elegida && (
        <Confirmar abierto={confirmando} titulo={elegida.pregunta} mensaje={elegida.mensaje}
          textoConfirmar={elegida.confirmar} textoOcupado={elegida.ocupado} ocupado={enviando}
          tono={elegida.positiva ? '' : 'peligro'}
          onConfirmar={aplicar} onCancelar={() => setConfirmando(false)} />
      )}
    </form>
  )
}
