import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { IconoHabito } from '../perfil/iconos.jsx'
import {
  CARACTERISTICAS, formatearFecha, formatearPesos, GENEROS_PREFERIDOS, REGLAS, SERVICIOS, textoDe, TIPOS,
} from '../publicaciones.js'
import { IconoPersona, IconoUbicacion } from './Iconos.jsx'
import {
  IconoAgua, IconoAnterior, IconoAuto, IconoDucha, IconoGas, IconoInternet, IconoLuz, IconoSede,
  IconoPostular, IconoSiguiente, IconoCama,
} from './IconosAlojamiento.jsx'
import SinFoto from './SinFoto.jsx'
import './fichaPublicacion.css'

// Leaflet solo se descarga al abrir un detalle
const MapaUbicacion = lazy(() => import('./MapaUbicacion.jsx'))

const ICONO_CARACTERISTICA = { amoblado: <IconoCama />, banio_privado: <IconoDucha />, estacionamiento: <IconoAuto /> }
const ICONO_SERVICIO = { agua: <IconoAgua />, luz: <IconoLuz />, gas: <IconoGas />, internet: <IconoInternet /> }
// Las reglas usan los mismos íconos que los hábitos del perfil
const HABITO_DE_REGLA = { permite_fumar: 'fumar', permite_mascotas: 'mascotas', permite_visitas: 'visitas' }
const TEXTO_REGLA = {
  permite_fumar: ['Se permite fumar', 'No se permite fumar'],
  permite_mascotas: ['Se permiten mascotas', 'No se permiten mascotas'],
  permite_visitas: ['Se permiten visitas', 'No se permiten visitas'],
}

const Svg = ({ children }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>
)
const IconoFotos = () => <Svg><rect x="3" y="5" width="18" height="14" rx="2.5" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-8 8" /></Svg>
const IconoCompartir = () => <Svg><path d="M12 15V4M8 8l4-4 4 4" /><path d="M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12" /></Svg>
const IconoMapa = () => <Svg><path d="M9 4L3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z" /><path d="M9 4v13.5M15 6.5V20" /></Svg>
const IconoCerrar = () => <Svg><path d="M6 6l12 12M18 6L6 18" /></Svg>
const IconoListo = () => <Svg><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>

// La principal primero, el resto en el orden en que se subieron
const ordenar = (fotos) => [...fotos].sort((a, b) => Number(b.es_principal) - Number(a.es_principal))

/**
 * Mosaico de fotos: la principal grande y, al lado, dos o cuatro más. Cada celda mantiene una
 * proporción 4:3 en cualquier ancho (nada se ve «de cerca» al achicar la pantalla). Las que no caben
 * se anuncian en la última celda; cualquier foto abre el visor.
 */
function Galeria({ fotos, abrir }) {
  if (!fotos.length) {
    return (
      <section className="fp-galeria" data-n="0" aria-label="Fotos del alojamiento">
        <div className="fp-celda sin-fotos">
          <SinFoto />
          <span className="fp-foto-nota">El oferente aún no sube fotos</span>
        </div>
      </section>
    )
  }
  const n = fotos.length
  const visibles = n >= 5 ? 5 : n >= 3 ? 3 : n
  const restantes = n - visibles
  return (
    <section className="fp-galeria" data-n={visibles} aria-label="Fotos del alojamiento">
      {fotos.slice(0, visibles).map((f, i) => (
        <button key={f.url} type="button" className="fp-celda" onClick={() => abrir(i)}
          style={visibles === 1 ? { '--foto': `url("${f.url}")` } : undefined}
          aria-label={`Ver foto ${i + 1} de ${n}`}>
          <img src={f.url} alt="" loading={i ? 'lazy' : 'eager'} />
          {i === visibles - 1 && restantes > 0 && (
            <span className="fp-mas"><strong>+{restantes}</strong> Ver fotos</span>
          )}
        </button>
      ))}
      {/* En el celular solo se ve la principal: este botón dice cuántas hay */}
      {n > 1 && (
        <button type="button" className="fp-ver-todas" onClick={() => abrir(0)}>
          <IconoFotos /> {n} fotos
        </button>
      )}
    </section>
  )
}

