import { useState } from 'react'

// Degradados de la marca para las iniciales: cada persona recibe siempre el mismo (según su nombre)
const TONOS = 5
const tonoDe = (texto = '') => [...texto].reduce((suma, letra) => suma + letra.charCodeAt(0), 0) % TONOS

/**
 * Foto de perfil redonda. Sin foto (o si la imagen no carga) muestra las iniciales sobre un
 * degradado de la marca, con un brillo suave arriba para que no se vea plano.
 */
export default function Avatar({ nombre, apellido, foto, tamano = 48, className = '' }) {
  const [fallo, setFallo] = useState(false)
  const medidas = { width: tamano, height: tamano }
  const clases = `avatar ${className}`.trim()

  if (foto && !fallo) {
    return <img className={clases} src={foto} alt={`Foto de perfil de ${nombre}`} style={medidas} onError={() => setFallo(true)} />
  }

  const iniciales = `${nombre?.[0] ?? ''}${apellido?.[0] ?? ''}`.toUpperCase()
  return (
    <span className={`${clases} avatar-iniciales`} data-tono={tonoDe(`${nombre}${apellido}`)} role="img"
      aria-label={`Sin foto de perfil: ${nombre}`} style={{ ...medidas, fontSize: tamano * 0.38 }}>
      {iniciales}
    </span>
  )
}
