import { createContext, useContext } from 'react'

// Función para ir a una sección de la landing (con scroll suave si está activo)
export const DesplazarContext = createContext(() => {})

export const useDesplazar = () => useContext(DesplazarContext)
