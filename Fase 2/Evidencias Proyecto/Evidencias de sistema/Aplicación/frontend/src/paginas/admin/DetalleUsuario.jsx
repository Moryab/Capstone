import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api.js'
import Avatar from '../../componentes/Avatar.jsx'
import { useAvisoBreve } from '../../componentes/AvisoBreve.jsx'
import { useResumenAdmin } from '../../marco/ResumenAdmin.jsx'
import { textoGenero } from '../../perfil.js'
import { formatearPesos } from '../../publicaciones.js'
import { textoEstadoReporte, textoMotivo, textoTipoReporte } from '../../reportes.js'
import { ESTADOS_SOLICITUD, textoTipo } from '../verificacion/datos.js'
import AccionCuenta from './AccionCuenta.jsx'
import CambiarRol from './CambiarRol.jsx'
import { textoCuenta, textoPublicacion, textoVerificacion } from './datos.js'
import IlustracionUsuario from './IlustracionUsuario.jsx'
import RestaurarVerificacion from './RestaurarVerificacion.jsx'
import './detalleModeracion.css'
import { ChipEstado, EtiquetaRol, PaginaAdmin } from './ui/componentes.jsx'
import { Actividad, Cifra, ICONOS, DIBUJOS_VACIO } from './ui/detalle.jsx'
import { haceCuanto, nombrePropio, rut } from './ui/formato.js'

const fechaDia = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
const fechaHora = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const dia = (iso) => fechaDia.format(new Date(iso))

function edad(fechaNac) {
  const nac = new Date(`${fechaNac}T12:00`)
  const hoy = new Date()
  let anios = hoy.getFullYear() - nac.getFullYear()
  if (hoy < new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate())) anios -= 1
  return anios
}

// Un dato con su ícono. Sin valor dice «Sin indicar»; `tono` lo destaca
function Dato({ icono, etiqueta, children, tono }) {
  const vacio = children === null || children === undefined || children === ''
  return (
    <div className="du-dato" data-tono={tono}>
      <span className="du-dato-icono">{ICONOS[icono]}</span>
      <dt>{etiqueta}</dt>
      <dd>{vacio ? <em>Sin indicar</em> : children}</dd>
    </div>
  )
}

// Mientras carga: la misma forma de la ficha en silueta, para que nada salte al llegar los datos
function Silueta({ botonVolver }) {
  return (
    <PaginaAdmin className="md du">
      {botonVolver}
      <div className="md-panel du-silueta" aria-busy="true" aria-label="Cargando la ficha del usuario">
        <div className="du-cabeza">
          <div className="du-identidad">
            <span className="du-s du-s-avatar" />
            <div className="du-s-grupo"><span className="du-s" style={{ width: '40%' }} /><span className="du-s du-s-titulo" /><span className="du-s" style={{ width: '55%' }} /></div>
          </div>
          <span className="du-s du-s-ilustracion" />
        </div>
        <div className="du-cifras">{[0, 1, 2, 3].map((i) => <span key={i} className="du-s du-s-cifra" />)}</div>
        <div className="md-cuerpo du-cuerpo">
          <div className="md-columna">
            <div className="du-datos"><span className="du-s du-s-tarjeta" style={{ height: 330 }} /><span className="du-s du-s-tarjeta" style={{ height: 330 }} /></div>
            <span className="du-s du-s-tarjeta" style={{ height: 140 }} />
          </div>
          <span className="du-s du-s-tarjeta" style={{ height: 486 }} />
        </div>
        <div className="du-actividades">{[0, 1, 2].map((i) => <span key={i} className="du-s du-s-tarjeta" />)}</div>
      </div>
    </PaginaAdmin>
  )
}

