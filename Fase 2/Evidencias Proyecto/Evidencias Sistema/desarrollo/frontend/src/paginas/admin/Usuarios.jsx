import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../api.js'
import { fechaCorta } from '../verificacion/datos.js'
import { ESTADOS_CUENTA, ESTADOS_VERIFICACION, textoCuenta, textoVerificacion } from './datos.js'
import './reportes.css'

// HU-28: «Usuarios» del administrador. El buscador, los filtros y la página van en la dirección
// para que «volver» desde una ficha regrese al mismo listado
export default function Usuarios() {
  const [parametros, setParametros] = useSearchParams()
  const consulta = parametros.toString()
  const [texto, setTexto] = useState(parametros.get('buscar') ?? '')
  // Se guarda junto con la consulta pedida: al cambiar, lo anterior deja de mostrarse
  const [cargado, setCargado] = useState({ consulta: null, datos: null, error: '' })

  useEffect(() => {
    api(`/admin/usuarios${consulta ? `?${consulta}` : ''}`)
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

  const hayCriterios = ['buscar', 'verificacion', 'cuenta'].some((clave) => parametros.get(clave))

  return (
    <main className="tarjeta pagina-admin">
      <h1>Usuarios</h1>
      <p className="subtitulo">Estudiantes registrados en RoomMatch.</p>

      <form className="admin-filtros" onSubmit={buscar} role="search">
        <label className="admin-buscador">
          Nombre o correo
          <span>
            <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={100}
              placeholder="Buscar…" />
            <button type="submit" className="boton secundario">Buscar</button>
          </span>
        </label>
        <label>
          Verificación
          <select value={parametros.get('verificacion') ?? ''}
            onChange={(e) => aplicar({ verificacion: e.target.value })}>
            <option value="">Todas</option>
            {ESTADOS_VERIFICACION.map(({ valor, texto: t }) => <option key={valor} value={valor}>{t}</option>)}
          </select>
        </label>
        <label>
          Cuenta
          <select value={parametros.get('cuenta') ?? ''} onChange={(e) => aplicar({ cuenta: e.target.value })}>
            <option value="">Todas</option>
            {ESTADOS_CUENTA.map(({ valor, texto: t }) => <option key={valor} value={valor}>{t}</option>)}
          </select>
        </label>
      </form>

      {error && <p className="alerta" role="alert">{error}</p>}
      {!datos && !error && <p className="cargando">Cargando…</p>}

      {datos?.resultados.length === 0 && (
        <p className="admin-vacio">
          {hayCriterios ? 'Ningún usuario coincide con la búsqueda.' : 'Aún no hay estudiantes registrados.'}
        </p>
      )}

      {datos?.resultados.length > 0 && (
        <>
          <p className="revision-sub" role="status">
            {datos.total} {datos.total === 1 ? 'usuario' : 'usuarios'}
          </p>
          <div className="admin-tabla-contenedor">
            <table className="admin-tabla">
              <thead>
                <tr>
                  <th scope="col">Nombre</th>
                  <th scope="col">Correo</th>
                  <th scope="col">Verificación</th>
                  <th scope="col">Cuenta</th>
                  <th scope="col">Registro</th>
                  <th scope="col"><span className="visualmente-oculto">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {datos.resultados.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.nombre}</strong></td>
                    <td>{u.correo}</td>
                    <td>
                      <span className={`etiqueta-estado ${u.verificacion_estado}`}>
                        {textoVerificacion(u.verificacion_estado)}
                      </span>
                    </td>
                    <td><span className={`etiqueta-estado ${u.estado_cuenta}`}>{textoCuenta(u.estado_cuenta)}</span></td>
                    <td>{fechaCorta.format(new Date(u.fecha_registro))}</td>
                    <td>
                      <Link to={`/admin/usuarios/${u.id}`} state={{ volver: `/admin/usuarios?${consulta}` }}
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

      {datos?.paginas > 1 && (
        <nav className="paginacion" aria-label="Páginas de usuarios">
          <button type="button" className="boton secundario" disabled={datos.pagina <= 1}
            onClick={() => irAPagina(datos.pagina - 1)}>
            Anterior
          </button>
          <span>Página {datos.pagina} de {datos.paginas}</span>
          <button type="button" className="boton secundario" disabled={datos.pagina >= datos.paginas}
            onClick={() => irAPagina(datos.pagina + 1)}>
            Siguiente
          </button>
        </nav>
      )}
    </main>
  )
}
