import { Link } from 'react-router-dom'
import Avatar from '../../componentes/Avatar.jsx'
import { useSesion } from '../../sesion/SesionContext.jsx'
import { Ayuda, Esqueleto, Tarjeta } from '../comunes.jsx'
import { IconoFlecha, IconoVerificado } from '../iconos.jsx'
import { mayusculaInicial } from '../utilidades.js'

// Mini vista del perfil público, con la portada «Conexión» que ven todos
export default function TarjetaPerfil({ perfil }) {
  const { usuario } = useSesion()
  const estudios = perfil && [perfil.carrera, perfil.institucion_sigla || perfil.institucion].filter(Boolean).join(' · ')

  return (
    <Tarjeta className="i-area-perfil" cuerpo="i-perfil" etiqueta="i-titulo-perfil">
      <div className="i-perfil-portada" aria-hidden="true" />
      <div className="i-perfil-contenido">
        <Avatar nombre={usuario.nombre} apellido={usuario.ap_paterno} foto={usuario.foto_url}
          tamano={72} className="i-perfil-avatar" />
        <div className="i-tarjeta-encabezado">
          <h2 id="i-titulo-perfil" className="i-etiqueta-titulo">Así te ven los demás</h2>
          <Ayuda texto="Vista previa de tu perfil público. Tu correo, teléfono, RUT y dirección no se muestran." />
        </div>

        {perfil === null ? (
          <div className="i-perfil-cargando" role="status" aria-label="Cargando tu perfil">
            <Esqueleto ancho="60%" alto={20} />
            <Esqueleto ancho="80%" />
          </div>
        ) : (
          <>
            <p className="i-perfil-nombre">
              {mayusculaInicial(usuario.nombre)} {usuario.ap_paterno}
              {perfil?.verificado && (
                <span className="i-verificado"><IconoVerificado /> Verificado</span>
              )}
            </p>
            <p className="i-perfil-estudios">{estudios || 'Aún no indicas tu carrera ni institución'}</p>
          </>
        )}

        <Link to="/perfil" className="l-boton l-boton-claro i-perfil-boton">
          Ver perfil completo <IconoFlecha />
        </Link>
      </div>
    </Tarjeta>
  )
}