// HU-28: ficha del usuario. Sus datos, actividad (publicaciones, reportes y solicitudes) y la moderación de su cuenta
export default function DetalleUsuario() {
  const { id } = useParams()
  const { state } = useLocation()
  const navegar = useNavigate()
  const volver = state?.volver ?? '/admin/usuarios'
  // Se guarda junto con el id: al pasar a otro usuario, lo anterior deja de mostrarse
  const [cargado, setCargado] = useState({ id: null, datos: null, error: '' })
  const [aviso, setAviso] = useState({ id: null, tipo: '', texto: '' })
  const { avisar } = useAvisoBreve()
  const { recargarResumen } = useResumenAdmin()

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
  const botonVolver = <Link to={volver} className="md-volver">Volver a los usuarios</Link>

  if (error) {
    return (
      <PaginaAdmin className="md du">
        {botonVolver}
        <div className="md-panel md-cargando">
          <div className="du-vacio du-vacio-error">
            {DIBUJOS_VACIO.solicitudes}
            <div>
              <p className="du-vacio-titulo">No pudimos abrir esta ficha</p>
              <p className="du-vacio-texto">{error}</p>
            </div>
          </div>
        </div>
      </PaginaAdmin>
    )
  }
  if (!datos) return <Silueta botonVolver={botonVolver} />

  const alTerminar = async (texto) => {
    await cargar()
    setAviso({ id, tipo: 'exito', texto })
    avisar(texto.replace(/\.$/, ''))
    recargarResumen() // los contadores de la barra lateral se ponen al día
  }

  const { perfil, publicaciones, reportes, solicitudes } = datos
  const nombre = nombrePropio(perfil.nombre_completo)
  const abiertos = reportes.filter((r) => ['pendiente', 'en_revision'].includes(r.estado)).length
  const pubActivas = publicaciones.filter((p) => p.estado === 'activa').length
  const advertencias = perfil.advertencias_recibidas ?? 0
  const origen = [perfil.ciudad_origen, perfil.region_origen].filter(Boolean).map(nombrePropio).join(', ')

  return (
    <PaginaAdmin className="md du">
      {botonVolver}
      <div className="md-panel">
        {/* Quién es, en qué estado está su cuenta y un resumen en cifras */}
        <header className="du-cabeza">
          <div className="du-identidad">
            <div className="du-avatar" data-cuenta={perfil.estado_cuenta} data-verificacion={perfil.verificacion_estado}>
              <Avatar nombre={nombrePropio(perfil.nombre)} apellido={nombrePropio(perfil.ap_paterno ?? '')} foto={perfil.foto_url} tamano={96} />
              {perfil.verificacion_estado === 'verificado' && (
                <span className="du-avatar-sello" title="Estudiante verificado">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 12.5l3.5 3.5 7.5-8" /></svg>
                </span>
              )}
            </div>
            <div className="du-identidad-texto">
              <p className="md-ojo">Ficha de usuario · {perfil.modo ? (perfil.modo === 'buscador' ? 'Busca alojamiento' : 'Ofrece alojamiento') : 'Aún sin rol'}</p>
              <h1 className="md-titulo">{nombre}</h1>
              <p className="du-meta">
                {perfil.correo}
                {perfil.fecha_registro && <> · en RoomMatch desde {haceCuanto(perfil.fecha_registro)}</>}
              </p>
              <div className="du-chips">
                <span className="du-chip-cuenta" data-cuenta={perfil.estado_cuenta}>
                  <ChipEstado tipo="cuenta" valor={perfil.estado_cuenta}>Cuenta {textoCuenta(perfil.estado_cuenta).toLowerCase()}</ChipEstado>
                </span>
                <ChipEstado tipo="verificacion" valor={perfil.verificacion_estado}>{textoVerificacion(perfil.verificacion_estado)}</ChipEstado>
                <EtiquetaRol modo={perfil.modo} />
              </div>
            </div>
          </div>
          <IlustracionUsuario className="md-ilustracion du-ilustracion" />
        </header>

        <dl className="du-cifras" aria-label="Resumen de su actividad">
          <Cifra etiqueta="Publicaciones" icono="casa" valor={publicaciones.length} tono="info"
            detalle={publicaciones.length ? `${pubActivas} ${pubActivas === 1 ? 'activa' : 'activas'}` : 'Ninguna aún'} />
          <Cifra etiqueta="Reportes recibidos" icono="bandera" valor={reportes.length} tono={abiertos ? 'error' : reportes.length ? 'espera' : 'ok'}
            detalle={abiertos ? `${abiertos} por resolver` : reportes.length ? 'Todos resueltos' : 'Historial limpio'} />
          <Cifra etiqueta="Advertencias" icono="alerta" valor={advertencias} tono={advertencias ? 'espera' : 'ok'}
            detalle={advertencias ? 'Revisa su historial' : 'Sin faltas registradas'} />
          <Cifra etiqueta="Solicitudes" icono="escudo" valor={solicitudes.length} tono="violeta"
            detalle={solicitudes.length ? `Última: ${ESTADOS_SOLICITUD[solicitudes[0].estado]?.toLowerCase() ?? solicitudes[0].estado}` : 'De verificación'} />
        </dl>

        {aviso.id === id && aviso.texto && (
          <p className={`${aviso.tipo} md-mensaje`} role={aviso.tipo === 'alerta' ? 'alert' : 'status'}>{aviso.texto}</p>
        )}

        {/* Lo más importante de su historial: si está suspendida o fue eliminada, y por qué */}
        {perfil.suspension && (
          <div className="du-banda" data-tono="error" role="note">
            <span className="du-banda-icono">{ICONOS.candado}</span>
            <div>
              <p className="du-banda-titulo">
                Cuenta suspendida{perfil.suspension.fecha && <> el {fechaHora.format(new Date(perfil.suspension.fecha))}</>}
              </p>
              <p className="du-banda-texto">No puede ingresar y sus publicaciones están ocultas.</p>
              {perfil.suspension.motivo && <blockquote className="md-cita">{perfil.suspension.motivo}</blockquote>}
            </div>
          </div>
        )}
        {perfil.eliminacion && (
          <div className="du-banda" data-tono={perfil.estado_cuenta === 'eliminada' ? 'neutro' : 'info'} role="note">
            <span className="du-banda-icono">{ICONOS.papelera}</span>
            <div>
              <p className="du-banda-titulo">
                {perfil.estado_cuenta === 'eliminada' ? 'Cuenta eliminada' : 'Esta cuenta fue eliminada antes'}
                {perfil.eliminacion.fecha && <> el {fechaHora.format(new Date(perfil.eliminacion.fecha))}</>}
              </p>
              {perfil.eliminacion.fecha_nuevo_registro && (
                <p className="du-banda-texto">Volvió a registrarse el {fechaHora.format(new Date(perfil.eliminacion.fecha_nuevo_registro))} y recuperó su historial.</p>
              )}
              {perfil.eliminacion.motivo && <blockquote className="md-cita">{perfil.eliminacion.motivo}</blockquote>}
            </div>
          </div>
        )}

        <div className="md-cuerpo du-cuerpo">
          <div className="md-columna">
            <div className="du-datos">
              <section className="md-tarjeta" aria-labelledby="titulo-personales">
                <h2 className="du-tarjeta-titulo" id="titulo-personales">
                  <span className="du-tarjeta-icono" data-icono="genero">{ICONOS.genero}</span>Datos personales
                </h2>
                <dl className="du-lista-datos">
                  <Dato icono="rut" etiqueta="RUT">{perfil.rut && rut(perfil.rut)}</Dato>
                  <Dato icono="correo" etiqueta="Correo">{perfil.correo}</Dato>
                  <Dato icono="telefono" etiqueta="Teléfono">{perfil.telefono}</Dato>
                  <Dato icono="nacimiento" etiqueta="Nacimiento">
                    {perfil.fecha_nac && <>{dia(`${perfil.fecha_nac}T12:00`)} <span className="du-dato-extra">{edad(perfil.fecha_nac)} años</span></>}
                  </Dato>
                  <Dato icono="genero" etiqueta="Género">{textoGenero(perfil.genero)}</Dato>
                  <Dato icono="registro" etiqueta="Registro">{perfil.fecha_registro && fechaHora.format(new Date(perfil.fecha_registro))}</Dato>
                </dl>
              </section>

              <section className="md-tarjeta" aria-labelledby="titulo-estudios">
                <h2 className="du-tarjeta-titulo" id="titulo-estudios">
                  <span className="du-tarjeta-icono" data-icono="institucion">{ICONOS.institucion}</span>Estudios y origen
                </h2>
                <dl className="du-lista-datos">
                  <Dato icono="institucion" etiqueta="Institución">{perfil.institucion}</Dato>
                  <Dato icono="sede" etiqueta="Sede">{perfil.sede}</Dato>
                  <Dato icono="carrera" etiqueta="Carrera" tono={perfil.carrera_otra ? 'espera' : undefined}>
                    {perfil.carrera && <>{nombrePropio(perfil.carrera)}{perfil.carrera_otra && <span className="du-dato-extra" data-tono="espera" title="No estaba en la lista de su institución">Escrita a mano</span>}</>}
                  </Dato>
                  <Dato icono="ingreso" etiqueta="Año de ingreso">{perfil.anio_ingreso}</Dato>
                  <Dato icono="origen" etiqueta="Origen">{origen || null}</Dato>
                </dl>
              </section>
            </div>

            <section className="md-tarjeta du-sobre" aria-labelledby="titulo-sobre">
              <p className="md-rotulo" id="titulo-sobre">Sobre mí, en sus palabras</p>
              {perfil.descripcion
                ? <blockquote className="md-cita">{perfil.descripcion}</blockquote>
                : <blockquote className="md-cita vacia">Todavía no escribe nada sobre sí.</blockquote>}
            </section>
          </div>

          <aside className="md-lateral du-lateral" aria-label="Gestionar la cuenta">
            {/* Deshacer una revocación: también para quien se verificó con correo institucional (sin solicitud) */}
            {perfil.verificacion_estado === 'revocado' && (
              <section className="md-tarjeta du-restaurar" aria-labelledby="titulo-restaurar">
                <p className="md-rotulo" id="titulo-restaurar">Verificación revocada</p>
                <p className="md-decision-ayuda du-sin-margen">Si la revocaste por error o el caso ya se aclaró, puedes volver a verificarlo.</p>
                <RestaurarVerificacion usuarioId={perfil.id} nombre={nombre} className="md-aplicar"
                  alTerminar={(texto) => alTerminar(`${texto}.`)} alFallar={(texto) => setAviso({ id, tipo: 'alerta', texto })} />
              </section>
            )}
            {perfil.estado_cuenta !== 'eliminada' && (
              <CambiarRol key={`rol-${id}`} usuarioId={perfil.id} nombre={nombre} modo={perfil.modo} alTerminar={alTerminar} />
            )}
            <AccionCuenta key={`acciones-${id}`} perfil={perfil} nombre={nombre} alTerminar={alTerminar}
              alEliminar={(texto) => {
                avisar(texto.replace(/\.$/, ''))
                recargarResumen()
                navegar(volver, { replace: true, state: { aviso: texto } })
              }} />
          </aside>
        </div>

        {/* La actividad, en una fila de tres tarjetas de la misma altura */}
        <div className="du-actividades">
          <Actividad id="publicaciones" titulo="Publicaciones" icono="casa" elementos={publicaciones}
            vacio={{ titulo: 'Sin publicaciones', texto: perfil.modo === 'oferente' ? 'Aún no publica ningún alojamiento.' : 'Como buscador no publica alojamientos.' }}>
            {publicaciones.map((p) => (
              <li key={p.id}>
                <Link to={`/admin/publicaciones/${p.id}`} className="du-fila">
                  <span className="du-fila-principal">
                    <strong>{p.titulo}</strong>
                    <span>{p.comuna} · {formatearPesos(p.costo_mensual)} al mes · {dia(p.fecha_publicacion)}</span>
                  </span>
                  <span className="du-fila-lado">
                    {p.cantidad_reportes > 0 && (
                      <span className="du-insignia" data-tono="error">{p.cantidad_reportes} {p.cantidad_reportes === 1 ? 'reporte' : 'reportes'}</span>
                    )}
                    <ChipEstado tipo="publicacion" valor={p.estado}>{textoPublicacion(p.estado)}</ChipEstado>
                    <span className="du-fila-flecha">{ICONOS.flecha}</span>
                  </span>
                </Link>
              </li>
            ))}
          </Actividad>

          <Actividad id="reportes" titulo="Reportes recibidos" icono="bandera" elementos={reportes}
            vacio={{ titulo: 'Historial limpio', texto: 'Nadie ha reportado su perfil ni sus publicaciones.' }}>
            {reportes.map((r) => (
              <li key={r.id}>
                <Link to={`/admin/reportes/${r.id}`} className="du-fila" data-abierto={['pendiente', 'en_revision'].includes(r.estado) || undefined}>
                  <span className="du-fila-principal">
                    <strong>{textoMotivo(r.motivo)}</strong>
                    <span>N.º {r.codigo} · {textoTipoReporte(r.tipo_elemento)} · {dia(r.fecha_reporte)}</span>
                  </span>
                  <span className="du-fila-lado">
                    <ChipEstado tipo="reporte" valor={r.estado}>{textoEstadoReporte(r.estado)}</ChipEstado>
                    <span className="du-fila-flecha">{ICONOS.flecha}</span>
                  </span>
                </Link>
              </li>
            ))}
          </Actividad>

          <Actividad id="solicitudes" titulo="Solicitudes de verificación" icono="escudo" elementos={solicitudes}
            vacio={{ titulo: 'Sin solicitudes', texto: perfil.verificacion_estado === 'verificado' ? 'Se verificó con su correo institucional.' : 'Todavía no envía un comprobante.' }}>
            {solicitudes.map((s) => (
              <li key={s.id}>
                <Link to={`/admin/verificaciones/${s.id}`} className="du-fila">
                  <span className="du-fila-principal">
                    <strong>{textoTipo(s.tipo_comprobante)}</strong>
                    <span>N.º {s.codigo} · {dia(s.fecha_solicitud)}</span>
                  </span>
                  <span className="du-fila-lado">
                    <ChipEstado tipo="solicitud" valor={s.estado}>{ESTADOS_SOLICITUD[s.estado] ?? s.estado}</ChipEstado>
                    <span className="du-fila-flecha">{ICONOS.flecha}</span>
                  </span>
                </Link>
              </li>
            ))}
          </Actividad>
        </div>
      </div>
    </PaginaAdmin>
  )
}
