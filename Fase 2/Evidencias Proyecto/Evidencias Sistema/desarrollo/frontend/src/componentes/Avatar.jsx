// Foto de perfil redonda. Sin foto, muestra las iniciales sobre el degradado de la marca
export default function Avatar({ nombre, apellido, foto, tamano = 48, className = '' }) {
  const medidas = { width: tamano, height: tamano }
  const clases = `avatar ${className}`.trim()

  if (foto) {
    return <img className={clases} src={foto} alt={`Foto de perfil de ${nombre}`} style={medidas} />
  }

  const iniciales = `${nombre?.[0] ?? ''}${apellido?.[0] ?? ''}`.toUpperCase()
  return (
    <span className={`${clases} avatar-iniciales`} role="img" aria-label={`Sin foto de perfil: ${nombre}`}
      style={{ ...medidas, fontSize: tamano * 0.36 }}>
      {iniciales}
    </span>
  )
}
