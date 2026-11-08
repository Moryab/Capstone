import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../api.js'
import {
  ESTADOS_REPORTE, textoEstadoReporte, textoMotivo, textoTipoReporte, TIPOS_REPORTE,
} from '../../reportes.js'
import { fechaCorta } from '../verificacion/datos.js'
import './reportes.css'
import { CampoDesplegable } from './ui/Desplegable.jsx'
import { BarraFiltros, ChipEstado, EncabezadoAdmin, EstadoVacio, PaginaAdmin, TablaAdmin } from './ui/componentes.jsx'

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

  const filtrar = (nombre, valor) => {
    const nuevos = new URLSearchParams(parametros)
    if (valor) nuevos.set(nombre, valor)
    else nuevos.delete(nombre)
    setParametros(nuevos, { replace: true })
  }

  return (
    <PaginaAdmin>
      <EncabezadoAdmin grupo="Moderación" titulo="Reportes"
        descripcion="Revisa los perfiles y las publicaciones que reportaron los usuarios." />

      <BarraFiltros etiqueta="Filtrar reportes">
        <CampoDesplegable etiqueta="Estado" valor={parametros.get('estado') ?? ''} alCambiar={(v) => filtrar('estado', v)}
          opciones={[{ valor: '', texto: 'Todos' }, ...ESTADOS_REPORTE]} />
        <CampoDesplegable etiqueta="Tipo" valor={parametros.get('tipo') ?? ''} alCambiar={(v) => filtrar('tipo', v)}
          opciones={[{ valor: '', texto: 'Todos' }, ...TIPOS_REPORTE]} />
      </BarraFiltros>

      {error && <p className="alerta" role="alert">{error}</p>}
      {!reportes && !error && <p className="cargando">Cargando…</p>}

      {reportes?.length === 0 && (
        consulta
          ? <EstadoVacio ilustracion="buscar" titulo="Ningún reporte coincide" texto="Prueba con otro estado o tipo." />
          : <EstadoVacio titulo="¡Todo al día!" texto="No hay reportes por revisar. Cuando alguien reporte un perfil o una publicación, aparecerá aquí." />
      )}

      {reportes?.length > 0 && (
        <TablaAdmin etiqueta="Reportes">
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
                  <td><ChipEstado tipo="reporte" valor={r.estado}>{textoEstadoReporte(r.estado)}</ChipEstado></td>
                  <td>
                    <Link to={`/admin/reportes/${r.id}`} state={{ volver: `/admin/reportes?${consulta}` }}
                      className="a-boton">
                      Revisar
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
