import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Logo from './componentes/Logo.jsx'
import RutaAdmin from './componentes/RutaAdmin.jsx'
import RutaProtegida from './componentes/RutaProtegida.jsx'
import Acceso from './paginas/Acceso.jsx'
import Alojamientos from './paginas/Alojamientos.jsx'
import DetallePublicacion from './paginas/DetallePublicacion.jsx'
import EditarPerfil from './paginas/EditarPerfil.jsx'
import FormPublicacion from './paginas/FormPublicacion.jsx'
import LayoutPerfil, { CargandoPerfil } from './paginas/LayoutPerfil.jsx'
import Marco from './marco/Marco.jsx'
import Propuestas from './paginas/Propuestas.jsx'
import Roomies from './paginas/Roomies.jsx'
// Páginas de cada área de trabajo: cada una la completa quien tiene esas historias
import DetallePublicacionAdmin from './paginas/admin/DetallePublicacionAdmin.jsx'
import DetalleReporte from './paginas/admin/DetalleReporte.jsx'
import DetalleUsuario from './paginas/admin/DetalleUsuario.jsx'
import DetalleVerificacion from './paginas/admin/DetalleVerificacion.jsx'
import Estadisticas from './paginas/admin/Estadisticas.jsx'
import PublicacionesAdmin from './paginas/admin/Publicaciones.jsx'
import Reportes from './paginas/admin/Reportes.jsx'
import Usuarios from './paginas/admin/Usuarios.jsx'
import Verificaciones from './paginas/admin/Verificaciones.jsx'
import Evaluacion from './paginas/evaluacion/Evaluacion.jsx'
import Razones from './paginas/evaluacion/Razones.jsx'
import Verificacion from './paginas/verificacion/Verificacion.jsx'
import { useSesion } from './sesion/SesionContext.jsx'

// La landing y el inicio se descargan solo cuando hacen falta (traen GSAP)
const Landing = lazy(() => import('./landing/Landing.jsx'))
const Inicio = lazy(() => import('./inicio/Inicio.jsx'))
// Las páginas de perfil usan GSAP: se descargan aparte para no pesar en el resto de la app
const MiPerfil = lazy(() => import('./paginas/MiPerfil.jsx'))
const PerfilUsuario = lazy(() => import('./paginas/PerfilUsuario.jsx'))
const VistaPublica = lazy(() => import('./paginas/VistaPublica.jsx'))
const conCarga = (pagina) => <Suspense fallback={<div className="contenedor-perfil"><CargandoPerfil /></div>}>{pagina}</Suspense>
// El cuestionario de convivencia también usa GSAP
const PaginaCuestionario = lazy(() => import('./cuestionario/PaginaCuestionario.jsx'))
const PestanaHabitos = lazy(() => import('./cuestionario/PestanaHabitos.jsx'))

// En «/»: quien no ha iniciado sesión ve la landing; quien sí, su página de inicio
function Raiz() {
  const { usuario, cargando } = useSesion()
  if (cargando) return <p className="cargando">Cargando…</p>
  if (usuario?.rol === 'administrador') return <Navigate to="/admin" replace />
  // El cuestionario es obligatorio antes de entrar al inicio
  if (usuario && !usuario.cuestionario_completo) return <Navigate to="/cuestionario" replace />
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
            <Route index element={<Suspense fallback={<CargandoPerfil />}><MiPerfil /></Suspense>} />
            <Route path="editar" element={<EditarPerfil />} />
            <Route path="cuestionario" element={<Suspense fallback={null}><PestanaHabitos /></Suspense>} />
          </Route>
          <Route path="/usuarios/:id" element={conCarga(<PerfilUsuario />)} />
          {/* Vista previa del propio perfil como lo ven los demás */}
          <Route path="/perfil-publico" element={conCarga(<VistaPublica />)} />
          {/* EP-03: publicación de alojamientos */}
          <Route path="/publicaciones/nueva" element={<FormPublicacion />} />
          <Route path="/publicaciones/:id/editar" element={<FormPublicacion />} />
          <Route path="/alojamientos/:id" element={<DetallePublicacion />} />
          {/* EP-04: búsqueda y filtros */}
          <Route path="/alojamientos" element={<Alojamientos />} />
          {/* EP-05: posibles roomies según la compatibilidad */}
          <Route path="/roomies" element={<Roomies />} />
          <Route path="/propuestas" element={<Propuestas />} />
          {/* EP-08: seguimiento post-match (HU-18 y HU-19) */}
          <Route path="/evaluacion/:matchId" element={<Evaluacion />} />
          <Route path="/evaluacion/:matchId/razones" element={<Razones />} />
          {/* EP-02: verificación de estudiante (HU-21) */}
          <Route path="/verificacion" element={<Verificacion />} />
        </Route>
        {/* Panel de administración: mismo marco, con las opciones del administrador */}
        <Route element={<RutaAdmin><Marco /></RutaAdmin>}>
          <Route path="/admin" element={<Estadisticas />} />{/* HU-20 */}
          <Route path="/admin/reportes" element={<Reportes />} />{/* HU-26 */}
          <Route path="/admin/reportes/:id" element={<DetalleReporte />} />{/* HU-26 y HU-27 */}
          <Route path="/admin/verificaciones" element={<Verificaciones />} />{/* HU-22 */}
          <Route path="/admin/verificaciones/:id" element={<DetalleVerificacion />} />{/* HU-22 */}
          <Route path="/admin/usuarios" element={<Usuarios />} />{/* HU-28 */}
          <Route path="/admin/usuarios/:id" element={<DetalleUsuario />} />{/* HU-28 */}
          <Route path="/admin/publicaciones" element={<PublicacionesAdmin />} />{/* HU-29 */}
          <Route path="/admin/publicaciones/:id" element={<DetallePublicacionAdmin />} />{/* HU-29 y HU-30 */}
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
