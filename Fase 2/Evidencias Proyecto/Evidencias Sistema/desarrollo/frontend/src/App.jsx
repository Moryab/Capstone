import { Navigate, Route, Routes } from 'react-router-dom'
import Logo from './componentes/Logo.jsx'
import RutaProtegida from './componentes/RutaProtegida.jsx'
import Acceso from './paginas/Acceso.jsx'
import EditarPerfil from './paginas/EditarPerfil.jsx'
import Inicio from './paginas/Inicio.jsx'
import LayoutPerfil from './paginas/LayoutPerfil.jsx'
import MiPerfil from './paginas/MiPerfil.jsx'
import PerfilUsuario from './paginas/PerfilUsuario.jsx'

export default function App() {
  return (
    <>
      <header className="cabecera">
        <Logo />
      </header>
      <Routes>
        <Route path="/" element={<RutaProtegida><Inicio /></RutaProtegida>} />
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
