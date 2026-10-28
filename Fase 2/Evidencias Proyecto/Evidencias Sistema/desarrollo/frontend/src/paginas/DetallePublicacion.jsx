import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api.js'
import Avatar from '../componentes/Avatar.jsx'
import {
  CARACTERISTICAS, ESTADOS, formatearFecha, formatearPesos, GENEROS_PREFERIDOS, REGLAS, SERVICIOS,
  textoDe, TIPOS,
} from '../publicaciones.js'

// Detalle de un alojamiento (CA-05.5). Lo ven todos los estudiantes si está activo; el oferente
// lo ve siempre y desde aquí puede ir a editarlo
export default function DetallePublicacion() {
  const { id } = useParams()
  const [resultado, setResultado] = useState({ id: null, pub: null, error: '' })
  const [fotoActual, setFotoActual] = useState(0)

  useEffect(() => {
    let vigente = true // evita mostrar una respuesta vieja si se cambia de publicación rápido
    api(`/publicaciones/${id}`)
      .then((pub) => {
        if (!vigente) return
        setResultado({ id, pub, error: '' })
        setFotoActual(0)
      })
      .catch((err) => vigente && setResultado({ id, pub: null, error: err.message }))
    return () => {
      vigente = false
    }
  }, [id])

  if (resultado.id !== id) return <p className="cargando">Cargando alojamiento…</p>

  if (resultado.error) {
    return (
      <main className="tarjeta">
        <h1>{resultado.error}</h1>
        <p className="subtitulo">Es posible que el alojamiento ya no esté disponible.</p>
        <Link to="/" className="boton">Volver al inicio</Link>
      </main>
    )
  }

  const { pub } = resultado
  const { ubicacion, gastos, reglas, caracteristicas, oferente } = pub
  const foto = pub.fotos[fotoActual]
  const conCaracteristicas = CARACTERISTICAS.filter(({ clave }) => caracteristicas[clave])

  return (
    <main className="detalle-publicacion">
      <Link to={pub.es_propia ? '/perfil' : '/'} className="volver">← Volver</Link>

      {pub.es_propia && pub.estado !== 'activa' && (
        <p className="alerta">
          Estado: {ESTADOS[pub.estado] ?? pub.estado}. Los demás estudiantes no ven esta publicación.
        </p>
      )}

      <div className="detalle-cuerpo">
        <section className="detalle-galeria" aria-label="Fotos del alojamiento">
          {foto ? (
            <img className="galeria-principal" src={foto.url} alt={`Foto ${fotoActual + 1} de ${pub.fotos.length}`} />
          ) : (
            <div className="galeria-principal sin-fotos">El oferente aún no sube fotos</div>
          )}
          {pub.fotos.length > 1 && (
            <ul className="galeria-miniaturas">
              {pub.fotos.map((f, i) => (
                <li key={f.url}>
                  <button type="button" onClick={() => setFotoActual(i)} aria-label={`Ver foto ${i + 1}`}
                    aria-pressed={i === fotoActual}>
                    <img src={f.url} alt="" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="tarjeta detalle-resumen">
          <p className="publicacion-meta">{textoDe(TIPOS, pub.tipo)} · Código {pub.codigo}</p>
          <h1>{pub.titulo}</h1>
          <p className="publicacion-meta">
            {ubicacion.comuna_nombre}, {ubicacion.sector}
            {ubicacion.direccion_referencia && ` · ${ubicacion.direccion_referencia}`}
          </p>
          <p className="publicacion-precio">{formatearPesos(pub.costo_mensual)} <span>/ mes</span></p>
          <ul className="detalle-datos">
            <li>{pub.cupos_disponibles} de {pub.cupos_totales} cupos disponibles</li>
            <li>Busca: {textoDe(GENEROS_PREFERIDOS, pub.genero_preferido)}</li>
            {gastos.todos_incluidos && <li>Todos los gastos incluidos</li>}
          </ul>

          {oferente && (
            <Link to={pub.es_propia ? '/perfil' : `/usuarios/${oferente.id}`} className="detalle-oferente">
              <Avatar nombre={oferente.nombre} apellido={oferente.ap_paterno} foto={oferente.foto_url} tamano={44} />
              <span>
                <strong>{oferente.nombre} {oferente.ap_paterno}</strong>
                <small>{oferente.verificado ? 'Estudiante verificado' : 'Ver perfil del oferente'}</small>
              </span>
            </Link>
          )}

          {pub.es_propia && (
            <Link to={`/publicaciones/${pub.id}/editar`} className="boton">Editar publicación</Link>
          )}

          <p className="detalle-fechas">
            Publicado el {formatearFecha(pub.fecha_publicacion)}
            {/* CA-07.5: fecha de la última modificación */}
            {pub.fecha_ultima_modificacion && (
              <> · Actualizado el {formatearFecha(pub.fecha_ultima_modificacion)}</>
            )}
          </p>
        </section>
      </div>

      <div className="detalle-secciones">
        <section className="tarjeta">
          <h2>Descripción</h2>
          <p className="detalle-texto">{pub.descripcion}</p>
        </section>

        <section className="tarjeta">
          <h2>Gastos mensuales</h2>
          <dl className="detalle-lista">
            {SERVICIOS.map(({ clave, texto }) => (
              <div key={clave}>
                <dt>{texto}</dt>
                <dd>{gastos[clave].incluido ? 'Incluido' : `${formatearPesos(gastos[clave].monto_estimado)} aprox.`}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="tarjeta">
          <h2>Reglas de la casa</h2>
          <dl className="detalle-lista">
            {REGLAS.map(({ clave, texto }) => (
              <div key={clave}>
                <dt>{texto.replace(/[¿?]/g, '')}</dt>
                <dd>{reglas[clave] ? 'Sí' : 'No'}</dd>
              </div>
            ))}
            <div>
              <dt>Horario de silencio</dt>
              <dd>
                {reglas.horario_silencio.aplica
                  ? `De ${reglas.horario_silencio.desde} a ${reglas.horario_silencio.hasta}`
                  : 'No tiene'}
              </dd>
            </div>
          </dl>
          {reglas.reglas_adicionales && <p className="detalle-texto">{reglas.reglas_adicionales}</p>}
        </section>

        {conCaracteristicas.length > 0 && (
          <section className="tarjeta">
            <h2>Características</h2>
            <ul className="detalle-datos">
              {conCaracteristicas.map(({ clave, texto }) => <li key={clave}>{texto}</li>)}
            </ul>
          </section>
        )}
      </div>
    </main>
  )
}
