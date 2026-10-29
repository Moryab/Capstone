import { createContext, useContext } from 'react'

export const TemaContext = createContext(null)

// La clave en el navegador; index.html la lee antes de cargar React para no mostrar un destello claro
export const CLAVE_TEMA = 'rm_tema'

// Devuelve { tema: 'claro' | 'oscuro', cambiarTema(nuevo, origen?) }
export const useTema = () => useContext(TemaContext)
