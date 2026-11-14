import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { api } from '../../api.js'
import { guardarMemoria, leerMemoria } from '../../datos/memoria.js'
import Avatar from '../../componentes/Avatar.jsx'
import { GENEROS, textoGenero } from '../../perfil.js'
import { ESTADOS_CUENTA, ESTADOS_VERIFICACION, FILTRO_MODOS, textoCuenta, textoModo, textoVerificacion } from './datos.js'
import Paginacion from './Paginacion.jsx'
import './reportes.css'
import Buscador from '../../componentes/Buscador.jsx'
import FiltroFecha, { textoRango } from './ui/FiltroFecha.jsx'
import {
  BarraFiltros, ChipEstado, EncabezadoAdmin, EtiquetaRol, EstadoVacio, FilasSilueta, ICONOS_ESTADO, PaginaAdmin, TablaAdmin, TarjetaKpi,
} from './ui/componentes.jsx'
import { CampoDesplegable, FiltroColumna } from './ui/Desplegable.jsx'
import { fecha, nombrePropio, partesNombre, rut } from './ui/formato.js'

const IconoGestionar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" />
  </svg>
)
const IconoPersonas = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" />
  </svg>
)

// Filtros rápidos del resumen: cada tarjeta deja solo ese filtro
const RAPIDOS = [
  { clave: 'total', etiqueta: 'Estudiantes', filtro: {}, icono: <IconoPersonas />, tono: 'acento' },
  { clave: 'verificados', etiqueta: 'Verificados', filtro: { verificacion: 'verificado' }, icono: ICONOS_ESTADO.check, tono: 'ok' },
  { clave: 'pendientes', etiqueta: 'Por verificar', filtro: { verificacion: 'pendiente' }, icono: ICONOS_ESTADO.reloj, tono: 'espera' },
  { clave: 'suspendidos', etiqueta: 'Suspendidos', filtro: { cuenta: 'suspendida' }, icono: ICONOS_ESTADO.prohibido, tono: 'error' },
]

// Filtros de la tabla: van en el título de su columna (en el celular, sin títulos, en la barra de arriba)
const FILTROS = [
  { clave: 'modo', etiqueta: 'Rol', opciones: [{ valor: '', texto: 'Todos' }, ...FILTRO_MODOS] },
  { clave: 'genero', etiqueta: 'Género', opciones: [{ valor: '', texto: 'Todos' }, ...GENEROS] },
  { clave: 'verificacion', etiqueta: 'Verificación', opciones: [{ valor: '', texto: 'Todas' }, ...ESTADOS_VERIFICACION] },
  { clave: 'cuenta', etiqueta: 'Cuenta', opciones: [{ valor: '', texto: 'Todas' }, ...ESTADOS_CUENTA] },
]
const SIN_FILTROS = { buscar: '', verificacion: '', cuenta: '', genero: '', modo: '', desde: '', hasta: '' }

