// HU-19: selector de razones de la incompatibilidad, con la gravedad de cada una. Lo usan la
// pantalla de razones (al evaluar) y la de terminar la convivencia

// CA-19.1: las categorías del cuestionario, más gastos, comunicación u otra (modelo de datos)
export const RAZONES = [
  { valor: 'horario_sueno', texto: 'Horario de sueño' },
  { valor: 'horario_estudio', texto: 'Horario de estudio' },
  { valor: 'orden_limpieza', texto: 'Orden y limpieza' },
  { valor: 'ruido', texto: 'Ruido' },
  { valor: 'visitas', texto: 'Visitas' },
  { valor: 'fumar', texto: 'Fumar' },
  { valor: 'mascotas', texto: 'Mascotas' },
  { valor: 'gastos', texto: 'Gastos y pagos' },
  { valor: 'comunicacion', texto: 'Comunicación' },
  { valor: 'otra', texto: 'Otra' },
]
export const GRAVEDADES = [
  { valor: 'leve', texto: 'Leve' },
  { valor: 'moderada', texto: 'Moderada' },
  { valor: 'grave', texto: 'Grave' },
]
const MAX_DETALLE = 300

export const textoDe = (lista, valor) => lista.find((o) => o.valor === valor)?.texto ?? valor

// Lo que se envía al backend a partir de lo elegido ({razón: gravedad})
export const aRazones = (elegidas, detalle) => ({
  razones: Object.entries(elegidas).map(([razon, gravedad]) => ({ razon, gravedad })),
  razon_otra_detalle: elegidas.otra ? detalle : null,
})

// CA-19.2: mismos mensajes que el backend, sin esperar la respuesta
export function erroresRazones(elegidas, detalle) {
  if (!Object.keys(elegidas).length) return { razones: 'Elige al menos una razón' }
  if (elegidas.otra && !detalle.trim()) return { razon_otra_detalle: 'Cuéntanos cuál fue la otra razón' }
  return null
}

export default function SelectorRazones({ elegidas, setElegidas, detalle, setDetalle, errores, alCambiar }) {
  const alternar = (razon) => {
    setElegidas(({ [razon]: actual, ...resto }) => (actual ? resto : { ...resto, [razon]: 'moderada' }))
    alCambiar()
  }

  return (
    <>
      <fieldset aria-describedby={errores.razones ? 'error-razones' : undefined}>
        <legend>¿Qué no funcionó? Elige una o más razones</legend>
        <ul className="razones-lista">
          {RAZONES.map(({ valor, texto }) => {
            const gravedad = elegidas[valor]
            return (
              <li key={valor} className={`razon${gravedad ? ' elegida' : ''}`}>
                <label className="razon-nombre">
                  <input type="checkbox" checked={Boolean(gravedad)} onChange={() => alternar(valor)} />
                  {texto}
                </label>
                {gravedad && (
                  <div className="razon-gravedad" role="radiogroup" aria-label={`Qué tan grave fue: ${texto}`}>
                    {GRAVEDADES.map((g) => (
                      <label key={g.valor} className={gravedad === g.valor ? 'elegida' : undefined}>
                        <input type="radio" name={`gravedad-${valor}`} checked={gravedad === g.valor}
                          onChange={() => setElegidas((e) => ({ ...e, [valor]: g.valor }))} />
                        {g.texto}
                      </label>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        {errores.razones && <p id="error-razones" className="campo-error">{errores.razones}</p>}
      </fieldset>

      {elegidas.otra && (
        <div className="campo">
          <label htmlFor="detalle-otra">¿Cuál fue la otra razón?</label>
          <textarea id="detalle-otra" rows={3} maxLength={MAX_DETALLE} value={detalle}
            onChange={(e) => {
              setDetalle(e.target.value)
              alCambiar()
            }} />
          <p className="campo-ayuda">{detalle.length} de {MAX_DETALLE} caracteres</p>
          {errores.razon_otra_detalle && <p className="campo-error">{errores.razon_otra_detalle}</p>}
        </div>
      )}
    </>
  )
}
