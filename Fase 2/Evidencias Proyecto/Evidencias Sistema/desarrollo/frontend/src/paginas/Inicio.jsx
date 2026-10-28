import { Link } from 'react-router-dom'
import { describirFaltantes } from '../perfil.js'
import { useSesion } from '../sesion/SesionContext.jsx'

// Página provisoria tras iniciar sesión; aquí irán búsqueda y match
export default function Inicio() {
  const { usuario, cerrarSesion } = useSesion()

  return (
    <main className="tarjeta">
      <h1>Hola, {usuario.nombre}</h1>
      <p className="subtitulo">{usuario.correo}</p>

      {/* CA-03.5: mientras falte algo, se recuerda qué falta */}
      {!usuario.perfil_completo && (
        <p className="alerta">
          Tu perfil está incompleto. Complétalo para poder buscar alojamiento y roomie.
          {usuario.campos_faltantes.length > 0 && (
            <> Falta: {describirFaltantes(usuario.campos_faltantes)}.</>
          )}
        </p>
      )}

      <div className="acciones">
        <button type="button" className="boton secundario" onClick={cerrarSesion}>
          Cerrar sesión
        </button>
        {/* Con el perfil incompleto se va directo al formulario */}
        <Link to={usuario.perfil_completo ? '/perfil' : '/perfil/editar'} className="boton">
          {usuario.perfil_completo ? 'Mi perfil' : 'Completar perfil'}
        </Link>
      </div>
    </main>
  )
}
