import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../componentes/Avatar.jsx'
import Logo, { IconoLogo } from '../componentes/Logo.jsx'
import {
  IconoBandera, IconoCampana, IconoContraer, IconoEscudo, IconoGrafico, IconoInicio, IconoLista, IconoLupa,
  IconoMatch, IconoMensajes, IconoPersonas, IconoSalir, IconoTuerca, IconoUsuario,
} from '../inicio/iconos.jsx'
import { mayusculaInicial } from '../inicio/utilidades.js'
import { useIndicador, useLatido } from '../paginas/admin/ui/animaciones.js'
import { useResumenAdmin } from './ResumenAdmin.jsx'

// Contador de pendientes: late una vez cuando cambia (por ejemplo, al resolver un reporte)
function ContadorNav({ n }) {
  const ref = useLatido(n, { escala: 1.35 })
  return <span ref={ref} className="a-nav-contador" aria-label={`${n} por revisar`}>{n > 99 ? '99+' : n}</span>
}

// Opciones de la barra. `a` es la ruta y `movil` el texto corto de la barra inferior (sin él, la
// opción no va en el celular). `oferente`: solo la ve quien ofrece un espacio
const OPCIONES_ESTUDIANTE = [
  { a: '/', texto: 'Inicio', movil: 'Inicio', Icono: IconoInicio },
  { a: '/mis-publicaciones', oferente: true, texto: 'Mis publicaciones', movil: 'Publicaciones', Icono: IconoLista },
  { a: '/alojamientos', texto: 'Buscar alojamiento', movil: 'Buscar', Icono: IconoLupa },
  // No caben 7 botones en el celular: «Encontrar roomie» queda en el inicio
  { a: '/roomies', texto: 'Encontrar roomie', Icono: IconoPersonas },
  { a: '/propuestas', texto: 'Propuestas de match', movil: 'Match', Icono: IconoMatch },
  // En el celular, «Mensajes» va arriba junto a la campana (abajo no caben más botones)
  { a: '/mensajes', texto: 'Mensajes', Icono: IconoMensajes, mensajes: true },
]

// Panel de administración (EP-02, EP-06, EP-07 y HU-20), agrupado por tarea. `contador` es la
// cifra de GET /admin/resumen que se muestra junto a la opción (lo que espera revisión)
const GRUPOS_ADMIN = [
  { titulo: 'Resumen', opciones: [{ a: '/admin', texto: 'Estadísticas', movil: 'Resumen', Icono: IconoGrafico }] },
  {
    titulo: 'Moderación',
    opciones: [
      { a: '/admin/reportes', texto: 'Reportes', movil: 'Reportes', Icono: IconoBandera, contador: 'reportes_pendientes' },
      { a: '/admin/verificaciones', texto: 'Verificaciones', movil: 'Verificar', Icono: IconoEscudo, contador: 'verificaciones_pendientes' },
    ],
  },
  {
    titulo: 'Gestión',
    opciones: [
      { a: '/admin/usuarios', texto: 'Usuarios', movil: 'Usuarios', Icono: IconoPersonas },
      { a: '/admin/publicaciones', texto: 'Publicaciones', movil: 'Publicaciones', Icono: IconoLista },
    ],
  },
]
const OPCIONES_ADMIN = GRUPOS_ADMIN.flatMap((g) => g.opciones)

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
      {estudiante && usuario.verificacion_estado !== 'verificado' && (
        <Link to="/perfil/verificacion" className="i-menu-opcion"><IconoEscudo /> Verificar que soy estudiante</Link>
      )}
      <button type="button" className="i-menu-opcion peligro" onClick={cerrarSesion}>
        <IconoSalir /> Cerrar sesión
      </button>
    </div>
  )
}

/**
 * Navegación de las páginas con sesión: barra lateral contraíble en escritorio y barra inferior en móvil.
 * Muestra las opciones del estudiante o las del panel de administración según el rol.
 * El perfil se abre desde la cuenta y publicar, desde el inicio o «Mis publicaciones».
 */
