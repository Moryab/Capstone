import { useEffect } from 'react'

// Pone el fondo con la ciudad mientras la página que lo usa está abierta y lo quita al salir.
// Se usa en el login/registro y en el perfil; el resto de la app mantiene el fondo gris
export function useFondoCiudad() {
  useEffect(() => {
    document.body.classList.add('fondo-ciudad')
    return () => document.body.classList.remove('fondo-ciudad')
  }, [])
}
