import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../api.js'
import { formatearPesos } from '../../publicaciones.js'
import { fechaCorta } from '../verificacion/datos.js'
import { ESTADOS_PUBLICACION, textoPublicacion } from './datos.js'
import Paginacion from './Paginacion.jsx'
import './reportes.css'

// HU-29: «Publicaciones» del administrador. Las eliminadas también aparecen (CA-29.4). El buscador,
// los filtros, el orden y la página van en la dirección para que «volver» regrese al mismo listado
export default function Publicaciones() {
  const [parametros, setParametros] = useSearchParams()
  const consulta = parametros.toString()
  const [texto, setTexto] = useState(parametros.get('buscar') ?? '')
  const [comunas, setComunas] = useState([])
  // Se guarda junto con la consulta pedida: al cambiar, lo anterior deja de mostrarse
  const [cargado, setCargado] = useState({ consulta: null, datos: null, error: '' })

  useEffect(() => {
    api('/catalogos/publicacion').then(({ comunas: lista }) => setComunas(lista)).catch(() => {})
  }, [])

  useEffect(() => {
    api(`/admin/publicaciones${consulta ? `?${consulta}` : ''}`)
      .then((datos) => setCargado({ consulta, datos, error: '' }))
      .catch((err) => setCargado({ consulta, datos: null, error: err.message }))
  }, [consulta])

  const { datos, error } = cargado.consulta === consulta ? cargado : { datos: null, error: '' }

  // Cambiar el buscador o un filtro vuelve a la primera página
  const aplicar = (cambios) => {
    const nuevos = new URLSearchParams(parametros)
    nuevos.delete('pagina')
    Object.entries(cambios).forEach(([clave, valor]) => {
      if (valor) nuevos.set(clave, valor)
      else nuevos.delete(clave)
    })
    setParametros(nuevos, { replace: true })
  }

  const irAPagina = (pagina) => {
    const nuevos = new URLSearchParams(parametros)
    if (pagina > 1) nuevos.set('pagina', String(pagina))
    else nuevos.delete('pagina')
    setParametros(nuevos)
  }

  const buscar = (e) => {
    e.preventDefault()
    aplicar({ buscar: texto.trim() })
  }

  const hayCriterios = ['buscar', 'estado', 'comuna'].some((clave) => parametros.get(clave))

  return (
    <main className="tarjeta pagina-admin">
      <h1>Publicaciones</h1>
      <p className="subtitulo">Supervisa los alojamientos publicados, incluidos los ocultos y eliminados.</p>

      <form className="admin-filtros" onSubmit={buscar} role="search">
        <label className="admin-buscador">
          Título u oferente
          <span>
            <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={100}
              placeholder="Buscar…" />
            <button type="submit" className="boton secundario">Buscar</button>
          </span>
        </label>
        <label>
          Estado
          <select value={parametros.get('estado') ?? ''} onChange={(e) => aplicar({ estado: e.target.value })}>
            <option value="">Todos</option>
            {ESTADOS_PUBLICACION.map(({ valor, texto: t }) => <option key={valor} value={valor}>{t}</option>)}
          </select>
        </label>
        <label>
          Comuna
          <select value={parametros.get('comuna') ?? ''} onChange={(e) => aplicar({ comuna: e.target.value })}>
            <option value="">Todas</option>
            {comunas.map(({ id, nombre }) => <option key={id} value={id}>{nombre}</option>)}
          </select>
        </label>
        <label>
          Ordenar por
          <select value={parametros.get('orden') ?? ''} onChange={(e) => aplicar({ orden: e.target.value })}>
            <option value="">Más recientes</option>
            <option value="reportes">Más reportes</option>
          </select>
        </label>
      </form>

      {error && <p className="alerta" role="alert">{error}</p>}
      {!datos && !error && <p className="cargando">Cargando…</p>}

      {datos?.resultados.length === 0 && (
        <p className="admin-vacio">
          {hayCriterios ? 'Ninguna publicación coincide con la búsqueda.' : 'Aún no hay publicaciones.'}
        </p>
      )}

      {datos?.resultados.length > 0 && (
        <>
          <p className="revision-sub" role="status">
            {datos.total} {datos.total === 1 ? 'publicación' : 'publicaciones'}
          </p>
          <div className="admin-tabla-contenedor">
            <table className="admin-tabla">
              <thead>
                <tr>
                  <th scope="col">Título</th>
                  <th scope="col">Oferente</th>
                  <th scope="col">Costo</th>
                  <th scope="col">Comuna</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Publicada</th>
                  <th scope="col">Reportes</th>
                  <th scope="col"><span className="visualmente-oculto">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {datos.resultados.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.titulo}</strong></td>
                    <td>{p.oferente ?? <em>Ya no existe</em>}</td>
                    <td>{formatearPesos(p.costo_mensual)}</td>
                    <td>{p.comuna}</td>
                    <td><span className={`etiqueta-estado ${p.estado}`}>{textoPublicacion(p.estado)}</span></td>
                    <td>{fechaCorta.format(new Date(p.fecha_publicacion))}</td>
                    <td>{p.cantidad_reportes}</td>
                    <td>
                      <Link to={`/admin/publicaciones/${p.id}`} state={{ volver: `/admin/publicaciones?${consulta}` }}
                        className="boton-tarjeta">
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {datos && <Paginacion datos={datos} irAPagina={irAPagina} etiqueta="Páginas de publicaciones" />}
    </main>
  )
}
