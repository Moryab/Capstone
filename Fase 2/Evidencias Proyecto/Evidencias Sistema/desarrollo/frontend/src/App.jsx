import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Logo from './componentes/Logo.jsx'
import RutaProtegida from './componentes/RutaProtegida.jsx'
import Acceso from './paginas/Acceso.jsx'
import EditarPerfil from './paginas/EditarPerfil.jsx'
import Inicio from './paginas/Inicio.jsx'
import LayoutPerfil from './paginas/LayoutPerfil.jsx'
import MiPerfil from './paginas/MiPerfil.jsx'
import PerfilUsuario from './paginas/PerfilUsuario.jsx'
import { useSesion } from './sesion/SesionContext.jsx'

// La landing se descarga solo cuando hace falta (trae GSAP y Lenis)
const Landing = lazy(() => import('./landing/Landing.jsx'))

// En «/»: quien no ha iniciado sesión ve la landing; quien sí, su página de inicio
function Raiz() {
  const { usuario, cargando } = useSesion()
  if (cargando) return <p className="cargando">Cargando…</p>
  if (usuario) return <Inicio />
  return (
    <Suspense fallback={null}>
      <Landing />
    </Suspense>
  )
}

export default function App() {
  const { usuario, cargando } = useSesion()
  const { pathname } = useLocation()
  // La landing trae su propia barra de navegación
  const enLanding = pathname === '/' && !usuario && !cargando

  return (
    <>
      {!enLanding && (
        <header className="cabecera">
          <Logo />
        </header>
      )}
      <Routes>
        <Route path="/" element={<Raiz />} />
        {/* Ruta padre: el marco con las pestañas no se desmonta al cambiar de pestaña */}
        <Route path="/perfil" element={<RutaProtegida><LayoutPerfil /></RutaProtegida>}>
          <Route index element={<MiPerfil />} />
          <Route path="editar" element={<EditarPerfil />} />
        </Route>
        <Route path="/usuarios/:id" element={<RutaProtegida><PerfilUsuario /></RutaProtegida>} />
        {/* Ruta padre compartida: Acceso no se desmonta al cambiar entre /login y /registro,
            así el panel se desliza en vez de recargar la página */}
        <Route element={<Acceso />}>
          <Route path="/login" element={null} />
          <Route path="/registro" element={null} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
