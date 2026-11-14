import { Outlet, useLocation } from 'react-router-dom'
import { ErrorCarga, Esqueleto } from '../componentes/Esqueleto.jsx'
import PestanasPerfil from '../componentes/PestanasPerfil.jsx'

const NOTAS = {
  '/perfil': 'Este es tu perfil. Con «Ver como me ven» revisas exactamente lo que ven los demás estudiantes.',
  '/perfil/editar': 'Los cambios que guardes se verán al tiro en tu perfil.',
  '/perfil/cuestionario': 'Los demás estudiantes ven tus respuestas y lo que marcaste como imprescindible.',
  '/perfil/verificacion': 'Tu comprobante solo lo ven tú y los administradores.',
}

// Mientras carga un perfil: su forma (portada, foto, nombre y las dos columnas), en el mismo lugar que
// ocupará, para que nada salte al llegar. Con un error se muestra el mensaje y, si se puede, «Reintentar»
export function CargandoPerfil({ texto, alReintentar }) {
  if (texto) return <div className="perfil-cargando"><ErrorCarga mensaje={texto} alReintentar={alReintentar} /></div>
  return (
    <div className="perfil-cargando pv-esqueleto esq-zona-bloque" role="status" aria-label="Cargando el perfil">
      <Esqueleto forma="bloque" className="pv-esq-portada" />
      <Esqueleto forma="circulo" className="pv-esq-avatar" />
      <Esqueleto className="pv-esq-linea ancha" />
      <Esqueleto className="pv-esq-linea" />
      <div className="pv-esq-cuerpo"><Esqueleto forma="bloque" /><Esqueleto forma="bloque" /></div>
    </div>
  )
}

// Marco común de «Mi perfil»: las pestañas, la nota y el fondo se quedan fijos y solo cambia
// el contenido de abajo. Cada pestaña es otra página, así que al cambiar se monta su contenido y solo
// ese contenido entra con un fundido corto (CSS: .pestana-contenido > *); el contenedor no se remonta
export default function LayoutPerfil() {
  const { pathname } = useLocation()

  return (
    <div className="contenedor-perfil">
      <div className="perfil-barra">
        <PestanasPerfil />
        <p className="perfil-nota">{NOTAS[pathname]}</p>
      </div>
      <div className="pestana-contenido">
        <Outlet />
      </div>
    </div>
  )
}
