import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { api } from '../api.js'
import BotonReportar from '../componentes/BotonReportar.jsx'
import { useCompatibilidad } from '../componentes/Compatibilidad.jsx'
import { useFondoCiudad } from '../fondo.js'
import Compatibilidad from '../perfil/Compatibilidad.jsx'
import DatosClave from '../perfil/DatosClave.jsx'
import { BarraEstadoMatch, TarjetaContacto, TarjetaEstadoMatch } from '../perfil/EstadoMatch.jsx'
import { useMatchCon } from '../perfil/useMatchCon.js'
import Habitos from '../perfil/Habitos.jsx'
import PaginaPerfil from '../perfil/PaginaPerfil.jsx'
import { PublicacionesDe } from '../perfil/Publicaciones.jsx'
import SobreMi from '../perfil/SobreMi.jsx'
import { useSesion } from '../sesion/SesionContext.jsx'
import { CargandoPerfil } from './LayoutPerfil.jsx'

// HU-16: perfil de otro estudiante (/usuarios/:id). Su descripción y, enseguida, la compatibilidad entre ambos (CA-16.2)
// y, al costado, el estado del match con esa persona y su contacto
export default function PerfilUsuario() {
  const { id } = useParams()
  const { usuario } = useSesion()
  const { state } = useLocation()
  const [resultado, setResultado] = useState({ id: null, perfil: null, error: '' })
  const compat = useCompatibilidad(id === usuario.id ? null : id)
  const match = useMatchCon(id === usuario.id ? null : id)

  useFondoCiudad()

  const cargar = useCallback(() => {
    let vigente = true // evita mostrar una respuesta vieja si se cambia de perfil rápido
    api(`/usuarios/${id}/perfil`)
      .then((perfil) => vigente && setResultado({ id, perfil, error: '' }))
      .catch((err) => vigente && setResultado({ id, perfil: null, error: err.message }))
    return () => {
      vigente = false
    }
  }, [id])

  useEffect(() => {
    if (id === usuario.id) return undefined
    return cargar()
  }, [id, usuario.id, cargar])

  // El propio perfil se ve en «Mi perfil», donde además se puede editar
  if (id === usuario.id) return <Navigate to="/perfil" replace />
  if (resultado.id !== id) return <div className="contenedor-perfil"><CargandoPerfil /></div>

  // CA-16.4: cuenta suspendida o inexistente
  if (resultado.error) {
    return (
      <main className="tarjeta">
        <h1>{resultado.error}</h1>
        <p className="subtitulo">Es posible que la cuenta ya no esté activa.</p>
        <Link to="/" className="boton">Volver al inicio</Link>
      </main>
    )
  }

  const { perfil } = resultado
  // La importancia de cada hábito de la otra persona llega con el cálculo de compatibilidad
  const importancia = compat.estado === 'lista'
    ? Object.fromEntries(compat.datos.detalle.map((d) => [d.categoria, d.su_importancia]))
    : null

  return (
    <div className="contenedor-perfil">
      {/* Desde «Posibles roomies» o un alojamiento se vuelve a esa misma página */}
      <Link to={state?.desde ?? '/'} className="volver">← Volver</Link>
      <PaginaPerfil perfil={perfil} modo="otro"
        acciones={<BotonReportar tipo="perfil" id={id} nombre={perfil.nombre} />}
        principal={(
          <>
            {/* Primero quién es la persona; después, qué tan compatibles son */}
            <SobreMi perfil={perfil} />
            <Compatibilidad estado={compat.estado} datos={compat.datos} nombre={perfil.nombre}
              yoCompleto={usuario.cuestionario_completo} otroCompleto={Boolean(perfil.habitos)} />
            <Habitos perfil={perfil} importancia={importancia} />
            <PublicacionesDe usuarioId={id} nombre={perfil.nombre} />
          </>
        )}
        lateral={(
          <>
            {/* Al confirmarse el match se recarga el perfil para mostrar el teléfono */}
            <TarjetaEstadoMatch match={match} nombre={perfil.nombre} alCambiar={cargar} />
            <TarjetaContacto perfil={perfil} />
            <DatosClave perfil={perfil} />
          </>
        )}
        pie={<BarraEstadoMatch match={match} />} />
    </div>
  )
}
