import { Navigate, Route, Routes } from 'react-router-dom'
import Logo from './componentes/Logo.jsx'
import RutaProtegida from './componentes/RutaProtegida.jsx'
import Acceso from './paginas/Acceso.jsx'
import Inicio from './paginas/Inicio.jsx'

export default function App() {
  return (
    <>
      <header className="cabecera">
        <Logo />
      </header>
      <Routes>
        <Route path="/" element={<RutaProtegida><Inicio /></RutaProtegida>} />
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
