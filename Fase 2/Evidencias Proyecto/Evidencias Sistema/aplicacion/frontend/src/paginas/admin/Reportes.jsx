import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../api.js'
import { useResumenAdmin } from '../../marco/ResumenAdmin.jsx'
import { textoEstadoReporte, textoMotivo, textoResolucion } from '../../reportes.js'
import Paginacion from './Paginacion.jsx'
import { MotivosReportes, ResumenReportes } from './ResumenReportes.jsx'
import './reportes.css'
import {
  ChipEstado, EncabezadoAdmin, EstadoVacio, FilasSilueta, ICONOS_ESTADO, PaginaAdmin, TablaAdmin,
} from './ui/componentes.jsx'
import { fecha, haceCuanto, nombrePropio } from './ui/formato.js'
import { useIndicador } from './ui/animaciones.js'
import { useResumenModeracion } from './ui/useResumenModeracion.js'

const Svg = ({ children }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
)
const IconoPerfil = () => <Svg><circle cx="12" cy="8" r="3.8" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></Svg>
const IconoCasa = () => <Svg><path d="M4 11l8-6.5 8 6.5V20H4z" /><path d="M10 20v-5h4v5" /></Svg>
const IconoBandera = () => <Svg><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></Svg>
const IconoRevisar = () => <Svg><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></Svg>

const ABIERTOS = ['pendiente', 'en_revision']
// En «Todos» cada bloque muestra 5, así ningún tipo queda enterrado bajo el otro; dentro de su
// pestaña, el listado completo va por páginas. El orden es el de la API (CA-26.1): primero los
// pendientes, de la más antigua a la más reciente; después en revisión y al final los resueltos
const VISTA_PREVIA = 5
// Selector de las tablas. «Sin resolver» (pendientes + en revisión) es lo que se ve al entrar
const FILTROS_ESTADO = [
  { valor: 'sin_resolver', texto: 'Sin resolver' },
  { valor: 'pendiente', texto: 'Pendientes' },
  { valor: 'en_revision', texto: 'En revisión' },
  { valor: 'resuelto', texto: 'Resueltos' },
]
const POR_DEFECTO = 'sin_resolver'
const POR_PAGINA = 20
// Perfiles y publicaciones se revisan por separado: cada uno tiene su pestaña y su tabla
const TIPOS = [
  { valor: 'usuario', pestana: 'Perfiles', titulo: 'Perfiles reportados', columna: 'Perfil', icono: <IconoPerfil />, pendientes: 'reportes_pendientes_perfiles' },
  { valor: 'publicacion', pestana: 'Publicaciones', titulo: 'Publicaciones reportadas', columna: 'Publicación', icono: <IconoCasa />, pendientes: 'reportes_pendientes_publicaciones' },
]

function TablaReportes({ reportes, tipo, consulta }) {
  // Sin `reportes` (cargando): filas de silueta del mismo alto
  return (
    <TablaAdmin etiqueta={tipo.titulo}>
      <thead>
        <tr>
          <th scope="col">{tipo.columna}</th>
          <th scope="col">Motivo</th>
          <th scope="col">Recibido</th>
          <th scope="col">Estado</th>
          <th scope="col">Revisado por</th>
          <th scope="col"><span className="visualmente-oculto">Acciones</span></th>
        </tr>
      </thead>
      <tbody className="a-tabla-tarjetas">
        {!reportes && <FilasSilueta columnas={6} filas={3} />}
        {reportes?.map((rep) => {
          const abierto = ABIERTOS.includes(rep.estado)
          return (
            <tr key={rep.id} data-abierto={abierto || undefined}>
              <td data-etiqueta={tipo.columna}>
                <span className="a-persona">
                  <span className="a-icono-tipo" data-tipo={rep.tipo_elemento} aria-hidden="true">{tipo.icono}</span>
                  <span>
                    <strong>{rep.reportado ? (rep.tipo_elemento === 'usuario' ? nombrePropio(rep.reportado) : rep.reportado) : <em>Ya no existe</em>}</strong>
                    {/* Para identificarlo sin abrir el reporte: el correo del perfil (el RUT queda en su
                        ficha) o el N.º de la publicación */}
                    <span className="a-tabla-sub">
                      {rep.tipo_elemento === 'usuario'
                        ? rep.reportado_correo ?? 'Perfil'
                        : (rep.publicacion_codigo != null ? `Publicación N.º ${rep.publicacion_codigo}` : 'Publicación')}
                    </span>
                  </span>
                </span>
              </td>
              <td data-etiqueta="Motivo">{textoMotivo(rep.motivo)}</td>
              <td data-etiqueta="Recibido">
                {fecha.format(new Date(rep.fecha_reporte))}
                {abierto && <span className="a-tabla-sub">{haceCuanto(rep.fecha_reporte)}</span>}
              </td>
              <td data-etiqueta="Estado">
                <ChipEstado tipo="reporte" valor={rep.estado}>{textoEstadoReporte(rep.estado)}</ChipEstado>
                {/* Resuelto: queda como historial y dice cómo terminó */}
                {rep.resolucion && <span className="a-tabla-sub a-resolucion">{textoResolucion(rep.resolucion)}</span>}
              </td>
              <td data-etiqueta="Revisado por">
                {rep.revisado_por
                  ? <span className="a-revisor">{nombrePropio(rep.revisado_por)}</span>
                  : <span className="a-tabla-sub">Sin tomar</span>}
              </td>
              <td>
                <Link to={`/admin/reportes/${rep.id}`} state={{ volver: `/admin/reportes?${consulta}` }}
                  className={`a-boton${abierto ? ' primario' : ''}`} aria-label={`${abierto ? 'Revisar' : 'Ver'} el reporte N.º ${rep.codigo}`}>
                  {abierto && <IconoRevisar />} {abierto ? 'Revisar' : 'Ver'}
                </Link>
              </td>
            </tr>
          )
        })}
      </tbody>
    </TablaAdmin>
  )
}

