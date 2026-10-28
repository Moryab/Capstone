import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconoLogo } from '../../componentes/Logo.jsx'
import { EnlaceSeccion } from '../componentes.jsx'
import { ENLACES } from '../enlaces.js'

// Barra fija y translúcida. Al bajar se compacta; en móvil los enlaces van en un menú
export default function Navbar() {
  const [compacta, setCompacta] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(false)

  useEffect(() => {
    const alScroll = () => setCompacta(window.scrollY > 40)
    alScroll()
    window.addEventListener('scroll', alScroll, { passive: true })
    return () => window.removeEventListener('scroll', alScroll)
  }, [])

  useEffect(() => {
    if (!menuAbierto) return undefined
    const alTeclado = (e) => e.key === 'Escape' && setMenuAbierto(false)
    window.addEventListener('keydown', alTeclado)
    return () => window.removeEventListener('keydown', alTeclado)
  }, [menuAbierto])

  const cerrar = () => setMenuAbierto(false)

  return (
    <header className={`l-nav${compacta ? ' compacta' : ''}${menuAbierto ? ' abierta' : ''}`}>
      <div className="l-contenedor l-nav-fila">
        <Link to="/" className="l-nav-logo" aria-label="RoomMatch, inicio">
          <IconoLogo tamano={38} />
          <span>Room<span className="l-acento">Match</span></span>
        </Link>

        <nav className="l-nav-enlaces" id="menu-landing" aria-label="Secciones">
          <ul>
            {ENLACES.map(({ id, texto }) => (
              <li key={id}><EnlaceSeccion id={id} alIr={cerrar}>{texto}</EnlaceSeccion></li>
            ))}
          </ul>
          <div className="l-nav-botones">
            <Link to="/login" className="l-boton l-boton-fantasma">Ingresar</Link>
            <Link to="/registro" className="l-boton">Registrarme</Link>
          </div>
        </nav>

        <button type="button" className="l-nav-menu" aria-expanded={menuAbierto} aria-controls="menu-landing"
          onClick={() => setMenuAbierto(!menuAbierto)}>
          <span className="l-sr">{menuAbierto ? 'Cerrar menú' : 'Abrir menú'}</span>
          <span className="l-nav-hamburguesa" aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
