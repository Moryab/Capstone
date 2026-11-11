import { lazy, Suspense, useState } from 'react'
import { IconoHabito } from '../perfil/iconos.jsx'
import {
  CARACTERISTICAS, formatearFecha, formatearPesos, GENEROS_PREFERIDOS, REGLAS, SERVICIOS, textoDe, textoDistancia,
  TIPOS,
} from '../publicaciones.js'
import { IconoPersona, IconoUbicacion } from './Iconos.jsx'
import {
  IconoAgua, IconoAnterior, IconoAuto, IconoDucha, IconoGas, IconoGastos, IconoInternet, IconoLuz, IconoSede,
  IconoSiguiente, IconoSillon,
} from './IconosAlojamiento.jsx'
import SinFoto from './SinFoto.jsx'
import './fichaPublicacion.css'

// Leaflet solo se descarga al abrir un detalle
const MapaUbicacion = lazy(() => import('./MapaUbicacion.jsx'))

const ICONO_CARACTERISTICA = { amoblado: <IconoSillon />, banio_privado: <IconoDucha />, estacionamiento: <IconoAuto /> }
const ICONO_SERVICIO = { agua: <IconoAgua />, luz: <IconoLuz />, gas: <IconoGas />, internet: <IconoInternet /> }
// Las reglas usan los mismos íconos que los hábitos del perfil
const HABITO_DE_REGLA = { permite_fumar: 'fumar', permite_mascotas: 'mascotas', permite_visitas: 'visitas' }
const TEXTO_REGLA = {
  permite_fumar: ['Se permite fumar', 'No se permite fumar'],
  permite_mascotas: ['Se permiten mascotas', 'No se permiten mascotas'],
  permite_visitas: ['Se permiten visitas', 'No se permiten visitas'],
}

