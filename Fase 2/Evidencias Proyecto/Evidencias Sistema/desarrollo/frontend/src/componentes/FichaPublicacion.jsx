import { useState } from 'react'
import {
  CARACTERISTICAS, formatearFecha, formatearPesos, GENEROS_PREFERIDOS, REGLAS, SERVICIOS, textoDe, TIPOS,
} from '../publicaciones.js'

// Detalle de un alojamiento tal como lo ve un estudiante (CA-05.5). También lo usa el administrador
// (CA-29.3). `children` va en el resumen: quién publicó y las acciones de cada vista
export default function FichaPublicacion({ pub, children }) {
  const [fotoActual, setFotoActual] = useState(0)
  const { ubicacion, gastos, reglas, caracteristicas } = pub
  const foto = pub.fotos[fotoActual]
  const conCaracteristicas = CARACTERISTICAS.filter(({ clave }) => caracteristicas[clave])

  return (
    <>
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

          {children}

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
    </>
  )
}
