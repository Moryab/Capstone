import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api } from '../../api.js'
import Avatar from '../../componentes/Avatar.jsx'
import { textoGenero } from '../../perfil.js'
import { ESTADOS, formatearPesos } from '../../publicaciones.js'
import { textoEstadoReporte, textoMotivo, textoTipoReporte } from '../../reportes.js'
import { ESTADOS_SOLICITUD, fechaCorta, fechaHora, textoTipo } from '../verificacion/datos.js'
import { textoCuenta, textoVerificacion } from './datos.js'
import ReactivarCuenta from './ReactivarCuenta.jsx'
import './reportes.css'

function Dato({ etiqueta, children }) {
  return (
    <>
      <dt>{etiqueta}</dt>
      <dd>{children ?? <em>Sin indicar</em>}</dd>
    </>
  )
}

// Sección con su lista o, si no hay nada, el texto que lo indica
function Seccion({ id, titulo, vacio, elementos, children }) {
  return (
    <section className="reporte-accion" aria-labelledby={id}>
      <h2 id={id}>{titulo}</h2>
      {elementos.length === 0 ? <p className="revision-sub">{vacio}</p> : <ul className="reporte-otros">{children}</ul>}
    </section>
  )
}

// HU-28: ficha del usuario. Sus datos, publicaciones, reportes recibidos y solicitudes de verificación
export default function DetalleUsuario() {
  const { id } = useParams()
  const { state } = useLocation()
  const volver = state?.volver ?? '/admin/usuarios'
  // Se guarda junto con el id: al pasar a otro usuario, lo anterior deja de mostrarse
  const [cargado, setCargado] = useState({ id: null, datos: null, error: '' })
  const [aviso, setAviso] = useState({ id: null, texto: '' })

  const cargar = useCallback(
    () =>
      api(`/admin/usuarios/${id}`)
        .then((datos) => setCargado({ id, datos, error: '' }))
        .catch((err) => setCargado({ id, datos: null, error: err.message })),
    [id],
  )

  useEffect(() => {
    cargar()
  }, [cargar])

  const { datos, error } = cargado.id === id ? cargado : { datos: null, error: '' }

  if (error) {
    return (
      <main className="tarjeta">
        <h1>{error}</h1>
        <Link to={volver} className="boton">Volver a los usuarios</Link>
      </main>
    )
  }
  if (!datos) return <p className="cargando">Cargando…</p>

  const alTerminar = async (texto) => {
    await cargar()
    setAviso({ id, texto })
  }

  const { perfil, publicaciones, reportes, solicitudes } = datos

  return (
    <main className="tarjeta pagina-admin">
      <Link to={volver} className="admin-volver">← Volver a los usuarios</Link>
      <div className="revision-persona">
        <Avatar nombre={perfil.nombre} apellido={perfil.ap_paterno} foto={perfil.foto_url} tamano={56} />
        <div>
          <h1 className="ficha-nombre">{perfil.nombre_completo}</h1>
          <span className={`etiqueta-estado ${perfil.estado_cuenta}`}>{textoCuenta(perfil.estado_cuenta)}</span>{' '}
          <span className={`etiqueta-estado ${perfil.verificacion_estado}`}>{textoVerificacion(perfil.verificacion_estado)}</span>
        </div>
      </div>

      {aviso.id === id && aviso.texto && <p className="exito" role="status">{aviso.texto}</p>}
      {perfil.suspension && (
        <p className="alerta">
          Cuenta suspendida
          {perfil.suspension.fecha && ` el ${fechaHora.format(new Date(perfil.suspension.fecha))}`}
          {perfil.suspension.motivo && `. Motivo: ${perfil.suspension.motivo}`}.
        </p>
      )}

      <div className="reporte-detalle">
        <section aria-labelledby="titulo-personales">
          <h2 id="titulo-personales">Datos personales</h2>
          <dl className="verificacion-detalle">
            <Dato etiqueta="RUT">{perfil.rut}</Dato>
            <Dato etiqueta="Correo">{perfil.correo}</Dato>
            <Dato etiqueta="Teléfono">{perfil.telefono}</Dato>
            <Dato etiqueta="Nacimiento">
              {perfil.fecha_nac && new Date(`${perfil.fecha_nac}T12:00`).toLocaleDateString('es-CL')}
            </Dato>
            <Dato etiqueta="Género">{textoGenero(perfil.genero)}</Dato>
            <Dato etiqueta="Registro">{fechaCorta.format(new Date(perfil.fecha_registro))}</Dato>
            <Dato etiqueta="Advertencias">{perfil.advertencias_recibidas}</Dato>
          </dl>
        </section>

        <section aria-labelledby="titulo-estudios">
          <h2 id="titulo-estudios">Estudios y origen</h2>
          <dl className="verificacion-detalle">
            <Dato etiqueta="Institución">{perfil.institucion}</Dato>
            <Dato etiqueta="Sede">{perfil.sede}</Dato>
            <Dato etiqueta="Carrera">{perfil.carrera}</Dato>
            <Dato etiqueta="Año de ingreso">{perfil.anio_ingreso}</Dato>
            <Dato etiqueta="Origen">
              {[perfil.ciudad_origen, perfil.region_origen].filter(Boolean).join(', ') || null}
            </Dato>
            <Dato etiqueta="Dirección">{perfil.direccion}</Dato>
            <Dato etiqueta="Sobre mí">{perfil.descripcion}</Dato>
          </dl>
        </section>
      </div>

      <Seccion id="titulo-publicaciones" titulo="Publicaciones" vacio="No tiene publicaciones."
        elementos={publicaciones}>
        {publicaciones.map((p) => (
          <li key={p.id}>
            <Link to={`/admin/publicaciones/${p.id}`}>{p.titulo}</Link>
            <span className={`etiqueta-estado ${p.estado}`}>{ESTADOS[p.estado] ?? p.estado}</span>
            <span>{p.comuna} · {formatearPesos(p.costo_mensual)}</span>
            <span>{p.cantidad_reportes} {p.cantidad_reportes === 1 ? 'reporte' : 'reportes'}</span>
            <time dateTime={p.fecha_publicacion}>{fechaCorta.format(new Date(p.fecha_publicacion))}</time>
          </li>
        ))}
      </Seccion>

      <Seccion id="titulo-reportes" titulo="Reportes recibidos" vacio="No ha recibido reportes."
        elementos={reportes}>
        {reportes.map((r) => (
          <li key={r.id}>
            <Link to={`/admin/reportes/${r.id}`}>N.º {r.codigo}</Link>
            <span>{textoTipoReporte(r.tipo_elemento)}</span>
            <span>{textoMotivo(r.motivo)}</span>
            <span className={`etiqueta-estado ${r.estado}`}>{textoEstadoReporte(r.estado)}</span>
            <time dateTime={r.fecha_reporte}>{fechaCorta.format(new Date(r.fecha_reporte))}</time>
          </li>
        ))}
      </Seccion>

      <Seccion id="titulo-solicitudes" titulo="Solicitudes de verificación" vacio="No ha enviado solicitudes."
        elementos={solicitudes}>
        {solicitudes.map((s) => (
          <li key={s.id}>
            <Link to={`/admin/verificaciones/${s.id}`}>N.º {s.codigo}</Link>
            <span>{textoTipo(s.tipo_comprobante)}</span>
            <span className={`etiqueta-estado ${s.estado}`}>{ESTADOS_SOLICITUD[s.estado] ?? s.estado}</span>
            <time dateTime={s.fecha_solicitud}>{fechaCorta.format(new Date(s.fecha_solicitud))}</time>
          </li>
        ))}
      </Seccion>

      {perfil.estado_cuenta === 'suspendida' && <ReactivarCuenta usuarioId={perfil.id} alTerminar={alTerminar} />}
    </main>
  )
}