// HU-28: «Usuarios» del administrador. El buscador, los filtros y la página van en la dirección
// para que «volver» desde una ficha regrese al mismo listado
export default function Usuarios() {
  const [parametros, setParametros] = useSearchParams()
  const aviso = useLocation().state?.aviso // al volver de eliminar una cuenta desde su ficha
  const consulta = parametros.toString()
  // Se guarda junto con la consulta pedida. Al cambiar un filtro nunca se ven los resultados de la
  // consulta anterior: los de esta (si ya se pidió en la sesión, desde la caché) o filas silueta
  const ruta = `/admin/usuarios${consulta ? `?${consulta}` : ''}`
  const [cargado, setCargado] = useState({ consulta: null, datos: null, error: '' })

  useEffect(() => {
    api(ruta)
      .then((datos) => {
        guardarMemoria(ruta, datos)
        setCargado({ consulta, datos, error: '' })
      })
      .catch((err) => setCargado({ consulta, datos: null, error: err.message }))
  }, [consulta, ruta])

  const actualizando = cargado.consulta !== consulta
  const datos = actualizando ? (leerMemoria(ruta) ?? null) : cargado.datos
  const error = actualizando ? '' : cargado.error

  // Cambiar el buscador o un filtro vuelve a la primera página
  const aplicar = (cambios) => {
    const nuevos = new URLSearchParams(parametros)
    nuevos.delete('pagina')
    Object.entries(cambios).forEach(([clave, valor]) => (valor ? nuevos.set(clave, valor) : nuevos.delete(clave)))
    setParametros(nuevos, { replace: true })
  }
  const irAPagina = (pagina) => {
    const nuevos = new URLSearchParams(parametros)
    if (pagina > 1) nuevos.set('pagina', String(pagina))
    else nuevos.delete('pagina')
    setParametros(nuevos)
  }

  const buscar = parametros.get('buscar') ?? ''
  const verificacion = parametros.get('verificacion') ?? ''
  const cuenta = parametros.get('cuenta') ?? ''
  const genero = parametros.get('genero') ?? ''
  const modo = parametros.get('modo') ?? ''
  const desde = parametros.get('desde') ?? ''
  const hasta = parametros.get('hasta') ?? ''
  const fechas = { etiqueta: 'Registro', desde, hasta, alAplicar: (d, h) => aplicar({ desde: d, hasta: h }) }
  const valores = { modo, genero, verificacion, cuenta }
  const filtroDe = (clave) => {
    const f = FILTROS.find((x) => x.clave === clave)
    return <FiltroColumna etiqueta={f.etiqueta} valor={valores[clave]} opciones={f.opciones} alCambiar={(v) => aplicar({ [clave]: v })} />
  }
  const activos = [
    buscar && { clave: 'buscar', texto: `Búsqueda: «${buscar}»`, quitar: () => aplicar({ buscar: '' }) },
    verificacion && { clave: 'verificacion', texto: `Verificación: ${textoVerificacion(verificacion)}`, quitar: () => aplicar({ verificacion: '' }) },
    cuenta && { clave: 'cuenta', texto: `Cuenta: ${textoCuenta(cuenta)}`, quitar: () => aplicar({ cuenta: '' }) },
    desde && { clave: 'fecha', texto: `Registro: ${textoRango(desde, hasta)}`, quitar: () => aplicar({ desde: '', hasta: '' }) },
    modo && { clave: 'modo', texto: `Rol: ${textoModo(modo)}`, quitar: () => aplicar({ modo: '' }) },
    genero && { clave: 'genero', texto: `Género: ${textoGenero(genero)}`, quitar: () => aplicar({ genero: '' }) },
  ].filter(Boolean)
  // La tarjeta queda marcada cuando sus filtros son exactamente los aplicados
  const elegido = (r) => {
    const aplicados = { ...(verificacion && { verificacion }), ...(cuenta && { cuenta }), ...(genero && { genero }), ...(modo && { modo }), ...(desde && { desde }) }
    return JSON.stringify(aplicados) === JSON.stringify(r.filtro)
  }

  return (
    <PaginaAdmin>
      <EncabezadoAdmin grupo="Gestión" titulo="Usuarios" descripcion="Estudiantes registrados en RoomMatch."
        acciones={(
          <Buscador etiqueta="Nombre, correo o RUT" valor={buscar} alBuscar={(v) => aplicar({ buscar: v })}
            placeholder="Buscar nombre, correo o RUT" />
        )} />
      {aviso && <p className="exito" role="status">{aviso}</p>}

      {/* Resumen que también filtra: un clic deja solo ese grupo */}
      <div className="a-kpis" role="group" aria-label="Filtros rápidos">
        {RAPIDOS.map((r) => (
          <TarjetaKpi key={r.clave} etiqueta={r.etiqueta} icono={r.icono} tono={r.tono}
            valor={datos?.resumen ? datos.resumen[r.clave] : '…'} elegida={elegido(r)}
            alElegir={() => aplicar({ verificacion: '', cuenta: '', genero: '', modo: '', desde: '', hasta: '', ...r.filtro })} />
        ))}
      </div>

      {/* En el computador los filtros van en los títulos de la tabla: aquí solo quedan los activos */}
      <BarraFiltros etiqueta="Filtros de usuarios" activos={activos} className="a-filtros-ligera" mostrarActivos={false}
        alLimpiar={() => aplicar(SIN_FILTROS)}>
        <div className="a-solo-movil">
          {FILTROS.map((f) => (
            <CampoDesplegable key={f.clave} etiqueta={f.etiqueta} valor={valores[f.clave]}
              alCambiar={(v) => aplicar({ [f.clave]: v })} opciones={f.opciones} />
          ))}
          <FiltroFecha variante="campo" {...fechas} etiqueta="Fecha de registro" />
        </div>
      </BarraFiltros>

      {error && <p className="alerta" role="alert">{error}</p>}

      {datos?.resultados.length === 0 && !activos.length && (
        <EstadoVacio ilustracion="buscar" titulo="Aún no hay estudiantes" texto="Cuando alguien se registre, aparecerá aquí." />
      )}

      {/* Mientras carga, la tabla ya está en su lugar con filas de silueta (no hay spinner) */}
      {!error && (!datos || datos.resultados.length > 0 || activos.length > 0) && (
        <div className="a-listado" data-actualizando={actualizando || undefined} aria-busy={!datos || actualizando}
          data-animar="tabla" data-cargando={!datos || undefined}>
          {/* Solo para el lector de pantalla: cuántos resultados quedaron al filtrar */}
          <p className="visualmente-oculto" role="status">
            {datos ? `${datos.total} ${datos.total === 1 ? 'usuario' : 'usuarios'}${activos.length ? ' con estos filtros' : ''}` : 'Cargando usuarios'}
          </p>
          <TablaAdmin etiqueta="Usuarios" columnas={['19%', '11%', '11%', '10%', '13%', '10%', '12%', null]}>
            <thead>
              <tr>
                <th scope="col">Usuario</th>
                <th scope="col">RUT</th>
                <th scope="col" className="a-th-filtro">{filtroDe('modo')}</th>
                <th scope="col" className="a-th-filtro">{filtroDe('genero')}</th>
                <th scope="col" className="a-th-filtro">{filtroDe('verificacion')}</th>
                <th scope="col" className="a-th-filtro">{filtroDe('cuenta')}</th>
                <th scope="col" className="a-th-filtro"><FiltroFecha {...fechas} /></th>
                <th scope="col"><span className="visualmente-oculto">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="a-tabla-tarjetas">
              {!datos && <FilasSilueta columnas={8} filas={6} />}
              {datos?.resultados.map((u) => {
                const { nombre, apellido } = partesNombre(u.nombre)
                return (
                  <tr key={u.id} data-id={u.id}>
                    <td data-etiqueta="Usuario">
                      <span className="a-persona">
                        <Avatar nombre={nombre} apellido={apellido} foto={u.foto_url} tamano={40} />
                        <span>
                          <strong>{nombrePropio(u.nombre)}</strong>
                          <span className="a-tabla-sub">{u.correo}</span>
                        </span>
                      </span>
                    </td>
                    <td data-etiqueta="RUT" className="a-rut">{rut(u.rut)}</td>
                    <td data-etiqueta="Rol"><EtiquetaRol modo={u.modo} /></td>
                    <td data-etiqueta="Género">{u.genero ? textoGenero(u.genero) : <span className="a-tabla-sub">Sin indicar</span>}</td>
                    <td data-etiqueta="Verificación">
                      <ChipEstado tipo="verificacion" valor={u.verificacion_estado}>{textoVerificacion(u.verificacion_estado)}</ChipEstado>
                    </td>
                    <td data-etiqueta="Cuenta"><ChipEstado tipo="cuenta" valor={u.estado_cuenta}>{textoCuenta(u.estado_cuenta)}</ChipEstado></td>
                    <td data-etiqueta="Registro">{fecha.format(new Date(u.fecha_registro))}</td>
                    <td>
                      <Link to={`/admin/usuarios/${u.id}`} state={{ volver: `/admin/usuarios?${consulta}` }} className="a-boton"
                        aria-label={`Gestionar a ${nombrePropio(u.nombre)}`}>
                        <IconoGestionar /> Gestionar
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {datos?.resultados.length === 0 && (
                <tr className="a-fila-vacia">
                  <td colSpan={8}>
                    <EstadoVacio compacto ilustracion="buscar" titulo="Ningún usuario coincide" texto="Prueba con otro nombre, correo o filtro."
                      accion={<button type="button" className="a-boton" onClick={() => aplicar(SIN_FILTROS)}>Quitar filtros</button>} />
                  </td>
                </tr>
              )}
            </tbody>
          </TablaAdmin>
        </div>
      )}

      {datos && <Paginacion datos={datos} irAPagina={irAPagina} etiqueta="Páginas de usuarios" />}
    </PaginaAdmin>
  )
}
