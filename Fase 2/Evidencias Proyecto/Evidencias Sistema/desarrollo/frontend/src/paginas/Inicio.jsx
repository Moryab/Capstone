import { useSesion } from '../sesion/SesionContext.jsx'

// Página provisoria tras iniciar sesión; aquí irán perfil, búsqueda y match
export default function Inicio() {
  const { usuario, cerrarSesion } = useSesion()

  return (
    <main className="tarjeta">
      <h1>Hola, {usuario.nombre}</h1>
      <p className="subtitulo">{usuario.correo}</p>

      {!usuario.perfil_completo && (
        <p className="alerta">
          Tu perfil está incompleto. Complétalo para poder buscar alojamiento y roomie.
        </p>
      )}

      <button type="button" className="secundario" onClick={cerrarSesion}>
        Cerrar sesión
      </button>
    </main>
  )
}
