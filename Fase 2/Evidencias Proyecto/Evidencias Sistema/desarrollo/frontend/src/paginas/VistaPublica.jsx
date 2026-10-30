import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import VistaPerfil from '../componentes/VistaPerfil.jsx'
import { CATEGORIAS, textoRespuesta } from '../cuestionario.js'
import { useFondoCiudad } from '../fondo.js'
import { useSesion } from '../sesion/SesionContext.jsx'

const Ojo = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
  </svg>
)

// La misma sección «Tu compatibilidad con…» que ve otro estudiante en tu perfil. El porcentaje y
// el parecido dependen de las respuestas de quien te visita, así que aquí solo se muestran las tuyas
function CompatibilidadVistaPrevia({ perfil }) {
  return (
    <section className="perfil-seccion compat-seccion" aria-labelledby="titulo-compat">
      <h2 id="titulo-compat">Tu compatibilidad con {perfil.nombre}</h2>
      <p className="vista-publica-nota">
        Aquí cada estudiante ve su porcentaje de compatibilidad contigo y en qué coinciden.
      </p>
      {perfil.habitos && (
        <ul className="compat-detalle">
          {CATEGORIAS.map(({ clave, titulo }) => (
            <li key={clave} className="compat-categoria vista-previa">
              <div className="compat-categoria-cabecera">
                <strong>{titulo}</strong>
                <span className="compat-estado">Depende</span>
              </div>
              <p>
                <span>Tú: respuesta de quien te visita</span>
                <span>{perfil.nombre}: {textoRespuesta(clave, perfil.habitos[clave])}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * Vista previa del propio perfil igual a como lo ve otro estudiante en /usuarios/:id (HU-16):
 * mismos datos públicos y misma disposición, sin los controles de edición, sin los avisos
 * privados y con los textos en tercera persona.
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
      <div className="vista-publica-barra">
        <Link to="/perfil" className="volver">← Volver a mi perfil</Link>
        <span className="vista-publica-etiqueta"><Ojo /> Vista previa: así te ven otros estudiantes</span>
      </div>

      {error && <p className="alerta" role="alert">{error}</p>}
      {!perfil && !error && <p className="cargando" role="status">Cargando…</p>}

      {perfil && (
        <VistaPerfil perfil={perfil}>
          <CompatibilidadVistaPrevia perfil={perfil} />
        </VistaPerfil>
      )}
    </div>
  )
}
