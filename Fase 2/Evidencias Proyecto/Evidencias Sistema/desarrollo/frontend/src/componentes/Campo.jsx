// Campo de formulario con su etiqueta y el mensaje de error que devuelve la API
export default function Campo({ etiqueta, nombre, error, ...props }) {
  return (
    <div className="campo">
      <label htmlFor={nombre}>{etiqueta}</label>
      <input
        id={nombre}
        name={nombre}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${nombre}-error` : undefined}
        {...props}
      />
      {error && (
        <p className="campo-error" id={`${nombre}-error`}>
          {error}
        </p>
      )}
    </div>
  )
}
