import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { api } from '../../api.js'
import { fechaCorta } from '../verificacion/datos.js'
import { ESTADOS_CUENTA, ESTADOS_VERIFICACION, textoCuenta, textoVerificacion } from './datos.js'
import Paginacion from './Paginacion.jsx'
import './reportes.css'
import { CampoDesplegable } from './ui/Desplegable.jsx'
import { BarraFiltros, ChipEstado, EncabezadoAdmin, EstadoVacio, PaginaAdmin, TablaAdmin } from './ui/componentes.jsx'

// HU-28: «Usuarios» del administrador. El buscador, los filtros y la página van en la dirección
// para que «volver» desde una ficha regrese al mismo listado
export default function Usuarios() {
  const [parametros, setParametros] = useSearchParams()
  const aviso = useLocation().state?.aviso // al volver de eliminar una cuenta desde su ficha
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
    <PaginaAdmin>
      <EncabezadoAdmin grupo="Gestión" titulo="Usuarios" descripcion="Estudiantes registrados en RoomMatch." />
      {aviso && <p className="exito" role="status">{aviso}</p>}

      <BarraFiltros etiqueta="Buscar y filtrar">
      <form className="a-filtros-controles" onSubmit={buscar} role="search">
        <label className="a-buscador">
          Nombre o correo
          <span>
            <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={100}
              placeholder="Buscar…" />
            <button type="submit" className="a-boton">Buscar</button>
          </span>
        </label>
        <CampoDesplegable etiqueta="Verificación" valor={parametros.get('verificacion') ?? ''}
          alCambiar={(v) => aplicar({ verificacion: v })} opciones={[{ valor: '', texto: 'Todas' }, ...ESTADOS_VERIFICACION]} />
        <CampoDesplegable etiqueta="Cuenta" valor={parametros.get('cuenta') ?? ''}
          alCambiar={(v) => aplicar({ cuenta: v })} opciones={[{ valor: '', texto: 'Todas' }, ...ESTADOS_CUENTA]} />
      </form>
      </BarraFiltros>

      {error && <p className="alerta" role="alert">{error}</p>}
      {!datos && !error && <p className="cargando">Cargando…</p>}

      {datos?.resultados.length === 0 && (
        hayCriterios
          ? <EstadoVacio ilustracion="buscar" titulo="Ningún usuario coincide" texto="Prueba con otro nombre, correo o filtro." />
          : <EstadoVacio ilustracion="buscar" titulo="Aún no hay estudiantes" texto="Cuando alguien se registre, aparecerá aquí." />
      )}

      {datos?.resultados.length > 0 && (
        <>
          <p className="revision-sub" role="status">
            {datos.total} {datos.total === 1 ? 'usuario' : 'usuarios'}
          </p>
          <TablaAdmin etiqueta="Usuarios">
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
                      <ChipEstado tipo="verificacion" valor={u.verificacion_estado}>
                        {textoVerificacion(u.verificacion_estado)}
                      </ChipEstado>
                    </td>
                    <td><ChipEstado tipo="cuenta" valor={u.estado_cuenta}>{textoCuenta(u.estado_cuenta)}</ChipEstado></td>
                    <td>{fechaCorta.format(new Date(u.fecha_registro))}</td>
                    <td>
                      <Link to={`/admin/usuarios/${u.id}`} state={{ volver: `/admin/usuarios?${consulta}` }}
                        className="a-boton">
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
          </TablaAdmin>
        </>
      )}

      {datos && <Paginacion datos={datos} irAPagina={irAPagina} etiqueta="Páginas de usuarios" />}
    </PaginaAdmin>
  )
}
