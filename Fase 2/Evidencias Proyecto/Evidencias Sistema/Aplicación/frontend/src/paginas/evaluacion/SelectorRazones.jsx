import { IconoHabito } from '../../perfil/iconos.jsx'

// HU-19: selector de hábitos con problemas, con la gravedad de cada uno. Lo usan el formulario de
// evaluación (razones si no funciona, roces si funciona), la pantalla de razones y la de terminar

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

// Ícono de cada hábito (los del cuestionario) y de los que no son del cuestionario
const Trazo = ({ children }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
    strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>
)
const ICONOS_EXTRA = {
  gastos: <Trazo><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 9v.01M18 15v.01" /></Trazo>,
  comunicacion: <Trazo><path d="M4 5h16v10H9l-5 4z" /><path d="M8 9h8M8 12h5" /></Trazo>,
  otra: <Trazo><circle cx="6" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="18" cy="12" r="1.2" /></Trazo>,
}
const iconoDe = (valor) => ICONOS_EXTRA[valor] ?? <IconoHabito clave={valor} tamano={16} />

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

export default function SelectorRazones({
  elegidas, setElegidas, detalle, setDetalle, errores, alCambiar,
  leyenda = '¿Qué no funcionó? Elige una o más razones', ayuda = null, antes = null, etiquetaOtra = '¿Cuál fue la otra razón?',
  sinLeyenda = false, // el título ya lo da la sección que lo contiene
}) {
  const alternar = (razon) => {
    setElegidas(({ [razon]: actual, ...resto }) => (actual ? resto : { ...resto, [razon]: 'moderada' }))
    alCambiar()
  }

  return (
    <>
      <fieldset aria-describedby={[ayuda && 'ayuda-razones', errores.razones && 'error-razones'].filter(Boolean).join(' ') || undefined}>
        <legend className={sinLeyenda ? 'visualmente-oculto' : undefined}>{leyenda}</legend>
        {ayuda && <p id="ayuda-razones" className="campo-ayuda razones-ayuda">{ayuda}</p>}
        {antes}
        <ul className="razones-lista">
          {RAZONES.map(({ valor, texto }) => {
            const gravedad = elegidas[valor]
            return (
              <li key={valor} className={`razon${gravedad ? ' elegida' : ''}`} data-gravedad={gravedad}>
                <label className="razon-nombre">
                  <input type="checkbox" checked={Boolean(gravedad)} onChange={() => alternar(valor)} />
                  <span className="razon-icono">{iconoDe(valor)}</span>
                  {texto}
                </label>
                {gravedad && (
                  <div className="razon-gravedad" role="radiogroup" aria-label={`Qué tan grave fue: ${texto}`}>
                    {GRAVEDADES.map((g) => (
                      <label key={g.valor} className={gravedad === g.valor ? 'elegida' : undefined} data-gravedad={g.valor}>
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
          <label htmlFor="detalle-otra">{etiquetaOtra}</label>
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
