import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { api } from '../api.js'
import VistaPerfil from '../componentes/VistaPerfil.jsx'
import { useFondoCiudad } from '../fondo.js'
import { useSesion } from '../sesion/SesionContext.jsx'

// HU-16: perfil de otro estudiante (/usuarios/:id). Desde aquí enlazarán la lista de posibles roomies
export default function PerfilUsuario() {
  const { id } = useParams()
  const { usuario } = useSesion()
  const [resultado, setResultado] = useState({ id: null, perfil: null, error: '' })

  useFondoCiudad()

  useEffect(() => {
    if (id === usuario.id) return
    let vigente = true // evita mostrar una respuesta vieja si se cambia de perfil rápido
    api(`/usuarios/${id}/perfil`)
      .then((perfil) => vigente && setResultado({ id, perfil, error: '' }))
      .catch((err) => vigente && setResultado({ id, perfil: null, error: err.message }))
    return () => {
      vigente = false
    }
  }, [id, usuario.id])

  // El propio perfil se ve en «Mi perfil», donde además se puede editar
  if (id === usuario.id) return <Navigate to="/perfil" replace />

  if (resultado.id !== id) return <p className="cargando">Cargando perfil…</p>

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

  return (
    <div className="contenedor-perfil">
      <Link to="/" className="volver">← Volver</Link>
      <VistaPerfil perfil={resultado.perfil} />
    </div>
  )
}
