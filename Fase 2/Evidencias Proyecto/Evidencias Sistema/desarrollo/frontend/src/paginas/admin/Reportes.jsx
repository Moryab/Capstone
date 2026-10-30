import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../api.js'
import {
  ESTADOS_REPORTE, textoEstadoReporte, textoMotivo, textoTipoReporte, TIPOS_REPORTE,
} from '../../reportes.js'
import { fechaCorta } from '../verificacion/datos.js'
import './reportes.css'

// HU-26: «Reportes» del administrador. Los filtros van en la dirección para que «volver» desde un
// reporte regrese al mismo listado
export default function Reportes() {
  const [parametros, setParametros] = useSearchParams()
  const consulta = parametros.toString()
  // Se guarda junto con la consulta pedida: al cambiar los filtros, lo anterior deja de mostrarse
  const [cargado, setCargado] = useState({ consulta: null, reportes: null, error: '' })

  useEffect(() => {
    api(`/reportes${consulta ? `?${consulta}` : ''}`)
      .then((reportes) => setCargado({ consulta, reportes, error: '' }))
      .catch((err) => setCargado({ consulta, reportes: null, error: err.message }))
  }, [consulta])

  const { reportes, error } = cargado.consulta === consulta ? cargado : { reportes: null, error: '' }

  const filtrar = (e) => {
    const nuevos = new URLSearchParams(parametros)
    if (e.target.value) nuevos.set(e.target.name, e.target.value)
    else nuevos.delete(e.target.name)
    setParametros(nuevos, { replace: true })
  }

  return (
    <main className="tarjeta pagina-admin">
      <h1>Reportes</h1>
      <p className="subtitulo">Revisa los perfiles y las publicaciones que reportaron los usuarios.</p>

      <div className="admin-filtros">
        <label>
          Estado
          <select name="estado" value={parametros.get('estado') ?? ''} onChange={filtrar}>
            <option value="">Todos</option>
            {ESTADOS_REPORTE.map(({ valor, texto }) => <option key={valor} value={valor}>{texto}</option>)}
          </select>
        </label>
        <label>
          Tipo
          <select name="tipo" value={parametros.get('tipo') ?? ''} onChange={filtrar}>
            <option value="">Todos</option>
            {TIPOS_REPORTE.map(({ valor, texto }) => <option key={valor} value={valor}>{texto}</option>)}
          </select>
        </label>
      </div>

      {error && <p className="alerta" role="alert">{error}</p>}
      {!reportes && !error && <p className="cargando">Cargando…</p>}

      {reportes?.length === 0 && (
        <p className="admin-vacio">
          {consulta ? 'Ningún reporte coincide con estos filtros.' : 'No hay reportes por revisar'}
        </p>
      )}

      {reportes?.length > 0 && (
        <div className="admin-tabla-contenedor">
          <table className="admin-tabla">
            <thead>
              <tr>
                <th scope="col">N.º</th>
                <th scope="col">Tipo</th>
                <th scope="col">Reportado</th>
                <th scope="col">Motivo</th>
                <th scope="col">Fecha</th>
                <th scope="col">Estado</th>
                <th scope="col"><span className="visualmente-oculto">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {reportes.map((r) => (
                <tr key={r.id}>
                  <td>{r.codigo}</td>
                  <td>{textoTipoReporte(r.tipo_elemento)}</td>
                  <td>{r.reportado ?? <em>Ya no existe</em>}</td>
                  <td>{textoMotivo(r.motivo)}</td>
                  <td>{fechaCorta.format(new Date(r.fecha_reporte))}</td>
                  <td><span className={`etiqueta-estado ${r.estado}`}>{textoEstadoReporte(r.estado)}</span></td>
                  <td>
                    <Link to={`/admin/reportes/${r.id}`} state={{ volver: `/admin/reportes?${consulta}` }}
                      className="boton-tarjeta">
                      Revisar
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
