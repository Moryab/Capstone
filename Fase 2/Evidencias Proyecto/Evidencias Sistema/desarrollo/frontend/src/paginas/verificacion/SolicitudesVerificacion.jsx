import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../api.js'
import { ESTADOS_SOLICITUD, fechaCorta, textoTipo } from './datos.js'

const VISTAS = [
  { valor: 'pendientes', texto: 'Pendientes' },
  { valor: 'procesadas', texto: 'Historial' },
]

// HU-22: «Solicitudes de verificación» del administrador. Las pendientes, de la más antigua a la
// más reciente (CA-22.1); las ya resueltas quedan en el historial (CA-22.4)
export default function SolicitudesVerificacion() {
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

  const indice = VISTAS.findIndex((v) => v.valor === vista)

  return (
    <main className="tarjeta pagina-admin">
      <h1>Solicitudes de verificación</h1>
      <p className="subtitulo">Revisa los comprobantes que enviaron los estudiantes para acreditar su condición.</p>

      <div className="pestanas dos" style={{ '--pestana': indice }} role="group" aria-label="Qué solicitudes ver">
        <span className="pestanas-indicador" aria-hidden="true" />
        {VISTAS.map(({ valor, texto }) => (
          <button key={valor} type="button" className={`pestana${vista === valor ? ' activa' : ''}`}
            aria-pressed={vista === valor}
            onClick={() => setParametros(valor === 'pendientes' ? {} : { vista: valor }, { replace: true })}>
            {texto}
          </button>
        ))}
      </div>

      {error && <p className="alerta" role="alert">{error}</p>}
      {!solicitudes && !error && <p className="cargando">Cargando…</p>}

      {solicitudes?.length === 0 && (
        <p className="admin-vacio">
          {vista === 'pendientes' ? 'No hay solicitudes pendientes. ¡Todo al día!' : 'Aún no se ha procesado ninguna solicitud.'}
        </p>
      )}

      {solicitudes?.length > 0 && (
        <div className="admin-tabla-contenedor">
          <table className="admin-tabla">
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
                    <span className="admin-tabla-sub">{s.correo}</span>
                  </td>
                  <td>{s.institucion_nombre ?? 'Sin indicar'}</td>
                  <td>{textoTipo(s.tipo_comprobante)}</td>
                  <td>{fechaCorta.format(new Date(vista === 'pendientes' ? s.fecha_solicitud : s.fecha_revision))}</td>
                  {vista === 'procesadas' && (
                    <td><span className={`etiqueta-estado ${s.estado}`}>{ESTADOS_SOLICITUD[s.estado] ?? s.estado}</span></td>
                  )}
                  <td>
                    <Link to={`/admin/verificaciones/${s.id}`} state={{ vista }} className="boton-tarjeta">
                      {vista === 'pendientes' ? 'Revisar' : 'Ver'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
