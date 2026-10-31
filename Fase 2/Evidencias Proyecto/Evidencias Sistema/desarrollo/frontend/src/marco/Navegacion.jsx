import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../componentes/Avatar.jsx'
import Logo, { IconoLogo } from '../componentes/Logo.jsx'
import {
  IconoBandera, IconoCampana, IconoContraer, IconoEscudo, IconoGrafico, IconoInicio, IconoLista, IconoLupa,
  IconoMatch, IconoPersonas, IconoSalir, IconoTuerca, IconoUsuario,
} from '../inicio/iconos.jsx'
import { mayusculaInicial } from '../inicio/utilidades.js'

// Opciones de la barra. `a` es la ruta; «Mis publicaciones» es un botón que baja a esa tarjeta del
// inicio. `movil` es el texto corto de la barra inferior (sin él, la opción no va en el celular)
const OPCIONES_ESTUDIANTE = [
  { a: '/', texto: 'Inicio', movil: 'Inicio', Icono: IconoInicio },
  { publicaciones: true, texto: 'Mis publicaciones', movil: 'Publicaciones', Icono: IconoLista },
  { a: '/alojamientos', texto: 'Buscar alojamiento', movil: 'Buscar', Icono: IconoLupa },
  // No caben 7 botones en el celular: «Encontrar roomie» queda en el inicio
  { a: '/roomies', texto: 'Encontrar roomie', Icono: IconoPersonas },
  { a: '/propuestas', texto: 'Propuestas de match', movil: 'Match', Icono: IconoMatch },
]

// Panel de administración (EP-02, EP-06, EP-07 y HU-20)
const OPCIONES_ADMIN = [
  { a: '/admin', texto: 'Estadísticas', movil: 'Resumen', Icono: IconoGrafico },
  { a: '/admin/reportes', texto: 'Reportes', movil: 'Reportes', Icono: IconoBandera },
  { a: '/admin/verificaciones', texto: 'Verificaciones', movil: 'Verificar', Icono: IconoEscudo },
  { a: '/admin/usuarios', texto: 'Usuarios', movil: 'Usuarios', Icono: IconoPersonas },
  { a: '/admin/publicaciones', texto: 'Publicaciones', movil: 'Publicaciones', Icono: IconoLista },
]

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
  const estudiante = usuario.rol !== 'administrador'
  return (
    <div ref={ref} id={idMenu} className={`i-menu ${className}`}>
      <div className="i-menu-cabecera">
        <strong>{mayusculaInicial(usuario.nombre)} {usuario.ap_paterno}</strong>
        <span>{usuario.correo}</span>
      </div>
      {estudiante && <Link to="/perfil" className="i-menu-opcion"><IconoUsuario /> Ver mi perfil</Link>}
      {/* EP-02 · HU-21 */}
      {estudiante && <Link to="/verificacion" className="i-menu-opcion"><IconoEscudo /> Verificar que soy estudiante</Link>}
      <button type="button" className="i-menu-opcion peligro" onClick={cerrarSesion}>
        <IconoSalir /> Cerrar sesión
      </button>
    </div>
  )
}

/**
 * Navegación de las páginas con sesión: barra lateral contraíble en escritorio y barra inferior en móvil.
 * Muestra las opciones del estudiante o las del panel de administración según el rol.
 * «Mis publicaciones» baja hasta esa tarjeta del inicio. El perfil se abre desde la cuenta
 * y publicar, desde la tarjeta grande del inicio.
 */
export default function Navegacion({
  usuario, cerrarSesion, irAPublicaciones, contraida, setContraida, abrirConfig, abrirAvisos, noLeidas, pathname,
}) {
  const actual = (ruta) => (pathname === ruta ? 'page' : undefined)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const idMenu = useId()
  const nombre = mayusculaInicial(usuario.nombre)
  const admin = usuario.rol === 'administrador'
  // Quien busca dónde vivir no publica: «Mis publicaciones» solo la ve el oferente
  const opciones = admin
    ? OPCIONES_ADMIN
    : OPCIONES_ESTUDIANTE.filter((o) => !(o.publicaciones && usuario.modo === 'buscador'))

  const contador = noLeidas > 0 && (
    <span className="i-contador" aria-label={`${noLeidas} sin leer`}>{noLeidas > 99 ? '99+' : noLeidas}</span>
  )

  const botonCuenta = (clase, conTexto, controla) => (
    <button type="button" className={clase} data-abre-cuenta aria-haspopup="true"
      aria-expanded={menuAbierto} aria-controls={controla} onClick={() => setMenuAbierto((a) => !a)}>
      <Avatar nombre={usuario.nombre} apellido={usuario.ap_paterno} foto={usuario.foto_url} tamano={conTexto ? 40 : 26} />
      {conTexto ? (
        <span className="i-cuenta-textos">
          <strong>{nombre}</strong>
          <span>{admin ? 'Administración' : 'Mi cuenta'}</span>
        </span>
      ) : <span>Cuenta</span>}
    </button>
  )

  const opcionLateral = ({ a, publicaciones, texto, Icono }) => (
    <li key={texto}>
      {publicaciones ? (
        <button type="button" className="i-nav-item" onClick={irAPublicaciones} data-titulo={texto}>
          <Icono /> <span className="i-nav-texto">{texto}</span>
        </button>
      ) : (
        <Link to={a} className="i-nav-item" aria-current={actual(a)} data-titulo={texto}>
          <Icono /> <span className="i-nav-texto">{texto}</span>
        </Link>
      )}
    </li>
  )

  const opcionMovil = ({ a, publicaciones, movil, Icono }) => (publicaciones ? (
    <button key={movil} type="button" className="i-movil-item" onClick={irAPublicaciones}><Icono /><span>{movil}</span></button>
  ) : (
    <Link key={movil} to={a} className="i-movil-item" aria-current={actual(a)}><Icono /><span>{movil}</span></Link>
  ))
  const enMovil = opciones.filter((o) => o.movil)

  return (
    <>
      <aside className={`i-barra${contraida ? ' contraida' : ''}`}>
        <div className="i-barra-logo">
          {contraida ? (
            <Link to="/" className="i-logo-solo" aria-label="RoomMatch, ir al inicio"><IconoLogo tamano={40} /></Link>
          ) : <Logo />}
        </div>

        <nav aria-label="Principal">
          <ul className="i-nav">{opciones.map(opcionLateral)}</ul>
        </nav>

        <div className="i-barra-pie">
          <button type="button" className="i-nav-item" onClick={abrirAvisos} aria-haspopup="dialog" data-titulo="Avisos">
            <IconoCampana /> <span className="i-nav-texto">Avisos</span> {contador}
          </button>
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

      {/* Móvil: logo y campana arriba, y barra de navegación inferior */}
      <header className="i-barra-superior">
        <Logo />
        <button type="button" className="i-movil-avisos" onClick={abrirAvisos} aria-haspopup="dialog" aria-label="Avisos">
          <IconoCampana /> {contador}
        </button>
      </header>
      <nav className="i-nav-movil" aria-label="Principal (móvil)" style={{ gridTemplateColumns: `repeat(${enMovil.length + (admin ? 1 : 2)}, 1fr)` }}>
        {enMovil.map(opcionMovil)}
        {!admin && (
          <button type="button" className="i-movil-item" onClick={abrirConfig} aria-haspopup="dialog"><IconoTuerca /><span>Ajustes</span></button>
        )}
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
