import { Link } from 'react-router-dom'
import { IconoLogo } from '../../componentes/Logo.jsx'
import { EnlaceSeccion } from '../componentes.jsx'
import { ENLACES } from '../enlaces.js'

const ANIO = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="l-footer">
      <div className="l-contenedor l-footer-grid">
        <div className="l-footer-marca">
          <span className="l-nav-logo">
            <IconoLogo tamano={36} />
            <span>Room<span className="l-acento">Match</span></span>
          </span>
          <p>Tu hogar y tu roomie ideal.</p>
        </div>
        <nav aria-label="Secciones">
          <h2>Explora</h2>
          <ul>
            {ENLACES.map(({ id, texto }) => (
              <li key={id}><EnlaceSeccion id={id}>{texto}</EnlaceSeccion></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Cuenta">
          <h2>Tu cuenta</h2>
          <ul>
            <li><Link to="/registro">Registrarme</Link></li>
            <li><Link to="/login">Ingresar</Link></li>
          </ul>
        </nav>
      </div>
      <div className="l-contenedor l-footer-pie">
        <p>© {ANIO} RoomMatch</p>
      </div>
    </footer>
  )
}
