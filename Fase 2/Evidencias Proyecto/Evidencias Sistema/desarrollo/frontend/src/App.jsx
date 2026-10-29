import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Logo from './componentes/Logo.jsx'
import RutaProtegida from './componentes/RutaProtegida.jsx'
import Acceso from './paginas/Acceso.jsx'
import Alojamientos from './paginas/Alojamientos.jsx'
import DetallePublicacion from './paginas/DetallePublicacion.jsx'
import EditarPerfil from './paginas/EditarPerfil.jsx'
import FormPublicacion from './paginas/FormPublicacion.jsx'
import LayoutPerfil from './paginas/LayoutPerfil.jsx'
import Marco from './marco/Marco.jsx'
import MiPerfil from './paginas/MiPerfil.jsx'
import PerfilUsuario from './paginas/PerfilUsuario.jsx'
import Propuestas from './paginas/Propuestas.jsx'
import Roomies from './paginas/Roomies.jsx'
import PaginaVerificacion from './paginas/verificacion/PaginaVerificacion.jsx'
import RevisarSolicitud from './paginas/verificacion/RevisarSolicitud.jsx'
import SolicitudesVerificacion from './paginas/verificacion/SolicitudesVerificacion.jsx'
import { esAdmin } from './sesion/roles.js'
import { useSesion } from './sesion/SesionContext.jsx'

// La landing y el inicio se descargan solo cuando hacen falta (traen GSAP)
const Landing = lazy(() => import('./landing/Landing.jsx'))
const Inicio = lazy(() => import('./inicio/Inicio.jsx'))
// El cuestionario de convivencia también usa GSAP
const PaginaCuestionario = lazy(() => import('./cuestionario/PaginaCuestionario.jsx'))
const PestanaHabitos = lazy(() => import('./cuestionario/PestanaHabitos.jsx'))

// En «/»: quien no ha iniciado sesión ve la landing; quien sí, su página de inicio
function Raiz() {
  const { usuario, cargando } = useSesion()
  if (cargando) return <p className="cargando">Cargando…</p>
  // El cuestionario es obligatorio antes de entrar al inicio
  if (usuario && !esAdmin(usuario) && !usuario.cuestionario_completo) return <Navigate to="/cuestionario" replace />
  return (
    <Suspense fallback={usuario ? <p className="cargando">Cargando…</p> : null}>
      {usuario ? <Marco><Inicio /></Marco> : <Landing />}
    </Suspense>
  )
}

export default function App() {
  const { pathname } = useLocation()
  // La cabecera con el logo solo va en el acceso; la landing y las páginas con sesión traen su
  // propia navegación (las segundas, con el marco común: barra lateral y configuración)
  const enAcceso = pathname === '/login' || pathname === '/registro'

  return (
    <>
      {enAcceso && (
        <header className="cabecera">
          <Logo />
        </header>
      )}
      <Routes>
        <Route path="/" element={<Raiz />} />
        {/* HU-13: obligatorio justo después del registro, a pantalla completa y sin la barra */}
        <Route path="/cuestionario" element={
          <RutaProtegida sinCuestionario>
            <Suspense fallback={<p className="cargando">Cargando…</p>}><PaginaCuestionario /></Suspense>
          </RutaProtegida>
        } />
        {/* Páginas con sesión: comparten el marco (barra lateral y configuración), que no se
            desmonta al pasar de una a otra */}
        <Route element={<RutaProtegida><Marco /></RutaProtegida>}>
          {/* Ruta padre: el marco con las pestañas no se desmonta al cambiar de pestaña */}
          <Route path="/perfil" element={<LayoutPerfil />}>
            <Route index element={<MiPerfil />} />
            <Route path="editar" element={<EditarPerfil />} />
            <Route path="cuestionario" element={<Suspense fallback={null}><PestanaHabitos /></Suspense>} />
          </Route>
          <Route path="/usuarios/:id" element={<PerfilUsuario />} />
          {/* EP-03: publicación de alojamientos */}
          <Route path="/publicaciones/nueva" element={<FormPublicacion />} />
          <Route path="/publicaciones/:id/editar" element={<FormPublicacion />} />
          <Route path="/alojamientos/:id" element={<DetallePublicacion />} />
          {/* EP-04: búsqueda y filtros */}
          <Route path="/alojamientos" element={<Alojamientos />} />
          {/* EP-05: posibles roomies según la compatibilidad */}
          <Route path="/roomies" element={<Roomies />} />
          <Route path="/propuestas" element={<Propuestas />} />
          {/* EP-02: verificación de la condición de estudiante */}
          <Route path="/verificacion" element={<PaginaVerificacion />} />
          {/* HU-22: solo administradores */}
          <Route path="/admin/verificaciones" element={<RutaProtegida soloAdmin><SolicitudesVerificacion /></RutaProtegida>} />
          <Route path="/admin/verificaciones/:id" element={<RutaProtegida soloAdmin><RevisarSolicitud /></RutaProtegida>} />
        </Route>
        {/* Las publicaciones propias se ven y administran en el perfil; la dirección antigua lleva ahí */}
        <Route path="/publicaciones" element={<Navigate to="/perfil" replace />} />
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
