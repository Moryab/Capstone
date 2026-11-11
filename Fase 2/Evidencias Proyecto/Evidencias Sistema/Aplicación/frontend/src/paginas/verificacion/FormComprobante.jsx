import { useState } from 'react'
import { api } from '../../api.js'
import Campo from '../../componentes/Campo.jsx'
import { COMPROBANTE_MAX_MB, COMPROBANTE_TIPOS, SITUACIONES, tiposDe } from './datos.js'
import './verificacion.css'

const VACIO = { situacion: '', institucion_id: '', tipo_comprobante: '' }

/**
 * Formulario para acreditar la condición de estudiante (HU-21). Lo usan el paso obligatorio del
 * registro y la página «Verificar mi condición de estudiante». Primero pregunta la situación, porque
 * de ella dependen los documentos que sirven.
 *
 * Si el correo de la cuenta es institucional (`correoInstitucional`: { correo, institucion }), al
 * elegir «Ya estoy matriculado/a» no se pide documento: la cuenta se verifica con el correo.
 *
 * `alEnviar(respuesta)` se llama cuando la API aceptó el comprobante; `acciones` son los botones
 * que van junto a «Enviar».
 */
export default function FormComprobante({
  instituciones, institucionInicial = '', alEnviar, acciones, textoEnviar = 'Enviar solicitud',
  correoInstitucional = null, textoCorreo = 'Verificar con mi correo',
}) {
  const [datos, setDatos] = useState({ ...VACIO, institucion_id: institucionInicial })
  const [archivo, setArchivo] = useState(null)
  const [errores, setErrores] = useState({})
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)

  const tipos = tiposDe(datos.situacion)
  const conCorreo = Boolean(correoInstitucional) && datos.situacion === 'matriculado'

  const cambiar = (e) => {
    const { name, value } = e.target
    // Al cambiar de situación, el documento elegido puede dejar de servir; si hay uno solo, se elige solo
    const extra = name === 'situacion'
      ? { tipo_comprobante: tiposDe(value).length === 1 ? tiposDe(value)[0].valor : '' }
      : {}
    setDatos({ ...datos, [name]: value, ...extra })
    setErrores({ ...errores, [name]: undefined, ...(name === 'situacion' && { tipo_comprobante: undefined }) })
  }

  const elegirArchivo = (e) => {
    const elegido = e.target.files[0] ?? null
    setArchivo(elegido)
    // Se revisa al elegirlo para avisar al tiro; el backend vuelve a validar (CA-21.3)
    let error
    if (elegido && !COMPROBANTE_TIPOS.includes(elegido.type)) error = 'El archivo debe ser PDF, JPG o PNG'
    else if (elegido && elegido.size > COMPROBANTE_MAX_MB * 1024 * 1024) {
      error = `El archivo debe pesar como máximo ${COMPROBANTE_MAX_MB} MB`
    }
    setErrores({ ...errores, comprobante: error })
  }

  const verificarConCorreo = async () => {
    setEnviando(true)
    setMensaje('')
    try {
      const respuesta = await api('/verificacion/correo', { metodo: 'POST' })
      await alEnviar(respuesta)
    } catch (err) {
      setMensaje(err.message)
      setEnviando(false)
    }
  }

  const enviar = async (e) => {
    e.preventDefault()
    if (conCorreo) return verificarConCorreo()
    const faltan = {
      ...(!datos.situacion && { situacion: 'Cuéntanos en qué situación estás' }),
      ...(!datos.institucion_id && { institucion_id: 'Este campo es obligatorio' }),
      ...(!datos.tipo_comprobante && { tipo_comprobante: 'Este campo es obligatorio' }),
      ...(!archivo && { comprobante: 'Adjunta tu documento' }),
    }
    if (Object.keys(faltan).length || errores.comprobante) {
      setErrores({ ...faltan, ...(errores.comprobante && { comprobante: errores.comprobante }) })
      setMensaje('Revisa los campos marcados')
      return
    }

    const formulario = new FormData()
    Object.entries(datos).forEach(([clave, valor]) => formulario.append(clave, valor))
    formulario.append('comprobante', archivo)

    setEnviando(true)
    setMensaje('')
    try {
      const respuesta = await api('/verificacion', { metodo: 'POST', datos: formulario })
      await alEnviar(respuesta)
    } catch (err) {
      // CA-21.3: formato o tamaño no permitidos; 409 si ya hay una solicitud pendiente
      setErrores(err.errores ?? {})
      setMensaje(err.errores ? 'Revisa los campos marcados' : err.message)
      setEnviando(false)
    }
  }

  const opcionesInstitucion = instituciones.map((i) => ({ valor: i.id, texto: `${i.nombre} (${i.sigla})` }))

  return (
    <form onSubmit={enviar} noValidate>
      <fieldset className="v-situacion" aria-describedby={errores.situacion ? 'situacion-error' : undefined}>
        <legend>¿En qué situación estás?</legend>
        <div className="v-opciones">
          {SITUACIONES.map(({ valor, texto, ayuda }) => (
            <label key={valor} className={`v-opcion${datos.situacion === valor ? ' elegida' : ''}`}>
              <input type="radio" name="situacion" value={valor} checked={datos.situacion === valor}
                onChange={cambiar} />
              <span>
                <strong>{texto}</strong>
                <small>{ayuda}</small>
              </span>
            </label>
          ))}
        </div>
        {errores.situacion && <p className="campo-error" id="situacion-error">{errores.situacion}</p>}
      </fieldset>

      {conCorreo && (
        <p className="exito v-correo">
          Te registraste con <strong>{correoInstitucional.correo}</strong>, un correo
          de <strong>{correoInstitucional.institucion}</strong>. No necesitas subir ningún documento:
          tu cuenta quedará verificada al instante.
        </p>
      )}

      {datos.situacion && !conCorreo && (
        <fieldset>
          <legend>Tu documento</legend>
          <Campo etiqueta="Institución" nombre="institucion_id" value={datos.institucion_id}
            onChange={cambiar} error={errores.institucion_id} opciones={opcionesInstitucion} required />
          <Campo etiqueta="Tipo de documento" nombre="tipo_comprobante" value={datos.tipo_comprobante}
            onChange={cambiar} error={errores.tipo_comprobante} opciones={tipos} required />
          <Campo etiqueta="Archivo" nombre="comprobante" type="file" onChange={elegirArchivo}
            error={errores.comprobante} accept={COMPROBANTE_TIPOS.join(',')} required
            ayuda={`PDF, JPG o PNG de hasta ${COMPROBANTE_MAX_MB} MB. Solo tú y los administradores pueden verlo.`} />
        </fieldset>
      )}

      {mensaje && <p className="alerta" role="alert">{mensaje}</p>}

      <div className="acciones">
        {acciones}
        <button type="submit" className="boton" disabled={enviando}>
          {enviando ? (conCorreo ? 'Verificando…' : 'Enviando…') : (conCorreo ? textoCorreo : textoEnviar)}
        </button>
      </div>
    </form>
  )
}
