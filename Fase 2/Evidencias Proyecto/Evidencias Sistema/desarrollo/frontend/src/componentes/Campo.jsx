import { useState } from 'react'

// Íconos de ojo (abierto / tachado), decorativos: el botón ya tiene su texto accesible
const OjoAbierto = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const OjoTachado = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 8 10 8a17.6 17.6 0 0 1-2.16 3.19" />
    <path d="M6.6 6.6C3.9 8.4 2 12 2 12s3.5 8 10 8a9.7 9.7 0 0 0 5.4-1.6" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
)

// Campo de formulario con su etiqueta y el mensaje de error que devuelve la API.
// `id` es opcional: sirve cuando dos formularios en la misma página usan el mismo `nombre`.
// Los campos de contraseña traen un botón para mostrar u ocultar lo escrito.
// Con `opciones` ([{ valor, texto }]) se dibuja una lista desplegable, con `multilinea` un área de
// texto, y `ayuda` muestra una indicación bajo el campo
export default function Campo({
  etiqueta, nombre, id = nombre, error, ayuda, type, opciones, multilinea, ...props
}) {
  const [visible, setVisible] = useState(false)
  const esPassword = type === 'password'
  const descripciones = [ayuda && `${id}-ayuda`, error && `${id}-error`].filter(Boolean).join(' ')
  const comunes = {
    id,
    name: nombre,
    'aria-invalid': Boolean(error),
    'aria-describedby': descripciones || undefined,
  }

  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      <div className={esPassword ? 'campo-password' : undefined}>
        {opciones ? (
          <select {...comunes} {...props}>
            <option value="" disabled>Selecciona…</option>
            {opciones.map(({ valor, texto }) => (
              <option key={valor} value={valor}>{texto}</option>
            ))}
          </select>
        ) : multilinea ? (
          <textarea {...comunes} {...props} />
        ) : (
          <input {...comunes} type={esPassword && visible ? 'text' : type} {...props} />
        )}
        {esPassword && (
          <button
            type="button"
            className="ver-password"
            onClick={() => setVisible(!visible)}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={visible}
            aria-controls={id}
          >
            {visible ? <OjoTachado /> : <OjoAbierto />}
          </button>
        )}
      </div>
      {ayuda && (
        <p className="campo-ayuda" id={`${id}-ayuda`}>
          {ayuda}
        </p>
      )}
      {error && (
        <p className="campo-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  )
}