// HU-26: «Reportes» del administrador. Los filtros van en la dirección para que «volver» desde un
// reporte regrese al mismo listado
export default function Reportes() {
  const [parametros, setParametros] = useSearchParams()
  const consulta = parametros.toString()
  // «Todos» muestra siempre los sin resolver (la prioridad); en Perfiles y Publicaciones se elige con
  // el selector. La API los entrega de los más antiguos a los más recientes (CA-26.1)
  const tipoUrl = parametros.get('tipo') ?? ''
  const estadoUrl = tipoUrl ? parametros.get('estado') ?? POR_DEFECTO : POR_DEFECTO
  const consultaApi = new URLSearchParams({ ...(tipoUrl && { tipo: tipoUrl }), estado: estadoUrl }).toString()
  const resumen = useResumenModeracion(parametros.get('tipo') ?? '')
  const { resumen: barra } = useResumenAdmin()
  // Se guarda junto con la consulta pedida: al cambiar los filtros, lo anterior se ve atenuado
  const [cargado, setCargado] = useState({ consulta: null, reportes: null, error: '' })

  useEffect(() => {
    api(`/reportes${consultaApi ? `?${consultaApi}` : ''}`)
      .then((reportes) => setCargado({ consulta: consultaApi, reportes, error: '' }))
      .catch((err) => setCargado({ consulta: consultaApi, reportes: null, error: err.message }))
  }, [consultaApi])

  const { reportes, error } = cargado
  const actualizando = cargado.consulta !== consultaApi

  const filtrar = (cambios) => {
    const nuevos = new URLSearchParams(parametros)
    Object.entries(cambios).forEach(([nombre, valor]) => (valor ? nuevos.set(nombre, valor) : nuevos.delete(nombre)))
    if (!('pagina' in cambios)) nuevos.delete('pagina') // otro filtro vuelve a la primera página
    setParametros(nuevos, { replace: true })
  }

  const estado = estadoUrl
  const tipo = tipoUrl
  const pestanas = useIndicador(tipo)
  const selectorEstado = useIndicador(`${tipo}-${estado}`) // también al entrar a una pestaña: el selector recién aparece
  const tiposVisibles = TIPOS.filter((t) => !tipo || t.valor === tipo)
  const paginaPedida = Math.max(1, Number(parametros.get('pagina')) || 1)
  const r = resumen?.reportes

  return (
    <PaginaAdmin>
      <EncabezadoAdmin grupo="Moderación" titulo="Reportes"
        descripcion="Revisa los perfiles y las publicaciones que reportaron los usuarios." />

      <div ref={pestanas} className="a-pestanas-tipo" data-animar="tarjeta" role="group" aria-label="Qué reportes ver">
        {[{ valor: '', pestana: 'Todos', icono: <IconoBandera /> }, ...TIPOS].map((t) => {
          const pendientes = t.pendientes ? barra?.[t.pendientes] : barra?.reportes_pendientes
          return (
            <button key={t.valor} type="button" aria-pressed={tipo === t.valor} data-tipo={t.valor || 'todos'}
              onClick={() => filtrar({ tipo: t.valor, estado: '' })}>
              <span className="a-pestana-icono" aria-hidden="true">{t.icono}</span>
              {t.pestana}
              {pendientes > 0 && <span className="a-pestana-contador" aria-label={`${pendientes} pendientes`}>{pendientes}</span>}
            </button>
          )
        })}
      </div>

      {resumen !== false && (
        <>
          <ResumenReportes r={r} tipo={tipo} />
          {/* Los motivos van solo en «Todos», donde se comparan los dos tipos */}
          {!tipo && <MotivosReportes r={r} tipo={tipo} />}
        </>
      )}

      {tipo ? (
        // Perfiles y Publicaciones: filtra la tabla. Sin tarjeta, como los segmentos de «Período» del panel
        <div className="r-filtro-estado" data-animar="titulo">
          <span className="r-rotulo" id="r-mostrar">Mostrar</span>
          <div ref={selectorEstado} className="a-segmentos" role="group" aria-labelledby="r-mostrar">
            {FILTROS_ESTADO.map((f) => (
              <button key={f.valor} type="button" aria-pressed={estado === f.valor}
                onClick={() => filtrar({ estado: f.valor === POR_DEFECTO ? '' : f.valor })}>
                {f.texto}
              </button>
            ))}
          </div>
        </div>
      ) : (
        // Todos: los sin resolver más antiguos de cada tipo, que son los que hay que atender primero
        <p className="r-prioridad" data-animar="titulo">
          <span className="r-prioridad-icono" aria-hidden="true">{ICONOS_ESTADO.reloj}</span>
          <span>
            <strong>Primero lo más antiguo.</strong> Aquí se muestran los reportes sin resolver que llevan más tiempo
            esperando, para que los atiendas antes que los demás.
          </span>
        </p>
      )}

      {error && <p className="alerta" role="alert">{error}</p>}

      {reportes?.length === 0 && (
        estado === POR_DEFECTO
          ? <EstadoVacio titulo="¡Todo al día!" texto="No hay reportes por revisar" />
          : <EstadoVacio ilustracion="buscar" titulo={`No hay reportes ${{ pendiente: 'pendientes', en_revision: 'en revisión', resuelto: 'resueltos' }[estado] ?? ''}`}
              texto="Prueba con otro estado del selector."
              accion={<button type="button" className="a-boton" onClick={() => filtrar({ estado: '' })}>Ver sin resolver</button>} />
      )}

      {/* Mientras carga, cada bloque ya está en su lugar con filas de silueta (no hay spinner) */}
      {!error && (!reportes || reportes.length > 0) && (
        <div className="a-listado a-grupos-reportes" data-actualizando={actualizando || undefined} aria-busy={!reportes || actualizando}>
          {!reportes && <p className="visualmente-oculto" role="status">Cargando reportes</p>}
          {tiposVisibles.map((t) => {
            const propios = reportes ? reportes.filter((rep) => rep.tipo_elemento === t.valor) : null
            if (!propios) {
              return (
                <section key={t.valor} className="a-grupo-reportes" data-tipo={t.valor} data-animar="tabla" data-cargando aria-hidden="true">
                  <div className="a-grupo-cabeza">
                    <h2 className="a-grupo-titulo"><span className="a-icono-tipo" data-tipo={t.valor}>{t.icono}</span>{t.titulo}</h2>
                  </div>
                  <TablaReportes reportes={null} tipo={t} consulta={consulta} />
                </section>
              )
            }
            const paginas = Math.max(1, Math.ceil(propios.length / POR_PAGINA))
            const pagina = Math.min(paginaPedida, paginas)
            const visibles = tipo
              ? propios.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)
              : propios.slice(0, VISTA_PREVIA)
            const ocultos = propios.length - visibles.length
            return (
              <section key={t.valor} className="a-grupo-reportes" data-tipo={t.valor} aria-labelledby={`grupo-${t.valor}`} data-animar="tabla">
                <div className="a-grupo-cabeza">
                  <h2 id={`grupo-${t.valor}`} className="a-grupo-titulo">
                    <span className="a-icono-tipo" data-tipo={t.valor} aria-hidden="true">{t.icono}</span>
                    {t.titulo}
                    <span className="a-grupo-conteo">{propios.length}</span>
                  </h2>
                  {!tipo && ocultos > 0 && (
                    <button type="button" className="a-enlace-grupo" onClick={() => filtrar({ tipo: t.valor })}>
                      Ver los {propios.length} <span aria-hidden="true">→</span>
                    </button>
                  )}
                </div>
                {propios.length > 0
                  ? <TablaReportes reportes={visibles} tipo={t} consulta={consulta} />
                  : <p className="a-grupo-vacio">No hay reportes de {t.pestana.toLowerCase()} con estos filtros.</p>}
                {!tipo && ocultos > 0 && (
                  <button type="button" className="a-boton a-grupo-mas" onClick={() => filtrar({ tipo: t.valor })}>
                    Ver {ocultos} {ocultos === 1 ? 'reporte más' : 'reportes más'} de {t.pestana.toLowerCase()}
                  </button>
                )}
                {tipo && (
                  <Paginacion datos={{ pagina, paginas }} etiqueta={`Páginas de ${t.titulo.toLowerCase()}`}
                    irAPagina={(n) => { filtrar({ pagina: n > 1 ? String(n) : '' }); window.scrollTo({ top: 0 }) }} />
                )}
              </section>
            )
          })}
        </div>
      )}
    </PaginaAdmin>
  )
}
