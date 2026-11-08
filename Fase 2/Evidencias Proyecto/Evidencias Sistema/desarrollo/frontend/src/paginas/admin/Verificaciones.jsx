import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../api.js'
import { ESTADOS_SOLICITUD, fechaCorta, textoSituacion, textoTipo } from '../verificacion/datos.js'
import { ChipEstado, EncabezadoAdmin, EstadoVacio, PaginaAdmin, TablaAdmin } from './ui/componentes.jsx'

const VISTAS = [
  { valor: 'pendientes', texto: 'Pendientes' },
  { valor: 'procesadas', texto: 'Historial' },
]

// HU-22: «Solicitudes de verificación» del administrador. Las pendientes, de la más antigua a la
// más reciente (CA-22.1); las ya resueltas quedan en el historial (CA-22.4)
export default function Verificaciones() {
  // La vista va en la dirección para que «volver» desde una solicitud regrese a la misma
  const [parametros, setParametros] = useSearchParams()
  const vista = parametros.get('vista') === 'procesadas' ? 'procesadas' : 'pendientes'
  // Se guarda junto con la vista que se pidió: al cambiar de vista, lo anterior deja de mostrarse
  const [cargado, setCargado] = useState({ vista: null, solicitudes: null, error: '' })

  useEffect(() => {
    api(`/verificacion/solicitudes?estado=${vista}`)
      .then((solicitudes) => setCargado({ vista, solicitudes, error: '' }))
      .catch((err) => setCargado({ vista, solicitudes: null, error: err.message }))
  }, [vista])

  const { solicitudes, error } = cargado.vista === vista ? cargado : { solicitudes: null, error: '' }

  return (
    <PaginaAdmin>
      <EncabezadoAdmin grupo="Moderación" titulo="Solicitudes de verificación"
        descripcion="Revisa los comprobantes que enviaron los estudiantes para acreditar su condición."
        acciones={
          <div className="a-segmentos" role="group" aria-label="Qué solicitudes ver">
            {VISTAS.map(({ valor, texto }) => (
              <button key={valor} type="button" aria-pressed={vista === valor}
                onClick={() => setParametros(valor === 'pendientes' ? {} : { vista: valor }, { replace: true })}>
                {texto}
              </button>
            ))}
          </div>
        } />

      {error && <p className="alerta" role="alert">{error}</p>}
      {!solicitudes && !error && <p className="cargando">Cargando…</p>}

      {solicitudes?.length === 0 && (
        vista === 'pendientes'
          ? <EstadoVacio titulo="¡Todo al día!" texto="No hay solicitudes de verificación esperando revisión." />
          : <EstadoVacio ilustracion="buscar" titulo="Sin historial todavía" texto="Aún no se ha procesado ninguna solicitud." />
      )}

      {solicitudes?.length > 0 && (
        <TablaAdmin etiqueta={vista === 'pendientes' ? 'Solicitudes pendientes' : 'Historial de solicitudes'}>
            <thead>
              <tr>
                <th scope="col">N.º</th>
                <th scope="col">Estudiante</th>
                <th scope="col">Institución</th>
                <th scope="col">Comprobante</th>
                <th scope="col">{vista === 'pendientes' ? 'Enviada' : 'Revisada'}</th>
                {vista === 'procesadas' && <th scope="col">Resultado</th>}
                <th scope="col"><span className="visualmente-oculto">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.map((s) => (
                <tr key={s.id}>
                  <td>{s.codigo}</td>
                  <td>
                    <strong>{s.nombre}</strong>
                    <span className="a-tabla-sub">{s.correo}</span>
                  </td>
                  <td>{s.institucion_nombre ?? 'Sin indicar'}</td>
                  <td>
                    {textoTipo(s.tipo_comprobante)}
                    <span className="a-tabla-sub">{textoSituacion(s.situacion)}</span>
                  </td>
                  <td>{fechaCorta.format(new Date(vista === 'pendientes' ? s.fecha_solicitud : s.fecha_revision))}</td>
                  {vista === 'procesadas' && (
                    <td><ChipEstado tipo="solicitud" valor={s.estado}>{ESTADOS_SOLICITUD[s.estado] ?? s.estado}</ChipEstado></td>
                  )}
                  <td>
                    <Link to={`/admin/verificaciones/${s.id}`} state={{ vista }} className={`a-boton${vista === 'pendientes' ? ' primario' : ''}`}>
                      {vista === 'pendientes' ? 'Revisar' : 'Ver'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
        </TablaAdmin>
      )}
    </PaginaAdmin>
  )
}
