import { useId } from 'react'

// Colores de cada momento del día
const PALETAS = {
  manana: {
    cielo: ['#9fd8ee', '#e4f5fb'], lejos: '#a8cdd6', cerca: '#5e9aa8', suelo: '#4d8794',
    ventana: '#dff3f8', encendida: '#dff3f8', nube: 'rgb(255 255 255 / 0.92)',
  },
  tarde: {
    cielo: ['#f4a98a', '#fde4cc'], lejos: '#d29a8f', cerca: '#7c5566', suelo: '#6b4859',
    ventana: '#f3cfae', encendida: '#f2c94c', nube: 'rgb(255 244 232 / 0.75)',
  },
  noche: {
    cielo: ['#081629', '#173d58'], lejos: '#1c3b58', cerca: '#0e2440', suelo: '#0a1b31',
    ventana: '#213f5d', encendida: '#f2c94c', nube: 'rgb(255 255 255 / 0.06)',
  },
}

// Edificios del fondo: [x, alto]. Más anchos que la vista para que el parallax no deje bordes
const LEJOS = [[-60, 120], [20, 170], [100, 110], [170, 190], [250, 140], [330, 175], [410, 115], [480, 205], [560, 150], [640, 185], [720, 125], [800, 215], [880, 160], [960, 190], [1040, 135], [1120, 175], [1190, 150]]
// Edificios cercanos: [x, ancho, alto]
const CERCA = [[-40, 110, 150], [80, 90, 210], [180, 120, 130], [310, 100, 240], [420, 130, 170], [560, 95, 200], [665, 120, 140], [795, 105, 230], [910, 125, 160], [1045, 95, 205], [1150, 110, 145]]

const ESTRELLAS = [[60, 40], [140, 90], [230, 30], [320, 70], [410, 25], [500, 95], [590, 45], [690, 80], [760, 30], [840, 100], [1100, 50], [1160, 110], [30, 130], [470, 140], [1010, 150], [620, 130]]

// Ventanas de un edificio cercano. Cuáles están encendidas se decide con una regla fija,
// así la escena se ve igual en cada visita
function Ventanas({ x, ancho, alto, indice, paleta, noche }) {
  const columnas = Math.floor((ancho - 20) / 22)
  const filas = Math.floor((alto - 30) / 28)
  const ventanas = []
  for (let f = 0; f < filas; f++) {
    for (let c = 0; c < columnas; c++) {
      const encendida = noche && (indice * 7 + f * 3 + c * 5) % 7 < 3
      ventanas.push(
        <rect key={`${f}-${c}`} x={x + 14 + c * 22} y={360 - alto + 18 + f * 28} width="10" height="14" rx="1.5"
          fill={encendida ? paleta.encendida : paleta.ventana} opacity={encendida ? 0.95 : 0.55}
          className={encendida ? 'i-ventana-encendida' : undefined} />,
      )
    }
  }
  return ventanas
}

/**
 * Escena ilustrada del hero según la hora: cielo, sol/luna, nubes o estrellas y la ciudad.
 * Las capas con `data-profundidad` se mueven con el mouse (parallax, ver Hero.jsx).
 */
export default function EscenaHora({ momento }) {
  const paleta = PALETAS[momento]
  const noche = momento === 'noche'
  const id = useId()

  return (
    <svg className="i-escena" viewBox="0 0 1200 360" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-cielo`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={paleta.cielo[0]} />
          <stop offset="1" stopColor={paleta.cielo[1]} />
        </linearGradient>
        <radialGradient id={`${id}-halo`}>
          <stop offset="0" stopColor={noche ? '#f4f1de' : '#fff6d5'} stopOpacity="0.55" />
          <stop offset="1" stopColor={noche ? '#f4f1de' : '#fff6d5'} stopOpacity="0" />
        </radialGradient>
        <mask id={`${id}-luna`}>
          <rect width="1200" height="360" fill="#fff" />
          <circle cx="1002" cy="70" r="34" fill="#000" />
        </mask>
      </defs>

      <rect width="1200" height="360" fill={`url(#${id}-cielo)`} />

      {noche && (
        <g data-profundidad="4">
          {ESTRELLAS.map(([x, y], i) => (
            <circle key={i} cx={x + 40} cy={y} r={i % 3 === 0 ? 2 : 1.3} fill="#fff"
              className="i-estrella" style={{ animationDelay: `${(i % 5) * 0.7}s` }} />
          ))}
        </g>
      )}

      <g data-profundidad="8">
        {momento === 'manana' && (
          <>
            <circle cx="960" cy="95" r="110" fill={`url(#${id}-halo)`} />
            <circle cx="960" cy="95" r="46" fill="#f2c94c" />
          </>
        )}
        {momento === 'tarde' && (
          <>
            <circle cx="900" cy="235" r="150" fill={`url(#${id}-halo)`} />
            <circle cx="900" cy="235" r="72" fill="#f29e4c" opacity="0.95" />
          </>
        )}
        {noche && (
          <>
            <circle cx="985" cy="80" r="100" fill={`url(#${id}-halo)`} />
            <circle cx="985" cy="80" r="38" fill="#f4f1de" mask={`url(#${id}-luna)`} />
          </>
        )}
      </g>

      {!noche && (
        <g data-profundidad="14" fill={paleta.nube}>
          <g className="i-nube">
            <ellipse cx="220" cy="80" rx="70" ry="20" />
            <ellipse cx="260" cy="66" rx="42" ry="22" />
          </g>
          <g className="i-nube lenta">
            <ellipse cx="640" cy="120" rx="90" ry="18" />
            <ellipse cx="690" cy="104" rx="46" ry="20" />
          </g>
        </g>
      )}

      <g data-profundidad="20" fill={paleta.lejos}>
        {LEJOS.map(([x, alto]) => <rect key={x} x={x} y={360 - alto - 30} width="72" height={alto + 30} rx="3" />)}
      </g>

      <g data-profundidad="34">
        {CERCA.map(([x, ancho, alto], i) => (
          <g key={x}>
            <rect x={x} y={360 - alto} width={ancho} height={alto} rx="4" fill={paleta.cerca} />
            <Ventanas x={x} ancho={ancho} alto={alto} indice={i} paleta={paleta} noche={noche} />
          </g>
        ))}
        <rect x="-80" y="346" width="1360" height="20" fill={paleta.suelo} />
      </g>
    </svg>
  )
}
