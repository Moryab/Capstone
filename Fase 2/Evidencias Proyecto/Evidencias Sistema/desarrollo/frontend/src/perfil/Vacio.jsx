// Estado vacío de una sección del perfil: una ilustración pequeña con los colores de la marca, el
// texto y, si hay, la acción para completarla. Las ilustraciones son decorativas (aria-hidden)

const ILUSTRACIONES = {
  // Una tarjeta con líneas de texto y un lápiz que escribe
  texto: (
    <svg viewBox="0 0 120 96" aria-hidden="true">
      <rect x="10" y="14" width="78" height="64" rx="12" className="p2v-hoja" />
      <path d="M24 34h46M24 46h38M24 58h26" className="p2v-linea" />
      <g className="p2v-lapiz">
        <path d="M86 30l14 14-30 30H56V60z" className="p2v-acento" />
        <path d="M56 74l4-14 10 10z" className="p2v-punta" />
      </g>
    </svg>
  ),
  // Una lista con checks a medio completar
  habitos: (
    <svg viewBox="0 0 120 96" aria-hidden="true">
      <rect x="16" y="10" width="76" height="76" rx="14" className="p2v-hoja" />
      {[28, 48, 68].map((y, i) => (
        <g key={y}>
          <rect x="28" y={y - 7} width="14" height="14" rx="4" className={i < 1 ? 'p2v-check' : 'p2v-caja'} />
          {i < 1 && <path d={`M31 ${y}l3 3 5-6`} className="p2v-tic" />}
          <path d={`M50 ${y}h${30 - i * 6}`} className="p2v-linea" />
        </g>
      ))}
      <circle cx="96" cy="70" r="14" className="p2v-acento" />
      <path d="M90 70l4 4 8-8" className="p2v-tic" />
    </svg>
  ),
}

export default function Vacio({ ilustracion = 'texto', children }) {
  return (
    <div className="p2v">
      <span className="p2v-ilustracion">{ILUSTRACIONES[ilustracion]}</span>
      <p className="p2-vacio">{children}</p>
    </div>
  )
}