// Visor a pantalla completa: flechas, teclado, deslizar con el dedo y miniaturas
function VisorFotos({ fotos, inicial, cerrar }) {
  const dialogo = useRef(null)
  const toque = useRef(null)
  const [actual, setActual] = useState(inicial)
  const ir = (paso) => setActual((i) => (i + paso + fotos.length) % fotos.length)

  useEffect(() => {
    const d = dialogo.current
    d.showModal()
    return () => d.close()
  }, [])

  useEffect(() => {
    // La miniatura activa siempre a la vista
    dialogo.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [actual])

  const teclas = (e) => {
    if (e.key === 'ArrowRight') ir(1)
    if (e.key === 'ArrowLeft') ir(-1)
  }

  return (
    <dialog ref={dialogo} className="fp-visor" aria-label="Fotos del alojamiento"
      onCancel={(e) => { e.preventDefault(); cerrar() }} onKeyDown={teclas}
      onClick={(e) => e.target === e.currentTarget && cerrar()}>
      <div className="fp-visor-barra">
        <span aria-live="polite">{actual + 1} / {fotos.length}</span>
        <button type="button" className="fp-visor-cerrar" onClick={cerrar} aria-label="Cerrar fotos"><IconoCerrar /></button>
      </div>
      <div className="fp-visor-escena"
        onTouchStart={(e) => { toque.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - (toque.current ?? 0)
          if (Math.abs(dx) > 40) ir(dx < 0 ? 1 : -1)
        }}>
        <img key={actual} src={fotos[actual].url} alt={`Foto ${actual + 1} de ${fotos.length}`} />
        {fotos.length > 1 && (
          <>
            <button type="button" className="fp-flecha anterior" onClick={() => ir(-1)} aria-label="Foto anterior"><IconoAnterior /></button>
            <button type="button" className="fp-flecha siguiente" onClick={() => ir(1)} aria-label="Foto siguiente"><IconoSiguiente /></button>
          </>
        )}
      </div>
      {fotos.length > 1 && (
        <ul className="fp-visor-miniaturas">
          {fotos.map((f, i) => (
            <li key={f.url}>
              <button type="button" onClick={() => setActual(i)} aria-label={`Ver foto ${i + 1}`} aria-current={i === actual}>
                <img src={f.url} alt="" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </dialog>
  )
}

// Copia el enlace del alojamiento (o abre el menú de compartir del celular)
function BotonCompartir({ titulo }) {
  const [copiado, setCopiado] = useState(false)
  useEffect(() => {
    if (!copiado) return undefined
    const t = setTimeout(() => setCopiado(false), 2200)
    return () => clearTimeout(t)
  }, [copiado])

  const compartir = async () => {
    const url = window.location.href
    try {
      if (navigator.share && window.matchMedia('(pointer: coarse)').matches) await navigator.share({ title: titulo, url })
      else { await navigator.clipboard.writeText(url); setCopiado(true) }
    } catch { /* se canceló el menú de compartir */ }
  }
  return (
    <button type="button" className="fp-accion" onClick={compartir} data-listo={copiado || undefined}>
      {copiado ? <IconoListo /> : <IconoCompartir />}
      <span aria-live="polite">{copiado ? 'Enlace copiado' : 'Compartir'}</span>
    </button>
  )
}

/**
 * Detalle de un alojamiento tal como lo ve un estudiante (CA-05.5). También lo usa el administrador
 * (CA-29.3). `acciones` va en la tarjeta del precio (el botón principal de cada vista), `herramientas`
 * junto a «Compartir» en esa misma tarjeta (por ejemplo, reportar), `children`
 * debajo de ella en la columna derecha (quién publicó).
 */
export default function FichaPublicacion({ pub, acciones, herramientas, children }) {
  const { ubicacion, gastos, reglas, caracteristicas } = pub
  const [visor, setVisor] = useState(null)
  const fotos = ordenar(pub.fotos)
  // Lo que se paga al mes en total: el arriendo más los gastos que no están incluidos
  const incluidos = SERVICIOS.filter(({ clave }) => gastos[clave].incluido).length
  const gastosAparte = SERVICIOS.reduce((suma, { clave }) => suma + (gastos[clave].incluido ? 0 : gastos[clave].monto_estimado ?? 0), 0)

  // La ficha del alojamiento: para quién es y qué trae (el tipo va en el título; los gastos y el precio, aparte)
  const ficha = [
    {
      clave: 'cupos', icono: <IconoPersona />, nombre: 'Cupos',
      valor: `${pub.cupos_disponibles} de ${pub.cupos_totales} ${pub.cupos_disponibles === 1 ? 'disponible' : 'disponibles'}`,
    },
    {
      clave: 'genero', icono: <IconoPostular />, nombre: 'Pueden postular',
      valor: pub.genero_preferido === 'indiferente' ? 'Cualquier género' : textoDe(GENEROS_PREFERIDOS, pub.genero_preferido),
    },
    pub.distancia_km != null && {
      clave: 'sede', icono: <IconoSede />, nombre: 'Distancia a tu sede',
      valor: `${pub.distancia_km.toLocaleString('es-CL')} km`,
    },
    ...CARACTERISTICAS.map(({ clave, texto }) => ({
      clave, icono: ICONO_CARACTERISTICA[clave], nombre: texto, valor: caracteristicas[clave] ? 'Sí' : 'No',
      no: !caracteristicas[clave],
    })),
  ].filter(Boolean)

  const verUbicacion = () => {
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById('fp-ubicacion')?.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <div className="fp">
      <header className="fp-cabecera">
        <div className="fp-titulo">
          <p className="fp-meta">
            <span className="fp-tipo">{textoDe(TIPOS, pub.tipo)}</span>
            <span>Código {pub.codigo}</span>
          </p>
          <h1>{pub.titulo}</h1>
          <p className="fp-lugar">
            <IconoUbicacion />
            <span>{ubicacion.comuna_nombre}, {ubicacion.sector}</span>
          </p>
        </div>
      </header>

      {visor != null && <VisorFotos fotos={fotos} inicial={visor} cerrar={() => setVisor(null)} />}

      <div className="fp-cuerpo">
        <div className="fp-principal">
          <Galeria fotos={fotos} abrir={setVisor} />

          {/* Lo esencial, la descripción y los gastos: una sola tarjeta */}
          <div className="fp-tarjeta fp-secciones">
            <section className="fp-seccion" aria-labelledby="fp-ficha">
              <h2 id="fp-ficha">El alojamiento</h2>
              <dl className="fp-ficha">
                {ficha.map((d) => (
                  <div key={d.clave} data-no={d.no || undefined}>
                    <span className="fp-dato-icono" aria-hidden="true">{d.icono}</span>
                    <dt>{d.nombre}</dt>
                    <dd>{d.valor}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="fp-seccion" aria-labelledby="fp-descripcion">
              <h2 id="fp-descripcion">Descripción</h2>
              <p className="fp-texto">{pub.descripcion}</p>
            </section>

            <section className="fp-seccion" aria-labelledby="fp-reglas">
              <h2 id="fp-reglas">Reglas de la casa</h2>
              <ul className="fp-reglas" aria-labelledby="fp-reglas">
                {REGLAS.map(({ clave }) => (
                  <li key={clave} className={reglas[clave] ? 'si' : 'no'}>
                    <span className="fp-regla-icono"><IconoHabito clave={HABITO_DE_REGLA[clave]} tamano={18} /></span>
                    {TEXTO_REGLA[clave][reglas[clave] ? 0 : 1]}
                  </li>
                ))}
                <li className={reglas.horario_silencio.aplica ? 'si' : 'no'}>
                  <span className="fp-regla-icono"><IconoHabito clave="horario_sueno" tamano={18} /></span>
                  {reglas.horario_silencio.aplica
                    ? `Silencio de ${reglas.horario_silencio.desde} a ${reglas.horario_silencio.hasta}`
                    : 'Sin horario de silencio'}
                </li>
              </ul>
              {reglas.reglas_adicionales && <p className="fp-adicionales">{reglas.reglas_adicionales}</p>}
            </section>
          </div>
        </div>

        {/* Columna derecha: en el computador queda a la vista mientras se recorre el detalle */}
        <aside className="fp-lateral" aria-label="Precio y quién publica">
          <div className="fp-tarjeta fp-tarjeta-precio">
            <p className="fp-precio">{formatearPesos(pub.costo_mensual)}<span> / mes</span></p>
            {/* Gastos mensuales justo bajo el precio: se leen junto a lo que se paga */}
            <section className="fp-gastos" aria-labelledby="fp-gastos">
              <div className="fp-seccion-cabeza">
                <h2 id="fp-gastos">Gastos mensuales</h2>
                <p className="fp-gastos-resumen">{incluidos === SERVICIOS.length ? 'Incluidos' : `${incluidos} de ${SERVICIOS.length} incluidos`}</p>
              </div>
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
            {gastosAparte > 0 && (
              <p className="fp-total">
                Unos <strong>{formatearPesos(pub.costo_mensual + gastosAparte)}</strong> al mes con gastos
              </p>
            )}
            {acciones}
            {/* Atajos de la publicación: compartir, ir al mapa y (si corresponde) reportar */}
            <div className="fp-atajos">
              <BotonCompartir titulo={pub.titulo} />
              <button type="button" className="fp-accion" onClick={verUbicacion}><IconoMapa /> Ubicación</button>
              {herramientas}
            </div>
            <p className="fp-fechas">
              Publicado el {formatearFecha(pub.fecha_publicacion)}
              {/* CA-07.5: fecha de la última modificación */}
              {pub.fecha_ultima_modificacion && <><br />Actualizado el {formatearFecha(pub.fecha_ultima_modificacion)}</>}
            </p>
          </div>
          {children}
        </aside>
      </div>

      {/* Ubicación: el mapa a la izquierda y la dirección a la derecha */}
      <section className="fp-ubicacion" id="fp-ubicacion" aria-labelledby="fp-titulo-ubicacion">
        <div className="fp-mapa">
          <Suspense fallback={<div className="fp-mapa-cargando" aria-label="Cargando el mapa" />}>
            <MapaUbicacion ubicacion={ubicacion} tipo={pub.tipo} esPropia={pub.es_propia} sede={pub.sede} />
          </Suspense>
        </div>

        <div className="fp-tarjeta fp-casa">
          <div className="fp-bloque">
            <h2 id="fp-titulo-ubicacion">Dirección</h2>
            <dl className="fp-direccion">
              {/* Como se escribe una dirección: calle y número, sector, comuna y la referencia */}
              <div>
                <dt>Calle</dt>
                <dd className={ubicacion.calle ? undefined : 'fp-sin-dato'}>{ubicacion.calle || 'Sin indicar'}</dd>
              </div>
              <div>
                <dt>Número</dt>
                <dd className={ubicacion.numero ? undefined : 'fp-sin-dato'}>{ubicacion.numero || 'Sin indicar'}</dd>
              </div>
              <div><dt>Sector</dt><dd>{ubicacion.sector}</dd></div>
              <div><dt>Comuna</dt><dd>{ubicacion.comuna_nombre}</dd></div>
              <div>
                <dt>Referencia</dt>
                <dd className={ubicacion.direccion_referencia ? undefined : 'fp-sin-dato'}>
                  {ubicacion.direccion_referencia || 'Sin referencia'}
                </dd>
              </div>
            </dl>
          </div>

          {/* A qué distancia queda la sede de quien mira (en línea recta, como en el mapa) */}
          {pub.sede && !pub.es_propia && pub.distancia_km != null && (
            <div className="fp-bloque fp-tu-sede">
              <span className="fp-tu-sede-icono" aria-hidden="true"><IconoSede /></span>
              <div>
                <p className="fp-tu-sede-rotulo">Tu sede</p>
                <p className="fp-tu-sede-texto">
                  <strong>{pub.sede.institucion} · {pub.sede.nombre}</strong> está a{' '}
                  <strong className="fp-tu-sede-km">{pub.distancia_km.toLocaleString('es-CL')} km</strong> de este alojamiento
                </p>
                <p className="fp-tu-sede-nota">
                  {ubicacion.punto ? 'En línea recta.' : `Aproximado: medido desde el centro de ${ubicacion.comuna_nombre}.`}
                  {pub.sede.direccion && <> La sede está en {pub.sede.direccion}, {pub.sede.comuna}.</>}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
