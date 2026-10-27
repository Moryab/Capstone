import { Navigate, Route, Routes } from 'react-router-dom'
import RutaProtegida from './componentes/RutaProtegida.jsx'
import Inicio from './paginas/Inicio.jsx'
import Login from './paginas/Login.jsx'
import Registro from './paginas/Registro.jsx'

export default function App() {
  return (
    <>
      <header className="cabecera">RoomMatch</header>
      <Routes>
        <Route path="/" element={<RutaProtegida><Inicio /></RutaProtegida>} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
