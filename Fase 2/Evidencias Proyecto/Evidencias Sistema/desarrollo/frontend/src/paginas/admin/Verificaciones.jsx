import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../api.js'
import Avatar from '../../componentes/Avatar.jsx'
import { ESTADOS_SOLICITUD, textoSituacion, textoTipo } from '../verificacion/datos.js'
import { ChipEstado, EncabezadoAdmin, EstadoVacio, FilasSilueta, ICONOS_ESTADO, PaginaAdmin, TablaAdmin, TarjetaKpi } from './ui/componentes.jsx'
import { fecha, haceCuanto, nombrePropio, partesNombre } from './ui/formato.js'
import { useIndicador } from './ui/animaciones.js'
import { useResumenModeracion } from './ui/useResumenModeracion.js'

const VISTAS = [
  { valor: 'pendientes', texto: 'Pendientes' },
  { valor: 'procesadas', texto: 'Historial' },
]
const IconoRevisar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" />
  </svg>
)
const DIA_MS = 86400000

// HU-22: «Solicitudes de verificación» del administrador. Las pendientes, de la más antigua a la
// más reciente (CA-22.1); las ya resueltas quedan en el historial (CA-22.4)
export default function Verificaciones() {
  // La vista y el resultado van en la dirección para que «volver» desde una solicitud regrese igual
  const [parametros, setParametros] = useSearchParams()
  const vista = parametros.get('vista') === 'procesadas' ? 'procesadas' : 'pendientes'
  const resultado = vista === 'procesadas' ? parametros.get('resultado') ?? '' : ''
  const resumen = useResumenModeracion()
  const [cargado, setCargado] = useState({ vista: null, solicitudes: null, error: '' })
  const [ahora] = useState(() => Date.now())

  useEffect(() => {
    api(`/verificacion/solicitudes?estado=${vista}`)
      .then((solicitudes) => setCargado({ vista, solicitudes, error: '' }))
      .catch((err) => setCargado({ vista, solicitudes: null, error: err.message }))
  }, [vista])

  const { solicitudes: todas, error } = cargado.vista === vista ? cargado : { solicitudes: null, error: '' }
  // En el historial, «Aprobadas» o «Rechazadas» filtran aquí mismo
  const solicitudes = todas && resultado ? todas.filter((s) => s.estado === resultado) : todas
  const ir = (nuevaVista, nuevoResultado = '') => setParametros(
    nuevaVista === 'pendientes' ? {} : { vista: nuevaVista, ...(nuevoResultado && { resultado: nuevoResultado }) },
    { replace: true },
  )
  const v = resumen?.verificaciones
  const segmentos = useIndicador(vista)

  return (
    <PaginaAdmin>
      <EncabezadoAdmin grupo="Moderación" titulo="Solicitudes de verificación"
        descripcion="Revisa los comprobantes que enviaron los estudiantes para acreditar su condición."
        acciones={
          <div ref={segmentos} className="a-segmentos" role="group" aria-label="Qué solicitudes ver">
            {VISTAS.map(({ valor, texto }) => (
              <button key={valor} type="button" aria-pressed={vista === valor} onClick={() => ir(valor)}>{texto}</button>
            ))}
          </div>
        } />

      {resumen !== false && (
        <div className="a-kpis" role="group" aria-label="Filtros rápidos">
          <TarjetaKpi etiqueta="Esperan revisión" icono={ICONOS_ESTADO.reloj} tono="espera" valor={v?.pendientes ?? '…'}
            elegida={vista === 'pendientes'} alElegir={() => ir('pendientes')} />
          <TarjetaKpi etiqueta={`Aprobadas (${resumen?.dias ?? 30} días)`} icono={ICONOS_ESTADO.check} tono="ok" valor={v?.aprobadas ?? '…'}
            elegida={vista === 'procesadas' && resultado === 'aprobada'} alElegir={() => ir('procesadas', 'aprobada')} />
          <TarjetaKpi etiqueta={`Rechazadas (${resumen?.dias ?? 30} días)`} icono={ICONOS_ESTADO.x} tono="error" valor={v?.rechazadas ?? '…'}
            elegida={vista === 'procesadas' && resultado === 'rechazada'} alElegir={() => ir('procesadas', 'rechazada')} />
        </div>
      )}

      {/* En el historial la fila está siempre, para que el listado no se mueva al filtrar */}
      {vista === 'procesadas' && (
        <div className="a-filtros-activos solos" data-animar="tarjeta">
          <span className="a-filtros-titulo">Filtro activo</span>
          {resultado ? (
            <button type="button" className="a-filtro-chip" onClick={() => ir('procesadas')}
              aria-label={`Quitar filtro ${ESTADOS_SOLICITUD[resultado]}`}>
              Resultado: {ESTADOS_SOLICITUD[resultado]} <span aria-hidden="true">×</span>
            </button>
          ) : <span className="a-filtros-ninguno">Ninguno · usa «Aprobadas» o «Rechazadas» para filtrar</span>}
        </div>
      )}

      {error && <p className="alerta" role="alert">{error}</p>}

      {solicitudes?.length === 0 && (
        vista === 'pendientes'
          ? <EstadoVacio titulo="¡Todo al día!" texto="No hay solicitudes de verificación esperando revisión." />
          : <EstadoVacio ilustracion="buscar" titulo={resultado ? 'Nada con ese resultado' : 'Sin historial todavía'}
              texto={resultado ? 'Prueba con el otro resultado o mira todo el historial.' : 'Aún no se ha procesado ninguna solicitud.'} />
      )}

      {/* Mientras carga, la tabla ya está en su lugar con filas de silueta (no hay spinner) */}
      {!error && (!solicitudes || solicitudes.length > 0) && (
        <div className="a-listado" data-animar="tabla" data-cargando={!solicitudes || undefined} aria-busy={!solicitudes}>
          <p className="a-conteo" role="status">
            {solicitudes
              ? `${solicitudes.length} ${solicitudes.length === 1 ? 'solicitud' : 'solicitudes'}${vista === 'pendientes' ? ', de la más antigua a la más reciente' : ''}`
              : 'Cargando solicitudes…'}
          </p>
          <TablaAdmin etiqueta={vista === 'pendientes' ? 'Solicitudes pendientes' : 'Historial de solicitudes'}
            columnas={vista === 'pendientes' ? ['30%', '16%', '22%', '17%', null] : ['28%', '14%', '20%', '13%', '13%', null]}>
            <thead>
              <tr>
                <th scope="col">Estudiante</th>
                <th scope="col">Institución</th>
                <th scope="col">Comprobante</th>
                <th scope="col">{vista === 'pendientes' ? 'Esperando' : 'Revisada'}</th>
                {vista === 'procesadas' && <th scope="col">Resultado</th>}
                <th scope="col"><span className="visualmente-oculto">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="a-tabla-tarjetas">
              {!solicitudes && <FilasSilueta columnas={vista === 'pendientes' ? 5 : 6} filas={4} />}
              {solicitudes?.map((s) => {
                const { nombre, apellido } = partesNombre(s.nombre)
                // Más de 3 días esperando: se marca para atenderla primero
                const demorada = vista === 'pendientes' && ahora - new Date(s.fecha_solicitud).getTime() > 3 * DIA_MS
                return (
                  <tr key={s.id} data-abierto={vista === 'pendientes' || undefined}>
                    <td data-etiqueta="Estudiante">
                      <span className="a-persona">
                        <Avatar nombre={nombre} apellido={apellido} foto={s.foto_url} tamano={40} />
                        <span>
                          <strong>{nombrePropio(s.nombre)}</strong>
                          <span className="a-tabla-sub">{s.correo} · N.º {s.codigo}</span>
                        </span>
                      </span>
                    </td>
                    <td data-etiqueta="Institución">{s.institucion_nombre ?? 'Sin indicar'}</td>
                    <td data-etiqueta="Comprobante">
                      {textoTipo(s.tipo_comprobante)}
                      <span className="a-tabla-sub">{textoSituacion(s.situacion)}</span>
                    </td>
                    <td data-etiqueta={vista === 'pendientes' ? 'Esperando' : 'Revisada'}>
                      {vista === 'pendientes' ? (
                        <>
                          <span className={demorada ? 'a-espera demorada' : 'a-espera'}>{haceCuanto(s.fecha_solicitud, ahora)}</span>
                          <span className="a-tabla-sub">Enviada el {fecha.format(new Date(s.fecha_solicitud))}</span>
                        </>
                      ) : fecha.format(new Date(s.fecha_revision))}
                    </td>
                    {vista === 'procesadas' && (
                      <td data-etiqueta="Resultado"><ChipEstado tipo="solicitud" valor={s.estado}>{ESTADOS_SOLICITUD[s.estado] ?? s.estado}</ChipEstado></td>
                    )}
                    <td>
                      <Link to={`/admin/verificaciones/${s.id}`} state={{ vista }} className={`a-boton${vista === 'pendientes' ? ' primario' : ''}`}
                        aria-label={`${vista === 'pendientes' ? 'Revisar' : 'Ver'} la solicitud de ${nombrePropio(s.nombre)}`}>
                        {vista === 'pendientes' && <IconoRevisar />} {vista === 'pendientes' ? 'Revisar' : 'Ver'}
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </TablaAdmin>
        </div>
      )}
    </PaginaAdmin>
  )
}
