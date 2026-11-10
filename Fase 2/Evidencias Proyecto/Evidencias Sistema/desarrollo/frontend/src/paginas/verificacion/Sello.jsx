// Sello del estado de la verificación: un círculo con su ícono, que se dibuja con un trazo cuando
// `animar` está activo (al recibir el resultado o al enviar). Lo usan la página y la ventana del aviso

export const TEXTOS_ESTADO = {
  verificado: {
    titulo: 'Eres estudiante verificado',
    texto: 'Tu perfil muestra la insignia y puedes usar todas las funciones de RoomMatch.',
  },
  pendiente: {
    titulo: 'Estamos revisando tu comprobante',
    texto: 'Te avisaremos apenas un administrador lo revise. Mientras tanto no necesitas hacer nada.',
  },
  rechazado: {
    titulo: 'Tu solicitud fue rechazada',
    texto: 'Revisa el motivo y envía un nuevo comprobante: no hay límite de intentos.',
  },
  revocado: {
    titulo: 'Tu verificación fue revocada',
    texto: 'Revisa el motivo. Si sigues estudiando, envía un comprobante actualizado.',
  },
  no_verificado: {
    titulo: 'Verifica tu cuenta',
    texto: 'Envía un comprobante de alumno regular o de matrícula. Lo revisamos y te avisamos.',
  },
}

// Trazos de cada ícono, en un lienzo de 48 × 48 (cada uno se dibuja con pathLength="1")
const TRAZOS = {
  verificado: ['M15 25.5l6.5 6.5L33 18.5'],
  pendiente: ['M24 15v10l6 4', 'M24 12a12 12 0 1 1 0 24a12 12 0 1 1 0-24'],
  rechazado: ['M17 17l14 14', 'M31 17L17 31'],
  revocado: ['M24 13a11 11 0 1 1 0 22a11 11 0 1 1 0-22', 'M16.2 31.8L31.8 16.2'],
  no_verificado: ['M10 21l14-7 14 7-14 7z', 'M16 24v7c4 3 12 3 16 0v-7'],
}

export function Sello({ estado, animar = true, tamano = 'grande' }) {
  const clave = TRAZOS[estado] ? estado : 'no_verificado'
  return (
    // La clave hace que vuelva a dibujarse si cambia el estado
    <span key={clave} className={`vf-sello ${tamano}`} data-estado={clave} data-animar={animar || undefined} aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle className="vf-sello-aro" cx="24" cy="24" r="21" pathLength="1" />
        <g className="vf-sello-icono">
          {TRAZOS[clave].map((d, i) => <path key={d} d={d} pathLength="1" style={{ '--i': i }} />)}
        </g>
      </svg>
    </span>
  )
}
