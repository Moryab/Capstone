import { useCifraAnimada } from './animaciones.js'
import './detalle.css'

/*
 * Piezas de las fichas del administrador (usuario y publicación), sobre la base del detalle de
 * moderación: íconos, cifras de colores, listas con su estado vacío dibujado y la silueta de carga.
 * Los estilos (prefijo du-) están en detalle.css
 */

export const Svg = ({ children }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)
export const ICONOS = {
  rut: <Svg><rect x="3" y="5" width="18" height="14" rx="3" /><circle cx="9" cy="11" r="2.2" /><path d="M6 16c.6-1.6 1.7-2.3 3-2.3s2.4.7 3 2.3M14.5 10h4M14.5 13.5h3" /></Svg>,
  correo: <Svg><rect x="3" y="5.5" width="18" height="13" rx="3" /><path d="M4 7.5l8 6 8-6" /></Svg>,
  telefono: <Svg><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></Svg>,
  nacimiento: <Svg><rect x="4" y="10" width="16" height="10" rx="2.5" /><path d="M4 14.5c2 1.5 4 1.5 5.3 0 1.4 1.5 4 1.5 5.4 0 1.3 1.5 3.3 1.5 5.3 0M12 10V7M12 4.5v.01" /></Svg>,
  genero: <Svg><circle cx="12" cy="8.5" r="4" /><path d="M5 20c1.2-3.6 3.8-5.5 7-5.5s5.8 1.9 7 5.5" /></Svg>,
  registro: <Svg><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M4 10h16M9 3v4M15 3v4M9 14.5l2 2 4-4" /></Svg>,
  institucion: <Svg><path d="M3 9.5L12 5l9 4.5-9 4.5z" /><path d="M7 11.5V16c1.4 1.4 3 2 5 2s3.6-.6 5-2v-4.5M21 9.5v5" /></Svg>,
  sede: <Svg><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.4" /></Svg>,
  carrera: <Svg><path d="M5 4.5h10.5a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h10.5M9 8.5h6" /></Svg>,
  ingreso: <Svg><path d="M4 20V9l8-5 8 5v11" /><path d="M9 20v-6h6v6" /></Svg>,
  origen: <Svg><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.3 2.5 3.3 5.3 3.3 8.5s-1 6-3.3 8.5c-2.3-2.5-3.3-5.3-3.3-8.5s1-6 3.3-8.5z" /></Svg>,
  casa: <Svg><path d="M4 11l8-6.5 8 6.5V20H4z" /><path d="M10 20v-5h4v5" /></Svg>,
  bandera: <Svg><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></Svg>,
  escudo: <Svg><path d="M12 3l7.5 3v5.5c0 4.6-3.2 8-7.5 9.5-4.3-1.5-7.5-4.9-7.5-9.5V6z" /><path d="M9 12l2.2 2.2L15.5 10" /></Svg>,
  alerta: <Svg><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17v.01" /></Svg>,
  candado: <Svg><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></Svg>,
  papelera: <Svg><path d="M4.5 7h15M10 4h4M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5" /></Svg>,
  flecha: <Svg><path d="M9 6l6 6-6 6" /></Svg>,
  precio: <Svg><path d="M3.5 12.5l8-8H19a1.5 1.5 0 0 1 1.5 1.5v7.5l-8 8z" /><circle cx="16" cy="8" r="1.6" /></Svg>,
  cupos: <Svg><circle cx="9" cy="8.5" r="3.2" /><path d="M3.5 19c.9-3 3-4.6 5.5-4.6s4.6 1.6 5.5 4.6M15.5 5.6a3 3 0 0 1 0 5.8M17.5 14.6c1.5.6 2.5 2 3 4.4" /></Svg>,
  historial: <Svg><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5" /><path d="M4 4v4.5h4.5M12 8v4.2l3 1.8" /></Svg>,
  oculto: <Svg><path d="M3 3l18 18M10.6 5.6A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.2 6.9C3.8 8.6 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.6 0 3-.4 4.2-1" /></Svg>,
  ojo: <Svg><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></Svg>,
  pausa: <Svg><circle cx="12" cy="12" r="8.5" /><path d="M10 9v6M14 9v6" /></Svg>,
}

// Cifra de la cabecera, que cuenta hasta su valor al aparecer
export function Cifra({ etiqueta, valor, tono, icono, detalle, formato = (n) => String(Math.round(n)) }) {
  const ref = useCifraAnimada(valor, formato)
  return (
    <div className="du-cifra" data-tono={tono}>
      <span className="du-cifra-icono">{ICONOS[icono]}</span>
      <dt>{etiqueta}</dt>
      <dd ref={ref}>{formato(valor)}</dd>
      {detalle && <span className="du-cifra-detalle">{detalle}</span>}
    </div>
  )
}