export default function Navegacion({
  usuario, cerrarSesion, contraida, setContraida, abrirConfig, abrirAvisos, noLeidas, mensajesSinLeer = 0, pathname,
}) {
  const admin = usuario.rol === 'administrador'
  // Admin: el fondo de la opción actual se desliza a la nueva en vez de saltar
  const gruposAdmin = useIndicador(`${pathname}-${contraida}`, '.i-nav-item[aria-current="page"]')
  // En el admin, la ficha de un usuario o de un reporte también marca su sección; una conversación marca «Mensajes»
  const actual = (ruta) => (
    pathname === ruta || ((admin || ruta === '/mensajes') && ruta !== '/admin' && pathname.startsWith(`${ruta}/`))
      ? 'page' : undefined
  )
  const { resumen } = useResumenAdmin()
  const cifra = (clave) => (clave && resumen ? resumen[clave] : 0)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const idMenu = useId()
  const nombre = mayusculaInicial(usuario.nombre)
  // Quien busca dónde vivir no publica: «Mis publicaciones» solo la ve el oferente
  const opciones = admin
    ? OPCIONES_ADMIN
    : OPCIONES_ESTUDIANTE.filter((o) => !(o.oferente && usuario.modo === 'buscador'))

  const contador = noLeidas > 0 && (
    <span className="i-contador" aria-label={`${noLeidas} sin leer`}>{noLeidas > 99 ? '99+' : noLeidas}</span>
  )
  const contadorMensajes = mensajesSinLeer > 0 && (
    <span className="i-contador" aria-label={`${mensajesSinLeer} mensajes sin leer`}>
      {mensajesSinLeer > 99 ? '99+' : mensajesSinLeer}
    </span>
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

  // Contador de pendientes de la opción (solo en el admin y cuando hay algo)
  const contadorDe = (clave) => {
    const n = cifra(clave)
    if (!n) return null
    return <ContadorNav n={n} />
  }

  const opcionLateral = ({ a, texto, Icono, contador: clave, mensajes }) => (
    <li key={texto}>
      <Link to={a} className="i-nav-item" aria-current={actual(a)} data-titulo={cifra(clave) ? `${texto} (${cifra(clave)})` : texto}>
        <Icono /> <span className="i-nav-texto">{texto}</span>{contadorDe(clave)}{mensajes && contadorMensajes}
      </Link>
    </li>
  )

  const opcionMovil = ({ a, movil, Icono, contador: clave }) => (
    <Link key={movil} to={a} className="i-movil-item" aria-current={actual(a)}><Icono /><span>{movil}</span>{contadorDe(clave)}</Link>
  )
  const enMovil = opciones.filter((o) => o.movil)

  return (
    <>
      <aside className={`i-barra${contraida ? ' contraida' : ''}`}>
        <div className="i-barra-logo">
          {contraida ? (
            <Link to="/" className="i-logo-solo" aria-label="RoomMatch, ir al inicio"><IconoLogo tamano={40} /></Link>
          ) : <Logo />}
        </div>

        {admin && (
          <span className="a-barra-insignia">
            <IconoEscudo /> Administración
          </span>
        )}

        <nav aria-label="Principal">
          {admin ? (
            <div ref={gruposAdmin} className="a-nav-grupos">
              {GRUPOS_ADMIN.map((g) => (
                <div key={g.titulo}>
                  <p className="a-nav-grupo-titulo" id={`nav-${g.titulo}`}>{g.titulo}</p>
                  <ul className="i-nav" aria-labelledby={`nav-${g.titulo}`}>{g.opciones.map(opcionLateral)}</ul>
                </div>
              ))}
            </div>
          ) : (
            <ul className="i-nav">{opciones.map(opcionLateral)}</ul>
          )}
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
        {!admin && (
          <Link to="/mensajes" className="i-movil-avisos i-movil-mensajes" aria-current={actual('/mensajes')}
            aria-label={mensajesSinLeer ? `Mensajes, ${mensajesSinLeer} sin leer` : 'Mensajes'}>
            <IconoMensajes /> {contadorMensajes}
          </Link>
        )}
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
