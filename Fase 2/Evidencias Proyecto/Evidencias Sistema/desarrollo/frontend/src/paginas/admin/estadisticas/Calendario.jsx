import { useEffect, useRef, useState } from 'react'
import Desplegable from '../ui/Desplegable.jsx'
import { iso } from './periodos.js'

const DIAS = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do']
const MESES = Array.from({ length: 12 }, (_, i) => new Date(2026, i, 1).toLocaleDateString('es-CL', { month: 'long' }))
  .map((m) => m.charAt(0).toUpperCase() + m.slice(1))
const ANIOS_ATRAS = 6 // el selector de año muestra este año y los seis anteriores

const deIso = (texto) => {
  const [a, m, d] = texto.split('-').map(Number)
  return new Date(a, m - 1, d)
}
const sumarDias = (texto, n) => {
  const f = deIso(texto)
  f.setDate(f.getDate() + n)
  return iso(f)
}
const inicioDeMes = (fecha) => new Date(fecha.getFullYear(), fecha.getMonth(), 1)
const fechaLarga = (texto) => deIso(texto).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const fechaCorta = (texto) => deIso(texto).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })

// Semanas de un mes (de lunes a domingo); null en los días que son de otro mes
function semanasDe(mes) {
  const desfase = (mes.getDay() + 6) % 7
  const dias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
  const celdas = [...Array(desfase).fill(null), ...Array.from({ length: dias }, (_, i) => iso(new Date(mes.getFullYear(), mes.getMonth(), i + 1)))]
  while (celdas.length % 7) celdas.push(null)
  return Array.from({ length: celdas.length / 7 }, (_, i) => celdas.slice(i * 7, i * 7 + 7))
}

// Atajos de un clic (todos terminan como mucho hoy)
function atajos(hoyTexto) {
  const hoy = deIso(hoyTexto)
  const a = hoy.getFullYear()
  const m = hoy.getMonth()
  return [
    { texto: 'Este mes', desde: iso(new Date(a, m, 1)), hasta: hoyTexto },
    { texto: 'Mes pasado', desde: iso(new Date(a, m - 1, 1)), hasta: iso(new Date(a, m, 0)) },
    { texto: 'Últimos 3 meses', desde: iso(new Date(a, m - 2, 1)), hasta: hoyTexto },
    { texto: 'Este año', desde: iso(new Date(a, 0, 1)), hasta: hoyTexto },
    { texto: 'Año pasado', desde: iso(new Date(a - 1, 0, 1)), hasta: iso(new Date(a - 1, 11, 31)) },
  ]
}

const Flecha = ({ izquierda }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={izquierda ? 'M14.5 6l-6 6 6 6' : 'M9.5 6l6 6-6 6'} />
  </svg>
)

/**
 * Calendario del período personalizado, en una ventanita que se abre sobre el panel.
 * Arriba, «Desde» y «Hasta»: el que se está eligiendo queda resaltado y se puede cambiar con un
 * clic. A la izquierda, atajos (este mes, año pasado…); el mes y el año se eligen con desplegables
 * para llegar rápido a fechas antiguas. No se pueden elegir días futuros.
 * Con `permitirVacio`, «Limpiar» y luego «Aplicar» quita el filtro (alAplicar('', '')).
 * Teclado: flechas entre días, Re Pág / Av Pág para cambiar de mes, Enter para elegir y Escape cierra.
 */