// Fotos con flechas y miniaturas. Sin fotos, la habitación dibujada
function Galeria({ fotos }) {
  const [actual, setActual] = useState(0)
  const foto = fotos[actual]
  const ir = (paso) => setActual((i) => (i + paso + fotos.length) % fotos.length)

  if (!foto) {
    return (
      <section className="fp-galeria" aria-label="Fotos del alojamiento">
        <div className="fp-foto sin-fotos">
          <SinFoto />
          <span className="fp-foto-nota">El oferente aún no sube fotos</span>
        </div>
      </section>
    )
  }
  return (
    <section className="fp-galeria" aria-label="Fotos del alojamiento">
      <div className="fp-foto">
        <img src={foto.url} alt={`Foto ${actual + 1} de ${fotos.length}`} />
        {fotos.length > 1 && (
          <>
            <button type="button" className="fp-flecha anterior" onClick={() => ir(-1)} aria-label="Foto anterior">
              <IconoAnterior />
            </button>
            <button type="button" className="fp-flecha siguiente" onClick={() => ir(1)} aria-label="Foto siguiente">
              <IconoSiguiente />
            </button>
            <span className="fp-contador" aria-hidden="true">{actual + 1} / {fotos.length}</span>
          </>
        )}
      </div>
      {fotos.length > 1 && (
        <ul className="fp-miniaturas">
          {fotos.map((f, i) => (
            <li key={f.url}>
              <button type="button" onClick={() => setActual(i)} aria-label={`Ver foto ${i + 1}`} aria-pressed={i === actual}>
                <img src={f.url} alt="" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * Detalle de un alojamiento tal como lo ve un estudiante (CA-05.5). También lo usa el administrador
 * (CA-29.3). `children` va en la tarjeta lateral (quién publicó y las acciones de cada vista) y
 * `pie` debajo de ella, para lo secundario (por ejemplo, reportar).
 */
export default function FichaPublicacion({ pub, children, pie }) {
  const { ubicacion, gastos, reglas, caracteristicas } = pub
  const conCaracteristicas = CARACTERISTICAS.filter(({ clave }) => caracteristicas[clave])
  // Lo que se paga al mes en total: el arriendo más los gastos que no están incluidos
  const gastosAparte = SERVICIOS.reduce((suma, { clave }) => suma + (gastos[clave].incluido ? 0 : gastos[clave].monto_estimado ?? 0), 0)

  const datos = [
    { clave: 'cupos', icono: <IconoPersona />, texto: `${pub.cupos_disponibles} de ${pub.cupos_totales} ${pub.cupos_totales === 1 ? 'cupo disponible' : 'cupos disponibles'}` },
    pub.genero_preferido !== 'indiferente' && { clave: 'genero', icono: <IconoPersona />, texto: textoDe(GENEROS_PREFERIDOS, pub.genero_preferido) },
    pub.distancia_km != null && { clave: 'sede', icono: <IconoSede />, texto: textoDistancia(pub.distancia_km) },
    gastos.todos_incluidos && { clave: 'gastos', icono: <IconoGastos />, texto: 'Gastos incluidos' },
    ...conCaracteristicas.map(({ clave, texto }) => ({ clave, icono: ICONO_CARACTERISTICA[clave], texto })),
  ].filter(Boolean)

  return (
    <div className="fp">
      <header className="fp-cabecera">
        <p className="fp-meta">{textoDe(TIPOS, pub.tipo)} · Código {pub.codigo}</p>
        <h1>{pub.titulo}</h1>
        <p className="fp-lugar">
          <IconoUbicacion />
          <span>
            {ubicacion.comuna_nombre}, {ubicacion.sector}
            {ubicacion.direccion_referencia && ` · ${ubicacion.direccion_referencia}`}
          </span>
        </p>
      </header>

      <div className="fp-cuerpo">
        <Galeria key={pub.id} fotos={pub.fotos} />

        {/* Tarjeta lateral: en el computador queda a la vista mientras se recorre el detalle */}
        <aside className="fp-lateral" aria-label="Resumen y contacto">
          <div className="fp-tarjeta">
            <p className="fp-precio">{formatearPesos(pub.costo_mensual)}<span> / mes</span></p>
            {gastosAparte > 0 && (
              <p className="fp-total">
                Unos <strong>{formatearPesos(pub.costo_mensual + gastosAparte)}</strong> al mes con gastos
              </p>
            )}
            {children}
            <p className="fp-fechas">
              Publicado el {formatearFecha(pub.fecha_publicacion)}
              {/* CA-07.5: fecha de la última modificación */}
              {pub.fecha_ultima_modificacion && <> · Actualizado el {formatearFecha(pub.fecha_ultima_modificacion)}</>}
            </p>
          </div>
          {pie && <div className="fp-pie">{pie}</div>}
        </aside>

        <div className="fp-secciones">
          <ul className="fp-datos" aria-label="Datos clave">
            {datos.map((d) => <li key={d.clave}>{d.icono}{d.texto}</li>)}
          </ul>

          <section className="fp-seccion" aria-labelledby="fp-descripcion">
            <h2 id="fp-descripcion">Descripción</h2>
            <p className="fp-texto">{pub.descripcion}</p>
          </section>

          <section className="fp-seccion" aria-labelledby="fp-gastos">
            <h2 id="fp-gastos">Gastos mensuales</h2>
            <ul className="fp-servicios">
              {SERVICIOS.map(({ clave, texto }) => (
                <li key={clave} className={gastos[clave].incluido ? 'incluido' : undefined}>
                  <span className="fp-servicio-icono">{ICONO_SERVICIO[clave]}</span>
                  <span className="fp-servicio-nombre">{texto}</span>
                  <span className="fp-servicio-valor">
                    {gastos[clave].incluido ? 'Incluido' : `${formatearPesos(gastos[clave].monto_estimado)} aprox.`}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="fp-seccion" aria-labelledby="fp-reglas">
            <h2 id="fp-reglas">Reglas de la casa</h2>
            <ul className="fp-reglas">
              {REGLAS.map(({ clave }) => (
                <li key={clave} className={reglas[clave] ? 'si' : 'no'}>
                  <IconoHabito clave={HABITO_DE_REGLA[clave]} tamano={20} />
                  {TEXTO_REGLA[clave][reglas[clave] ? 0 : 1]}
                </li>
              ))}
              <li className={reglas.horario_silencio.aplica ? 'si' : 'no'}>
                <IconoHabito clave="horario_sueno" tamano={20} />
                {reglas.horario_silencio.aplica
                  ? `Silencio de ${reglas.horario_silencio.desde} a ${reglas.horario_silencio.hasta}`
                  : 'Sin horario de silencio'}
              </li>
            </ul>
            {reglas.reglas_adicionales && <p className="fp-adicionales">{reglas.reglas_adicionales}</p>}
          </section>

          <section className="fp-seccion" aria-labelledby="fp-ubicacion">
            <h2 id="fp-ubicacion">Ubicación</h2>
            <Suspense fallback={<p className="mapa-nota">Cargando el mapa…</p>}>
              <MapaUbicacion ubicacion={ubicacion} esPropia={pub.es_propia} />
            </Suspense>
          </section>
        </div>
      </div>
    </div>
  )
}
