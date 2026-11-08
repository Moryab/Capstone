import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../api.js'
import { useResumenAdmin } from '../../marco/ResumenAdmin.jsx'
import {
  ESTADOS_REPORTE, textoEstadoReporte, textoMotivo,
} from '../../reportes.js'
import Paginacion from './Paginacion.jsx'
import './reportes.css'
import {
  BarraFiltros, ChipEstado, EncabezadoAdmin, EstadoVacio, ICONOS_ESTADO, PaginaAdmin, TablaAdmin, TarjetaKpi,
} from './ui/componentes.jsx'
import { CampoDesplegable } from './ui/Desplegable.jsx'
import { fecha, haceCuanto, nombrePropio } from './ui/formato.js'
import { useResumenModeracion } from './ui/useResumenModeracion.js'

const Svg = ({ children }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
)
const IconoPerfil = () => <Svg><circle cx="12" cy="8" r="3.8" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></Svg>
const IconoCasa = () => <Svg><path d="M4 11l8-6.5 8 6.5V20H4z" /><path d="M10 20v-5h4v5" /></Svg>
const IconoBandera = () => <Svg><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></Svg>
const IconoRevisar = () => <Svg><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></Svg>

const ABIERTOS = ['pendiente', 'en_revision']
// En «Todos» cada bloque es una vista previa corta, así ningún tipo queda enterrado bajo el otro;
// dentro de su pestaña, el listado completo va por páginas
const VISTA_PREVIA = 5
const POR_PAGINA = 20
// Lo que aún hay que atender va primero; el orden de llegada se mantiene dentro de cada grupo
const abiertosPrimero = (lista) => [...lista].sort((a, b) => ABIERTOS.includes(b.estado) - ABIERTOS.includes(a.estado))
// Perfiles y publicaciones se revisan por separado: cada uno tiene su pestaña y su tabla
const TIPOS = [
  { valor: 'usuario', pestana: 'Perfiles', titulo: 'Perfiles reportados', columna: 'Perfil', icono: <IconoPerfil />, pendientes: 'reportes_pendientes_perfiles' },
  { valor: 'publicacion', pestana: 'Publicaciones', titulo: 'Publicaciones reportadas', columna: 'Publicación', icono: <IconoCasa />, pendientes: 'reportes_pendientes_publicaciones' },
]

