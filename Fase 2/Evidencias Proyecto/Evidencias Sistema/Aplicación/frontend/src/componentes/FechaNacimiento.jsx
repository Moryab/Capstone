import { useId, useRef, useState } from 'react'
import Desplegable from '../paginas/admin/ui/Desplegable.jsx'
import './campos.css'

const MESES = Array.from({ length: 12 }, (_, i) => {
  const texto = new Date(2026, i, 1).toLocaleDateString('es-CL', { month: 'long' })
  return { valor: String(i + 1).padStart(2, '0'), texto: texto.charAt(0).toUpperCase() + texto.slice(1) }
})

const partesDe = (valor) => {
  const [anio = '', mes = '', dia = ''] = valor ? valor.split('-') : []
  return { dia: dia.replace(/^0/, ''), mes, anio }
}

// La fecha existe (no es, por ejemplo, el 31 de febrero)
function fechaReal(dia, mes, anio) {
  const f = new Date(Number(anio), Number(mes) - 1, Number(dia))
  return f.getFullYear() === Number(anio) && f.getMonth() === Number(mes) - 1 && f.getDate() === Number(dia)
}
// Mismo rango que el backend (EDAD_MINIMA y EDAD_MAXIMA en schemas/usuarios.py)
const EDAD_MINIMA = 18
const EDAD_MAXIMA = 65

function edadDe(dia, mes, anio) {
  const hoy = new Date()
  let edad = hoy.getFullYear() - Number(anio)
  if (hoy.getMonth() + 1 < Number(mes) || (hoy.getMonth() + 1 === Number(mes) && hoy.getDate() < Number(dia))) edad -= 1
  return edad
}

/**
 * Fecha de nacimiento en tres partes: día, mes (desplegable con el nombre) y año. Para una fecha
 * lejana es más rápido escribir el año que recorrer un calendario. Cuando está completa entrega
 * «AAAA-MM-DD» (mientras no, entrega '') y muestra la edad, o avisa si la fecha no existe.
 */
export default function FechaNacimiento({ valor, alCambiar, error, etiqueta = 'Fecha de nacimiento' }) {
  const id = useId()
  const [partes, setPartes] = useState(() => partesDe(valor))
  const refMes = useRef(null)
  const refAnio = useRef(null)

  const actualizar = (cambios) => {
    const nuevas = { ...partes, ...cambios }
    setPartes(nuevas)
    const { dia, mes, anio } = nuevas
    const completa = dia && mes && anio.length === 4 && fechaReal(dia, mes, anio)
    alCambiar(completa ? `${anio}-${mes}-${dia.padStart(2, '0')}` : '')
  }

  const { dia, mes, anio } = partes
  const completa = dia && mes && anio.length === 4
  const existe = completa && fechaReal(dia, mes, anio)
  const edad = existe ? edadDe(dia, mes, anio) : null
  let aviso = ''
  if (completa && !existe) aviso = 'Esa fecha no existe. Revisa el día y el mes.'
  else if (edad !== null && edad < 0) aviso = 'Revisa el año: la fecha no parece válida.'
  else if (edad !== null && edad < EDAD_MINIMA) aviso = `Debes tener al menos ${EDAD_MINIMA} años para usar RoomMatch.`
  else if (edad !== null && edad > EDAD_MAXIMA) aviso = `Revisa el año de nacimiento: RoomMatch es para personas de ${EDAD_MINIMA} a ${EDAD_MAXIMA} años.`
  const mensaje = error || aviso

  return (
    <fieldset className="campo campo-fecha" aria-describedby={mensaje ? `${id}-error` : edad !== null ? `${id}-edad` : undefined}>
      <legend>{etiqueta}</legend>
      <div className="campo-fecha-partes">
        <label className="campo-fecha-parte dia">
          <span>Día</span>
          <input inputMode="numeric" autoComplete="bday-day" placeholder="DD" maxLength={2} value={dia}
            aria-invalid={Boolean(mensaje)}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '')
              actualizar({ dia: v })
              // Con dos dígitos (o un día mayor que 3) pasa solo al mes
              if (v.length === 2 || Number(v) > 3) refMes.current?.querySelector('button')?.focus()
            }} />
        </label>
        <div className="campo-fecha-parte mes" ref={refMes}>
          <span id={`${id}-mes`}>Mes</span>
          <Desplegable idEtiqueta={`${id}-mes`} etiqueta="Mes" valor={mes}
            opciones={[{ valor: '', texto: 'Elige el mes' }, ...MESES]}
            alCambiar={(v) => {
              actualizar({ mes: v })
              if (v) refAnio.current?.focus()
            }} />
        </div>
        <label className="campo-fecha-parte anio">
          <span>Año</span>
          <input ref={refAnio} inputMode="numeric" autoComplete="bday-year" placeholder="AAAA" maxLength={4} value={anio}
            aria-invalid={Boolean(mensaje)}
            onChange={(e) => actualizar({ anio: e.target.value.replace(/\D/g, '') })} />
        </label>
      </div>
      {mensaje
        ? <p className="campo-error" id={`${id}-error`}>{mensaje}</p>
        : edad !== null && <p className="campo-fecha-edad" id={`${id}-edad`}>Tienes {edad} años</p>}
    </fieldset>
  )
}

/** Opciones visibles que se eligen con un clic (radios con forma de botón), para listas cortas */
export function OpcionesBoton({ etiqueta, nombre, valor, opciones, alCambiar, error }) {
  const id = useId()
  return (
    <fieldset className="campo campo-opciones" aria-describedby={error ? `${id}-error` : undefined}>
      <legend>{etiqueta}</legend>
      <div className="campo-opciones-lista">
        {opciones.map((o) => (
          <label key={o.valor} className="campo-opcion">
            <input type="radio" name={nombre} value={o.valor} checked={valor === o.valor}
              aria-invalid={Boolean(error)} onChange={() => alCambiar(o.valor)} />
            <span>{o.texto}</span>
          </label>
        ))}
      </div>
      {error && <p className="campo-error" id={`${id}-error`}>{error}</p>}
    </fieldset>
  )
}