// Estados vacíos de las listas, con su dibujo
export const DIBUJOS_VACIO = {
  publicaciones: (
    <svg viewBox="0 0 96 72" aria-hidden="true">
      <ellipse cx="48" cy="66" rx="32" ry="4" className="du-v-sombra" />
      <path d="M22 34l26-20 26 20v28H22z" className="du-v-fondo" />
      <path d="M40 62V46h16v16" className="du-v-linea" />
      <path d="M16 36l32-25 32 25" className="du-v-linea" />
      <circle cx="74" cy="18" r="8" className="du-v-acento" />
      <path d="M74 14v8M70 18h8" className="du-v-check" />
    </svg>
  ),
  reportes: (
    <svg viewBox="0 0 96 72" aria-hidden="true">
      <ellipse cx="48" cy="66" rx="30" ry="4" className="du-v-sombra" />
      <path d="M48 8l22 8v16c0 14-9 24-22 29-13-5-22-15-22-29V16z" className="du-v-fondo" />
      <path d="M38 34l7 7 13-14" className="du-v-check-grande" />
      <circle cx="76" cy="14" r="3" className="du-v-acento" />
      <circle cx="18" cy="24" r="2.5" className="du-v-acento" />
    </svg>
  ),
  solicitudes: (
    <svg viewBox="0 0 96 72" aria-hidden="true">
      <ellipse cx="48" cy="66" rx="32" ry="4" className="du-v-sombra" />
      <rect x="18" y="18" width="60" height="40" rx="8" className="du-v-fondo" />
      <circle cx="34" cy="36" r="7" className="du-v-acento" />
      <path d="M48 32h20M48 40h14" className="du-v-linea" />
      <path d="M36 10l12-5 12 5-12 5z" className="du-v-birrete" />
    </svg>
  ),
  // Portapapeles con un reloj: «sin acciones de moderación»
  historial: (
    <svg viewBox="0 0 96 72" aria-hidden="true">
      <ellipse cx="48" cy="66" rx="30" ry="4" className="du-v-sombra" />
      <rect x="26" y="10" width="44" height="52" rx="8" className="du-v-fondo" />
      <rect x="38" y="6" width="20" height="9" rx="4" className="du-v-birrete" />
      <path d="M36 30h24M36 40h18M36 50h12" className="du-v-linea" />
      <circle cx="70" cy="50" r="11" className="du-v-acento" />
      <path d="M70 44.5V50l3.5 2.2" className="du-v-check" />
    </svg>
  ),
}

// Lista de la actividad (publicaciones, reportes, solicitudes) o su estado vacío ilustrado
export function Actividad({ id, titulo, icono, elementos, vacio, dibujo = id, children }) {
  return (
    <section className="md-tarjeta du-actividad" aria-labelledby={id}>
      <div className="du-tarjeta-cabeza">
        <h2 className="du-tarjeta-titulo" id={id}>
          <span className="du-tarjeta-icono" data-icono={icono}>{ICONOS[icono]}</span>
          {titulo}
        </h2>
        <span className="du-contador" data-cero={elementos.length === 0 || undefined}>{elementos.length}</span>
      </div>
      {elementos.length === 0 ? (
        <div className="du-vacio">
          {DIBUJOS_VACIO[dibujo]}
          <div>
            <p className="du-vacio-titulo">{vacio.titulo}</p>
            <p className="du-vacio-texto">{vacio.texto}</p>
          </div>
        </div>
      ) : <ul className="du-lista">{children}</ul>}
    </section>
  )
}


/**
 * Skeleton de los detalles de moderación (reporte y verificación): la ilustración, el rótulo, el título,
 * los tres pasos y las dos columnas (lo que se revisa y la decisión), con las mismas medidas que la
 * página real. Espera 150 ms invisible: si la carga es rápida, no se ve
 */
export function SiluetaModeracion({ botonVolver, etiqueta, columnas = 'md-cuerpo' }) {
  return (
    <>
      {botonVolver}
      <div className="md-panel du-silueta esq-zona-bloque" role="status" aria-label={etiqueta}>
        <div className="md-cabeza">
          <span className="du-s du-s-ilustracion md-s-ilustracion" />
          <div className="md-cabeza-texto">
            <span className="du-s" style={{ width: '45%' }} />
            <span className="du-s du-s-titulo" />
            <div className="md-pasos" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span key={i} className="md-s-paso"><span className="du-s md-s-marca" /><span className="du-s" style={{ width: '70%' }} /></span>
              ))}
            </div>
          </div>
        </div>
        <div className={columnas}>
          <div className="md-columna">
            <span className="du-s du-s-tarjeta" style={{ height: 240 }} />
            <span className="du-s du-s-tarjeta" style={{ height: 180 }} />
          </div>
          <span className="du-s du-s-tarjeta" style={{ height: 436 }} />
        </div>
      </div>
    </>
  )
}
