import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api } from '../api.js'
import Avatar from '../componentes/Avatar.jsx'
import BotonReportar from '../componentes/BotonReportar.jsx'
import { CompatibilidadOferente } from '../componentes/Compatibilidad.jsx'
import FichaPublicacion from '../componentes/FichaPublicacion.jsx'
import InsigniaVerificacion from '../componentes/InsigniaVerificacion.jsx'
import { ESTADOS } from '../publicaciones.js'

// Detalle de un alojamiento (CA-05.5). Lo ven todos los estudiantes si está activo; el oferente
// lo ve siempre y desde aquí puede ir a editarlo
export default function DetallePublicacion() {
  const { id } = useParams()
  const { state } = useLocation()
  const [resultado, setResultado] = useState({ id: null, pub: null, error: '' })

  useEffect(() => {
    let vigente = true // evita mostrar una respuesta vieja si se cambia de publicación rápido
    api(`/publicaciones/${id}`)
      .then((pub) => vigente && setResultado({ id, pub, error: '' }))
      .catch((err) => vigente && setResultado({ id, pub: null, error: err.message }))
    return () => {
      vigente = false
    }
  }, [id])

  if (resultado.id !== id) return <p className="cargando">Cargando alojamiento…</p>

  if (resultado.error) {
    return (
      <main className="tarjeta">
        <h1>{resultado.error}</h1>
        <p className="subtitulo">Es posible que el alojamiento ya no esté disponible.</p>
        <Link to="/" className="boton">Volver al inicio</Link>
      </main>
    )
  }

  const { pub } = resultado
  const { oferente } = pub

  return (
    <main className="detalle-publicacion">
      {/* CA-12.5: desde el listado se vuelve con los mismos filtros */}
      <Link to={state?.desde ?? (pub.es_propia ? '/perfil' : '/alojamientos')} className="volver">← Volver</Link>

      {pub.es_propia && pub.estado !== 'activa' && (
        <p className="alerta">
          Estado: {ESTADOS[pub.estado] ?? pub.estado}. Los demás estudiantes no ven esta publicación.
        </p>
      )}

      <FichaPublicacion key={pub.id} pub={pub}>
        {oferente && (
          <Link to={pub.es_propia ? '/perfil' : `/usuarios/${oferente.id}`} className="detalle-oferente"
            state={{ desde: `/alojamientos/${pub.id}` }}>
            <Avatar nombre={oferente.nombre} apellido={oferente.ap_paterno} foto={oferente.foto_url} tamano={44} />
            <span>
              <strong>{oferente.nombre} {oferente.ap_paterno} <InsigniaVerificacion verificado={oferente.verificado} /></strong>
              <small>{pub.es_propia ? 'Tu perfil' : 'Ver perfil del oferente'}</small>
            </span>
          </Link>
        )}
        {/* CA-15.3: compatibilidad con quien publica; en la propia publicación no aplica */}
        {oferente && !pub.es_propia && <CompatibilidadOferente oferente={oferente} />}
        {/* EP-06 · HU-25: nunca en la propia publicación (CA-25.5) */}
        {!pub.es_propia && <BotonReportar tipo="publicacion" id={pub.id} nombre={pub.titulo} />}

        {pub.es_propia && (
          <Link to={`/publicaciones/${pub.id}/editar`} className="boton">Editar publicación</Link>
        )}
      </FichaPublicacion>
    </main>
  )
}
