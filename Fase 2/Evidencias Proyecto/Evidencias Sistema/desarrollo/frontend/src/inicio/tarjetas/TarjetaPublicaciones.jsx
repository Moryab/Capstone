import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { contar, prefiereSinMovimiento } from '../../landing/animaciones.js'
import { ESTADOS, formatearPesos } from '../../publicaciones.js'
import { EnlaceCambioRol } from '../../rol/CambioRol.jsx'
import { Ayuda, Esqueleto, Tarjeta } from '../comunes.jsx'
import { IconoFlecha, IconoMas } from '../iconos.jsx'

// Estado vacío: una pieza vacía esperando
function IlustracionVacia() {
  return (
    <svg className="i-vacio-ilustracion" viewBox="0 0 180 120" aria-hidden="true">
      <rect x="20" y="96" width="140" height="8" rx="4" fill="#d9e5e9" />
      <rect x="40" y="34" width="100" height="62" rx="8" fill="#fff" stroke="#d9e5e9" strokeWidth="3" />
      <rect x="52" y="46" width="34" height="26" rx="4" fill="#e3f1ef" />
      <rect x="94" y="46" width="34" height="38" rx="4" fill="#f4f8fa" stroke="#d9e5e9" strokeWidth="2" />
      <circle cx="122" cy="66" r="2.5" fill="#12766b" />
      <path d="M90 14 v12 M84 20 h12" stroke="#f2c94c" strokeWidth="4" strokeLinecap="round" className="i-destello" />
      <path d="M150 30 v8 M146 34 h8" stroke="#3fd1b8" strokeWidth="3" strokeLinecap="round" className="i-destello lento" />
    </svg>
  )
}

// Mis publicaciones: contadores y vista previa de las últimas
export default function TarjetaPublicaciones({ publicaciones, error }) {
  const cifras = useRef(null)

  // Los contadores suben desde 0 cuando llegan los datos (el número real ya está en el HTML)
  useEffect(() => {
    if (!publicaciones?.length || prefiereSinMovimiento()) return undefined
    const animaciones = [...cifras.current.querySelectorAll('[data-valor]')].map((el) => contar(el, { duracion: 1.2 }))
    return () => animaciones.forEach((a) => a.kill())
  }, [publicaciones])

  const activas = publicaciones?.filter((p) => p.estado === 'activa').length ?? 0

  return (
    <Tarjeta className="i-area-pubs" cuerpo="i-pubs" etiqueta="i-titulo-pubs" id="i-publicaciones">
      <div className="i-tarjeta-encabezado">
        <h2 id="i-titulo-pubs">Mis publicaciones</h2>
        <Ayuda texto="Los alojamientos que ofreces. Para editarlos o eliminarlos, entra a tu perfil." />
        {publicaciones?.length > 0 && (
          <Link to="/perfil" className="i-enlace">Administrar en mi perfil <IconoFlecha /></Link>
        )}
      </div>

      {error && <p className="i-error" role="alert">{error}</p>}

      {publicaciones === null && (
        <div className="i-pubs-cargando" role="status" aria-label="Cargando tus publicaciones">
          <div className="i-cifras">
            <Esqueleto alto={64} /><Esqueleto alto={64} />
          </div>
          <Esqueleto alto={84} /><Esqueleto alto={84} />
        </div>
      )}

      {publicaciones?.length === 0 && !error && (
        <div className="i-vacio">
          <IlustracionVacia />
          <div>
            <p className="i-vacio-titulo">Aún no publicas alojamientos</p>
            <p className="i-vacio-texto">Cuando publiques una habitación o departamento, aparecerá aquí.</p>
            <Link to="/publicaciones/nueva" className="l-boton"><IconoMas tamano={16} /> Publicar el primero</Link>
          </div>
        </div>
      )}

      {publicaciones?.length > 0 && (
        <>
          <dl ref={cifras} className="i-cifras">
            <div><dt>Publicadas</dt><dd data-valor={publicaciones.length}>{publicaciones.length}</dd></div>
            <div><dt>Activas</dt><dd data-valor={activas}>{activas}</dd></div>
          </dl>
          <ul className="i-mini-pubs">
            {publicaciones.slice(0, 3).map((p) => {
              const principal = p.fotos.find((f) => f.es_principal)
              return (
                <li key={p.id}>
                  <Link to={`/alojamientos/${p.id}`} className="i-mini-pub">
                    <span className="i-mini-foto">
                      {principal ? <img src={principal.url} alt="" loading="lazy" /> : <span>Sin fotos</span>}
                    </span>
                    <span className="i-mini-info">
                      <span className={`estado estado-${p.estado}`}>{ESTADOS[p.estado] ?? p.estado}</span>
                      <strong>{p.titulo}</strong>
                      <span className="i-mini-meta">{p.ubicacion.comuna_nombre}</span>
                    </span>
                    <span className="i-mini-precio">{formatearPesos(p.costo_mensual)}<small>/ mes</small></span>
                  </Link>
                </li>
              )
            })}
          </ul>
          {publicaciones.length > 3 && (
            <p className="i-mas">y {publicaciones.length - 3} más en tu perfil</p>
          )}
        </>
      )}
      <EnlaceCambioRol />
    </Tarjeta>
  )
}
