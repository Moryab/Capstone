import { useRef } from 'react'
import { aparecer, gsap, useAnimacion } from '../animaciones.js'
import { Encabezado, Inclinable } from '../componentes.jsx'
import { Habitacion } from '../ilustraciones.jsx'

const FILTROS = ['Hasta $250.000', 'Concepción', 'Cerca de tu sede', 'Mascotas permitidas', 'Gastos incluidos']

// Publicaciones de ejemplo (no son reales): muestran qué información verás en cada una
const EJEMPLOS = [
  { tipo: 'Habitación', titulo: 'Pieza luminosa con escritorio', comuna: 'Concepción', precio: '230.000', cercania: 'A 10 min de tu sede', etiquetas: ['Gastos incluidos', 'Sin fumar'], pared: '#cfe8e4', acento: '#12766b' },
  { tipo: 'Departamento', titulo: 'Depto 2 dormitorios para compartir', comuna: 'San Pedro de la Paz', precio: '210.000', cercania: 'A 20 min de tu sede', etiquetas: ['Mascotas', 'Visitas'], pared: '#dbe4f3', acento: '#0e2440' },
  { tipo: 'Habitación', titulo: 'Habitación en casa tranquila', comuna: 'Chiguayante', precio: '180.000', cercania: 'A 25 min de tu sede', etiquetas: ['Horario de silencio'], pared: '#f3e9d2', acento: '#b7791f' },
  { tipo: 'Habitación', titulo: 'Pieza con baño privado', comuna: 'Concepción', precio: '260.000', cercania: 'A 5 min de tu sede', etiquetas: ['Internet incluido'], pared: '#e2f0e9', acento: '#2f855a' },
  { tipo: 'Departamento', titulo: 'Depto amoblado cerca del centro', comuna: 'Talcahuano', precio: '195.000', cercania: 'A 30 min de tu sede', etiquetas: ['Mascotas', 'Gastos aparte'], pared: '#e6e0f2', acento: '#4c3c8f' },
]

// En escritorio la sección queda fija y, al bajar, las tarjetas avanzan de lado.
// En móvil es un carrusel que se desliza con el dedo
export default function Alojamientos() {
  const ref = useRef(null)
  const fijo = useRef(null)
  const pista = useRef(null)

  useAnimacion(ref, ({ escritorio }) => {
    const q = gsap.utils.selector(ref)
    aparecer(q('.l-encabezado > *, .l-filtros'), { disparador: ref.current, separacion: 0.1 })
    aparecer(q('.l-aloj'), { disparador: pista.current, separacion: 0.08, desplazamiento: 50 })

    if (!escritorio) return undefined

    const distancia = () => pista.current.scrollWidth - pista.current.parentElement.clientWidth
    gsap.to(pista.current, {
      x: () => -distancia(),
      ease: 'none',
      scrollTrigger: {
        trigger: fijo.current,
        start: 'top top',
        // Un poco más largo que la distancia, para que el avance lateral se sienta pausado
        end: () => `+=${distancia() * 1.4}`,
        pin: true,
        scrub: 0.8,
        invalidateOnRefresh: true,
      },
    })
    return undefined
  })

  return (
    <section id="alojamientos" className="l-seccion l-aloj-seccion" ref={ref} aria-labelledby="aloj-titulo" tabIndex={-1}>
      <div className="l-aloj-fijo" ref={fijo}>
        <div className="l-contenedor">
          <Encabezado id="aloj-titulo" etiqueta="Búsqueda de alojamiento"
            titulo="Encuentra dónde vivir, cerca de donde estudias"
            bajada="Habitaciones y departamentos publicados por estudiantes, con el costo, los gastos y las reglas a la vista." />
          <ul className="l-filtros" aria-label="Filtros de ejemplo">
            {FILTROS.map((filtro, i) => (
              <li key={filtro} className={i < 3 ? 'activo' : undefined}>{filtro}</li>
            ))}
          </ul>
        </div>

        <div className="l-aloj-ventana">
          <ul className="l-aloj-pista" ref={pista}>
            {EJEMPLOS.map((aloj) => (
              <li key={aloj.titulo}>
                <Inclinable className="l-aloj" grados={6}>
                  <div className="l-aloj-foto">
                    <Habitacion pared={aloj.pared} acento={aloj.acento} />
                    <span className="l-etiqueta-ejemplo">Ejemplo</span>
                    <span className="l-aloj-tipo">{aloj.tipo}</span>
                  </div>
                  <div className="l-aloj-cuerpo">
                    <h3>{aloj.titulo}</h3>
                    <p className="l-aloj-lugar">{aloj.comuna} · {aloj.cercania}</p>
                    <p className="l-aloj-precio"><strong>${aloj.precio}</strong> / mes</p>
                    <ul className="l-chips">
                      {aloj.etiquetas.map((e) => <li key={e}>{e}</li>)}
                    </ul>
                  </div>
                </Inclinable>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