function TablaReportes({ reportes, tipo, consulta }) {
  return (
    <TablaAdmin etiqueta={tipo.titulo}>
      <thead>
        <tr>
          <th scope="col">{tipo.columna}</th>
          <th scope="col">Motivo</th>
          <th scope="col">Recibido</th>
          <th scope="col">Estado</th>
          <th scope="col"><span className="visualmente-oculto">Acciones</span></th>
        </tr>
      </thead>
      <tbody className="a-tabla-tarjetas">
        {reportes.map((rep) => {
          const abierto = ABIERTOS.includes(rep.estado)
          return (
            <tr key={rep.id} data-abierto={abierto || undefined}>
              <td data-etiqueta={tipo.columna}>
                <span className="a-persona">
                  <span className="a-icono-tipo" data-tipo={rep.tipo_elemento} aria-hidden="true">{tipo.icono}</span>
                  <span>
                    <strong>{rep.reportado ? (rep.tipo_elemento === 'usuario' ? nombrePropio(rep.reportado) : rep.reportado) : <em>Ya no existe</em>}</strong>
                    <span className="a-tabla-sub">Reporte N.º {rep.codigo}</span>
                  </span>
                </span>
              </td>
              <td data-etiqueta="Motivo">{textoMotivo(rep.motivo)}</td>
              <td data-etiqueta="Recibido">
                {fecha.format(new Date(rep.fecha_reporte))}
                {abierto && <span className="a-tabla-sub">{haceCuanto(rep.fecha_reporte)}</span>}
              </td>
              <td data-etiqueta="Estado"><ChipEstado tipo="reporte" valor={rep.estado}>{textoEstadoReporte(rep.estado)}</ChipEstado></td>
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
  // La página no cambia lo que se pide a la API: se pagina aquí mismo
  const consultaApi = new URLSearchParams([...parametros].filter(([nombre]) => nombre !== 'pagina')).toString()
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

  const estado = parametros.get('estado') ?? ''
  const tipo = parametros.get('tipo') ?? ''
  // El tipo ya se ve en las pestañas: como filtro activo solo queda el estado
  const activos = [
    estado && { clave: 'estado', texto: `Estado: ${textoEstadoReporte(estado)}`, quitar: () => filtrar({ estado: '' }) },
  ].filter(Boolean)
  const tiposVisibles = TIPOS.filter((t) => !tipo || t.valor === tipo)
  const paginaPedida = Math.max(1, Number(parametros.get('pagina')) || 1)
  const r = resumen?.reportes
  // Resumen que también filtra por estado
  const rapidos = [
    { clave: 'pendiente', etiqueta: 'Pendientes', valor: r?.pendientes, icono: ICONOS_ESTADO.reloj, tono: 'espera' },
    { clave: 'en_revision', etiqueta: 'En revisión', valor: r?.en_revision, icono: ICONOS_ESTADO.lupa, tono: 'acento' },
    { clave: 'resuelto', etiqueta: `Resueltos (${resumen?.dias ?? 30} días)`, valor: r?.resueltos, icono: ICONOS_ESTADO.check, tono: 'ok' },
    { clave: '', etiqueta: tipo ? `Total de ${tipo === 'usuario' ? 'perfiles' : 'publicaciones'}` : 'Todos los reportes', valor: r?.total, icono: <IconoBandera />, tono: 'acento' },
  ]

  return (
    <PaginaAdmin>
      <EncabezadoAdmin grupo="Moderación" titulo="Reportes"
        descripcion="Revisa los perfiles y las publicaciones que reportaron los usuarios." />

      <div className="a-pestanas-tipo" role="group" aria-label="Qué reportes ver">
        {[{ valor: '', pestana: 'Todos', icono: <IconoBandera /> }, ...TIPOS].map((t) => {
          const pendientes = t.pendientes ? barra?.[t.pendientes] : barra?.reportes_pendientes
          return (
            <button key={t.valor} type="button" aria-pressed={tipo === t.valor} data-tipo={t.valor || 'todos'}
              onClick={() => filtrar({ tipo: t.valor })}>
              <span className="a-pestana-icono" aria-hidden="true">{t.icono}</span>
              {t.pestana}
              {pendientes > 0 && <span className="a-pestana-contador" aria-label={`${pendientes} pendientes`}>{pendientes}</span>}
            </button>
          )
        })}
      </div>

      {resumen !== false && (
        <div className="a-kpis" role="group" aria-label="Filtros rápidos por estado">
          {rapidos.map((k) => (
            <TarjetaKpi key={k.etiqueta} etiqueta={k.etiqueta} icono={k.icono} tono={k.tono}
              valor={k.valor ?? '…'} elegida={estado === k.clave} alElegir={() => filtrar({ estado: k.clave })} />
          ))}
        </div>
      )}

      <BarraFiltros etiqueta="Filtrar reportes" activos={activos} alLimpiar={() => filtrar({ estado: '' })}>
        <CampoDesplegable etiqueta="Estado" valor={estado} alCambiar={(v) => filtrar({ estado: v })}
          opciones={[{ valor: '', texto: 'Todos' }, ...ESTADOS_REPORTE]} />
      </BarraFiltros>

      {error && <p className="alerta" role="alert">{error}</p>}
      {!reportes && !error && <div className="a-cargando" role="status" aria-label="Cargando reportes"><span /><span /><span /></div>}

      {reportes?.length === 0 && (
        activos.length || tipo
          ? <EstadoVacio ilustracion="buscar" titulo="Ningún reporte coincide" texto="Prueba con otro estado o mira todos los reportes."
              accion={<button type="button" className="a-boton" onClick={() => filtrar({ estado: '', tipo: '' })}>Ver todos</button>} />
          : <EstadoVacio titulo="¡Todo al día!" texto="No hay reportes por revisar. Cuando alguien reporte un perfil o una publicación, aparecerá aquí." />
      )}

      {reportes?.length > 0 && (
        <div className="a-listado a-grupos-reportes" data-actualizando={actualizando || undefined} aria-busy={actualizando}>
          {tiposVisibles.map((t) => {
            const propios = abiertosPrimero(reportes.filter((rep) => rep.tipo_elemento === t.valor))
            const paginas = Math.max(1, Math.ceil(propios.length / POR_PAGINA))
            const pagina = Math.min(paginaPedida, paginas)
            const visibles = tipo
              ? propios.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)
              : propios.slice(0, VISTA_PREVIA)
            const ocultos = propios.length - visibles.length
            return (
              <section key={t.valor} className="a-grupo-reportes" data-tipo={t.valor} aria-labelledby={`grupo-${t.valor}`}>
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
