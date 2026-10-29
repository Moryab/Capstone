import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../componentes/Avatar.jsx'
import Logo, { IconoLogo } from '../componentes/Logo.jsx'
import {
  IconoContraer, IconoInicio, IconoLista, IconoSalir, IconoTuerca, IconoUsuario,
} from '../inicio/iconos.jsx'
import { mayusculaInicial } from '../inicio/utilidades.js'

// Menú de la cuenta (ver perfil / cerrar sesión). Se cierra con Escape o al hacer clic afuera
function MenuCuenta({ usuario, cerrarSesion, abierto, setAbierto, idMenu, className }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!abierto) return undefined
    const fuera = (e) => {
      // Hay dos menús montados (escritorio y móvil): un clic en cualquiera de ellos no lo cierra
      if (!e.target.closest('.i-menu, [data-abre-cuenta]')) setAbierto(false)
    }
    const tecla = (e) => e.key === 'Escape' && setAbierto(false)
    document.addEventListener('pointerdown', fuera)
    document.addEventListener('keydown', tecla)
    ref.current?.querySelector('a, button')?.focus()
    return () => {
      document.removeEventListener('pointerdown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [abierto, setAbierto])

  if (!abierto) return null
  return (
    <div ref={ref} id={idMenu} className={`i-menu ${className}`}>
      <div className="i-menu-cabecera">
        <strong>{mayusculaInicial(usuario.nombre)} {usuario.ap_paterno}</strong>
        <span>{usuario.correo}</span>
      </div>
      <Link to="/perfil" className="i-menu-opcion"><IconoUsuario /> Ver mi perfil</Link>
      <button type="button" className="i-menu-opcion peligro" onClick={cerrarSesion}>
        <IconoSalir /> Cerrar sesión
      </button>
    </div>
  )
}

/**
 * Navegación de las páginas con sesión: barra lateral contraíble en escritorio y barra inferior en móvil.
 * «Mis publicaciones» baja hasta esa tarjeta del inicio. El perfil se abre desde la cuenta
 * y publicar, desde la tarjeta grande del inicio.
 */
export default function Navegacion({ usuario, cerrarSesion, irAPublicaciones, contraida, setContraida, abrirConfig, enInicio }) {
  const actual = enInicio ? 'page' : undefined
  const [menuAbierto, setMenuAbierto] = useState(false)
  const idMenu = useId()
  const nombre = mayusculaInicial(usuario.nombre)

  const botonCuenta = (clase, conTexto, controla) => (
    <button type="button" className={clase} data-abre-cuenta aria-haspopup="true"
      aria-expanded={menuAbierto} aria-controls={controla} onClick={() => setMenuAbierto((a) => !a)}>
      <Avatar nombre={usuario.nombre} apellido={usuario.ap_paterno} foto={usuario.foto_url} tamano={conTexto ? 40 : 26} />
      {conTexto ? (
        <span className="i-cuenta-textos">
          <strong>{nombre}</strong>
          <span>Mi cuenta</span>
        </span>
      ) : <span>Cuenta</span>}
    </button>
  )

  return (
    <>
      <aside className={`i-barra${contraida ? ' contraida' : ''}`}>
        <div className="i-barra-logo">
          {contraida ? (
            <Link to="/" className="i-logo-solo" aria-label="RoomMatch, ir al inicio"><IconoLogo tamano={40} /></Link>
          ) : <Logo />}
        </div>

        <nav aria-label="Principal">
          <ul className="i-nav">
            <li>
              <Link to="/" className="i-nav-item" aria-current={actual} data-titulo="Inicio">
                <IconoInicio /> <span className="i-nav-texto">Inicio</span>
              </Link>
            </li>
            <li>
              <button type="button" className="i-nav-item" onClick={irAPublicaciones} data-titulo="Mis publicaciones">
                <IconoLista /> <span className="i-nav-texto">Mis publicaciones</span>
              </button>
            </li>
          </ul>
        </nav>

        <div className="i-barra-pie">
          <button type="button" className="i-nav-item" onClick={abrirConfig} aria-haspopup="dialog" data-titulo="Configuración">
            <IconoTuerca /> <span className="i-nav-texto">Configuración</span>
          </button>
          <button type="button" className="i-nav-item i-contraer" onClick={() => setContraida(!contraida)}
            aria-pressed={contraida} data-titulo={contraida ? 'Expandir barra' : 'Contraer barra'}>
            <IconoContraer /> <span className="i-nav-texto">{contraida ? 'Expandir' : 'Contraer barra'}</span>
            {contraida && <span className="visualmente-oculto">Expandir barra lateral</span>}
          </button>
          <div className="i-cuenta">
            {botonCuenta('i-cuenta-boton', !contraida, idMenu)}
            <MenuCuenta usuario={usuario} cerrarSesion={cerrarSesion} abierto={menuAbierto}
              setAbierto={setMenuAbierto} idMenu={idMenu} className="lateral" />
          </div>
        </div>
      </aside>

      {/* Móvil: logo arriba y barra de navegación inferior */}
      <header className="i-barra-superior">
        <Logo />
      </header>
      <nav className="i-nav-movil" aria-label="Principal (móvil)">
        <Link to="/" className="i-movil-item" aria-current={actual}><IconoInicio /><span>Inicio</span></Link>
        <button type="button" className="i-movil-item" onClick={irAPublicaciones}><IconoLista /><span>Publicaciones</span></button>
        <button type="button" className="i-movil-item" onClick={abrirConfig} aria-haspopup="dialog"><IconoTuerca /><span>Ajustes</span></button>
        <div className="i-cuenta movil">
          {botonCuenta('i-movil-item', false, `${idMenu}-movil`)}
        </div>
      </nav>
      {/* En móvil el menú se abre como hoja desde abajo; comparte estado con el de escritorio */}
      <MenuCuenta usuario={usuario} cerrarSesion={cerrarSesion} abierto={menuAbierto}
        setAbierto={setMenuAbierto} idMenu={`${idMenu}-movil`} className="hoja" />
    </>
  )
}
