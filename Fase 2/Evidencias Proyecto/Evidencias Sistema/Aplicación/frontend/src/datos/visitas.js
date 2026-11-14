import { useEffect, useState } from 'react'

// Vistas ya mostradas en esta sesión (por su nombre): al volver, su entrada animada no se repite
const vistas = new Set()

/** true solo la primera vez que se monta la vista `clave` en la sesión */
export function usePrimeraVez(clave) {
  const [primera] = useState(() => !vistas.has(clave))
  useEffect(() => {
    vistas.add(clave)
  }, [clave])
  return primera
}
