// Ilustraciones de los estados vacíos de Mensajes y las siluetas de carga. Son decorativas
// (aria-hidden): el texto que las acompaña ya lo explica. Los colores salen de mensajes.css,
// así sirven en el tema claro y en el oscuro

// Sin conversaciones: una casa con dos globos de diálogo, uno de cada roomie
export function IlustracionSinConversaciones() {
  return (
    <svg className="chat-ilustracion" viewBox="0 0 240 170" aria-hidden="true">
      <ellipse className="il-sombra" cx="120" cy="152" rx="92" ry="7" />
      <path className="il-casa" d="M62 150V86l58-42 58 42v64z" />
      <path className="il-techo" d="M50 92l70-52 70 52" />
      <rect className="il-puerta" x="106" y="112" width="28" height="38" rx="6" />
      <rect className="il-ventana" x="76" y="98" width="20" height="18" rx="4" />
      <rect className="il-ventana" x="144" y="98" width="20" height="18" rx="4" />
      <g className="il-globo il-flota">
        <path className="il-globo-claro" d="M18 30h62a12 12 0 0 1 12 12v22a12 12 0 0 1-12 12H40l-12 10V76h-10A12 12 0 0 1 6 64V42a12 12 0 0 1 12-12z" />
        <circle className="il-punto" cx="34" cy="53" r="4" />
        <circle className="il-punto" cx="49" cy="53" r="4" />
        <circle className="il-punto" cx="64" cy="53" r="4" />
      </g>
      <g className="il-globo il-flota il-flota-tarde">
        <path className="il-globo-marca" d="M160 14h62a12 12 0 0 1 12 12v20a12 12 0 0 1-12 12h-10v10l-12-10h-40a12 12 0 0 1-12-12V26a12 12 0 0 1 12-12z" />
        <path className="il-linea-clara" d="M164 30h46M164 42h30" />
      </g>
    </svg>
  )
}

// Ninguna conversación elegida: una lista a la izquierda que se abre en un globo
export function IlustracionElegir() {
  return (
    <svg className="chat-ilustracion" viewBox="0 0 240 170" aria-hidden="true">
      <ellipse className="il-sombra" cx="120" cy="152" rx="96" ry="7" />
      <rect className="il-panel" x="22" y="26" width="84" height="118" rx="14" />
      {[44, 76, 108].map((y, i) => (
        <g key={y} className={i === 1 ? 'il-fila il-fila-activa' : 'il-fila'}>
          <rect x="30" y={y - 12} width="68" height="26" rx="8" />
          <circle cx="44" cy={y + 1} r="7" />
          <path d={`M56 ${y - 2}h32M56 ${y + 5}h20`} />
        </g>
      ))}
      <path className="il-camino" d="M106 89c18 0 22-30 44-30" />
      <g className="il-flota">
        <path className="il-globo-marca" d="M148 34h64a12 12 0 0 1 12 12v26a12 12 0 0 1-12 12h-36l-12 11V84h-16a12 12 0 0 1-12-12V46a12 12 0 0 1 12-12z" />
        <path className="il-linea-clara" d="M152 52h52M152 64h34" />
      </g>
      <g className="il-flota il-flota-tarde">
        <path className="il-globo-claro" d="M164 100h48a10 10 0 0 1 10 10v14a10 10 0 0 1-10 10h-48a10 10 0 0 1-10-10v-14a10 10 0 0 1 10-10z" />
        <path className="il-linea" d="M166 117h34" />
      </g>
    </svg>
  )
}

// Conversación sin mensajes: un saludo para romper el hielo
export function IlustracionSaludo() {
  return (
    <svg className="chat-ilustracion chat-ilustracion-chica" viewBox="0 0 200 130" aria-hidden="true">
      <ellipse className="il-sombra" cx="100" cy="118" rx="64" ry="6" />
      <g className="il-flota">
        <path className="il-globo-claro" d="M40 18h120a16 16 0 0 1 16 16v38a16 16 0 0 1-16 16H82l-18 16V88H40a16 16 0 0 1-16-16V34a16 16 0 0 1 16-16z" />
        <text className="il-texto" x="100" y="62" textAnchor="middle">¡Hola!</text>
      </g>
      <path className="il-destello" d="M152 22v10M147 27h10M170 46v6M167 49h6" />
    </svg>
  )
}

// ---------- Siluetas de carga: ocupan el mismo lugar que el contenido, así nada salta ----------
export function SiluetaLista({ filas = 6 }) {
  return (
    <ul className="chat-items chat-silueta" aria-hidden="true">
      {Array.from({ length: filas }, (_, i) => (
        <li key={i} className="chat-item">
          <span className="sil sil-avatar" />
          <span className="chat-item-textos">
            <span className="sil sil-linea" style={{ width: `${55 + ((i * 17) % 30)}%` }} />
            <span className="sil sil-linea corta" style={{ width: `${70 + ((i * 11) % 25)}%` }} />
          </span>
        </li>
      ))}
    </ul>
  )
}

const BURBUJAS = [['', 46], ['', 30], ['mia', 52], ['', 38], ['mia', 28], ['mia', 44]]

export function SiluetaConversacion() {
  return (
    <div className="chat-conversacion chat-silueta" role="status" aria-label="Cargando la conversación">
      <header className="chat-cabecera">
        <span className="sil sil-avatar" />
        <span className="chat-cabecera-textos">
          <span className="sil sil-linea" style={{ width: 160 }} />
          <span className="sil sil-linea corta" style={{ width: 90 }} />
        </span>
      </header>
      <div className="chat-mensajes">
        <ol className="chat-burbujas">
          {BURBUJAS.map(([clase, ancho], i) => (
            <li key={i} className={`chat-burbuja sil-burbuja ${clase}`} style={{ width: `${ancho}%` }} />
          ))}
        </ol>
      </div>
      <div className="chat-escribir"><span className="sil sil-campo" /></div>
    </div>
  )
}