export default function Calendario({ desde, hasta, alAplicar, alCancelar, permitirVacio = false }) {
  const [hoy] = useState(() => iso(new Date()))
  const [inicio, setInicio] = useState(desde)
  const [fin, setFin] = useState(hasta)
  const [eligiendo, setEligiendo] = useState(desde && !hasta ? 'hasta' : 'desde')
  const [previa, setPrevia] = useState('')
  const [foco, setFoco] = useState(hasta || desde || hoy)
  const [mes, setMes] = useState(() => inicioDeMes(deIso(hasta || desde || hoy)))
  const ventana = useRef(null)
  const moviendo = useRef(false)

  // Al abrir, el foco va al campo que se está eligiendo
  useEffect(() => {
    ventana.current?.querySelector('[data-campo][aria-pressed="true"]')?.focus()
  }, [])

  // Clic afuera: se cierra sin aplicar
  useEffect(() => {
    const fuera = (e) => {
      if (ventana.current && !ventana.current.contains(e.target) && !e.target.closest('[data-abre-calendario]')) alCancelar()
    }
    document.addEventListener('pointerdown', fuera)
    return () => document.removeEventListener('pointerdown', fuera)
  }, [alCancelar])

  useEffect(() => {
    if (moviendo.current) ventana.current?.querySelector(`[data-dia="${foco}"]`)?.focus()
    moviendo.current = false
  }, [foco, mes])

  const elegir = (dia) => {
    if (dia > hoy) return
    if (eligiendo === 'desde' || !inicio) {
      setInicio(dia)
      if (fin && dia > fin) setFin('')
      setEligiendo('hasta')
    } else if (dia < inicio) {
      setInicio(dia) // un fin anterior al inicio pasa a ser el nuevo inicio
    } else {
      setFin(dia)
    }
    setFoco(dia)
  }
  const usarAtajo = (a) => {
    setInicio(a.desde)
    setFin(a.hasta)
    setEligiendo('hasta')
    setMes(inicioDeMes(deIso(a.hasta)))
  }
  const irA = (anio, numeroMes) => setMes(new Date(anio, numeroMes, 1))

  const moverFoco = (nuevo) => {
    const destino = nuevo > hoy ? hoy : nuevo
    moviendo.current = true
    setFoco(destino)
    setMes(inicioDeMes(deIso(destino)))
  }
  const teclasDias = (e) => {
    const f = deIso(foco)
    const acciones = {
      ArrowLeft: () => sumarDias(foco, -1),
      ArrowRight: () => sumarDias(foco, 1),
      ArrowUp: () => sumarDias(foco, -7),
      ArrowDown: () => sumarDias(foco, 7),
      PageUp: () => iso(new Date(f.getFullYear(), f.getMonth() - 1, Math.min(f.getDate(), 28))),
      PageDown: () => iso(new Date(f.getFullYear(), f.getMonth() + 1, Math.min(f.getDate(), 28))),
    }
    if (e.key in acciones) {
      e.preventDefault()
      moverFoco(acciones[e.key]())
    }
  }
  const teclasVentana = (e) => {
    // Un desplegable abierto ya usó la tecla Escape para cerrarse a sí mismo
    if (e.key === 'Escape' && !e.defaultPrevented) {
      e.preventDefault()
      alCancelar()
    }
  }

  const finVisible = fin || (eligiendo === 'hasta' && inicio && previa > inicio ? previa : '')
  const enTramo = (dia) => inicio && finVisible && dia > inicio && dia < finVisible
  const hoyFecha = deIso(hoy)
  const anios = Array.from({ length: ANIOS_ATRAS + 1 }, (_, i) => hoyFecha.getFullYear() - i)
  const meses = MESES.map((texto, i) => ({ valor: String(i), texto }))
    .filter((m) => mes.getFullYear() < hoyFecha.getFullYear() || Number(m.valor) <= hoyFecha.getMonth())
  const siguienteDeshabilitado = inicioDeMes(hoyFecha) <= mes

  return (
    <div ref={ventana} className="c-ventana" role="dialog" aria-label="Elegir período personalizado" onKeyDown={teclasVentana}>
      {/* Qué fecha es cada una, y cuál se está eligiendo */}
      <div className="c-campos">
        {[['desde', 'Desde', inicio], ['hasta', 'Hasta', fin]].map(([clave, texto, valor]) => (
          <button key={clave} type="button" className="c-campo" data-campo={clave} aria-pressed={eligiendo === clave}
            onClick={() => setEligiendo(clave)}>
            <span className="c-campo-etiqueta">{texto}</span>
            <span className="c-campo-valor">{valor ? fechaCorta(valor) : eligiendo === clave ? 'Elige en el calendario' : '—'}</span>
          </button>
        ))}
      </div>

      <div className="c-cuerpo">
        <ul className="c-atajos" aria-label="Atajos">
          {atajos(hoy).map((a) => (
            <li key={a.texto}>
              <button type="button" aria-pressed={inicio === a.desde && fin === a.hasta} onClick={() => usarAtajo(a)}>{a.texto}</button>
            </li>
          ))}
        </ul>

        <div className="c-mes">
          <div className="c-mes-cabeza">
            <button type="button" className="c-nav" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))} aria-label="Mes anterior">
              <Flecha izquierda />
            </button>
            <Desplegable variante="compacto" etiqueta="Mes" valor={String(mes.getMonth())} opciones={meses}
              alCambiar={(v) => irA(mes.getFullYear(), Number(v))} />
            <Desplegable variante="compacto" etiqueta="Año" valor={String(mes.getFullYear())}
              opciones={anios.map((a) => ({ valor: String(a), texto: String(a) }))}
              alCambiar={(v) => irA(Number(v), Number(v) === hoyFecha.getFullYear() ? Math.min(mes.getMonth(), hoyFecha.getMonth()) : mes.getMonth())} />
            <button type="button" className="c-nav" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}
              aria-label="Mes siguiente" disabled={siguienteDeshabilitado}>
              <Flecha />
            </button>
          </div>
          <table role="grid" aria-label={`${MESES[mes.getMonth()]} de ${mes.getFullYear()}`} onKeyDown={teclasDias}>
            <thead>
              <tr>{DIAS.map((d) => <th key={d} scope="col">{d}</th>)}</tr>
            </thead>
            <tbody>
              {semanasDe(mes).map((semana) => (
                <tr key={semana.find(Boolean)}>
                  {semana.map((dia, i) => (dia ? (
                    <td key={dia} role="gridcell" aria-selected={dia === inicio || dia === fin || enTramo(dia) || undefined}
                      data-tramo={enTramo(dia) || undefined}
                      data-borde={(dia === inicio && finVisible) ? 'inicio' : (dia === finVisible && inicio && dia !== inicio) ? 'fin' : undefined}>
                      <button type="button" data-dia={dia} tabIndex={dia === foco ? 0 : -1} disabled={dia > hoy}
                        data-elegido={dia === inicio || dia === fin || undefined} data-hoy={dia === hoy || undefined}
                        aria-label={`${fechaLarga(dia)}${dia === inicio ? ', desde' : ''}${dia === fin ? ', hasta' : ''}`}
                        onClick={() => elegir(dia)} onFocus={() => setFoco(dia)}
                        onPointerEnter={() => setPrevia(dia)} onPointerLeave={() => setPrevia('')}>
                        {Number(dia.slice(8))}
                      </button>
                    </td>
                  ) : <td key={`v${i}`} />))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="c-pie">
        <button type="button" className="a-enlace" onClick={() => { setInicio(''); setFin(''); setEligiendo('desde') }} disabled={!inicio}>
          Limpiar
        </button>
        <div className="c-acciones">
          <button type="button" className="a-boton" onClick={alCancelar}>Cancelar</button>
          {/* Con solo «Desde», el período es ese día */}
          <button type="button" className="a-boton primario" disabled={!inicio && !permitirVacio} onClick={() => alAplicar(inicio, fin || inicio)}>
            Aplicar
          </button>
        </div>
      </div>
    </div>
  )
}
