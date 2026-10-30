import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { useFondoCiudad } from '../fondo.js'
import Compatibilidad from '../perfil/Compatibilidad.jsx'
import DatosClave from '../perfil/DatosClave.jsx'
import { IconoOjo } from '../perfil/iconos.jsx'
import { TarjetaContacto, TarjetaEstadoMatch } from '../perfil/EstadoMatch.jsx'
import Habitos from '../perfil/Habitos.jsx'
import PaginaPerfil from '../perfil/PaginaPerfil.jsx'
import { PublicacionesDe } from '../perfil/Publicaciones.jsx'
import SobreMi from '../perfil/SobreMi.jsx'
import { marcarTransicionPerfil } from '../perfil/transicion.js'
import { useSesion } from '../sesion/SesionContext.jsx'
import { CargandoPerfil } from './LayoutPerfil.jsx'

/**
 * «Ver como me ven»: el propio perfil igual a como lo ve otro estudiante en /usuarios/:id (HU-16),
 * sin controles de edición ni avisos privados y sin el teléfono (que solo ven los matches).
 */
export default function VistaPublica() {
  const { usuario } = useSesion()
  const [perfil, setPerfil] = useState(null)
  const [error, setError] = useState('')
  useFondoCiudad()

  useEffect(() => {
    api(`/usuarios/${usuario.id}/perfil`)
      // Como lo vería cualquier otro estudiante sin match contigo: sin el teléfono
      .then((datos) => setPerfil({ ...datos, es_propio: false, contacto_visible: false, telefono: null }))
      .catch((err) => setError(err.message))
  }, [usuario.id])

  return (
    <div className="contenedor-perfil">
      <div className="p2-vista-previa-barra">
        <Link to="/perfil" viewTransition onClick={marcarTransicionPerfil} className="volver">← Volver a mi perfil</Link>
        <span className="p2-vista-previa-etiqueta"><IconoOjo /> Vista previa: así te ven otros estudiantes</span>
      </div>
      {error && <p className="alerta" role="alert">{error}</p>}
      {!perfil && !error && <CargandoPerfil />}
      {perfil && (
        <PaginaPerfil perfil={perfil} modo="otro"
          principal={(
            <>
              <SobreMi perfil={perfil} />
              <Compatibilidad vistaPrevia nombre={perfil.nombre} />
              <Habitos perfil={perfil} />
              <PublicacionesDe usuarioId={usuario.id} nombre={perfil.nombre} />
            </>
          )}
          lateral={(
            <>
              <TarjetaEstadoMatch match={{ estado: 'ninguna', propuesta: null }} nombre={perfil.nombre} />
              <TarjetaContacto perfil={perfil} />
              <DatosClave perfil={perfil} />
            </>
          )} />
      )}
    </div>
  )
}
