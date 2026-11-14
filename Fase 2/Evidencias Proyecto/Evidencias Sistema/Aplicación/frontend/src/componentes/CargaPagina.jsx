import { Esqueleto, EsqueletoTarjeta } from './Esqueleto.jsx'

/*
 * Skeletons de página completa, para cuando todavía no hay nada que mostrar (nunca una pantalla en
 * blanco ni un «Cargando…» suelto). Esperan 150 ms invisibles: si la carga es rápida, no se ven.
 */

/** Área de contenido: título, una línea y una grilla de tarjetas (dentro del marco, que ya se ve) */
export function CargaContenido({ etiqueta = 'Cargando', tarjetas = 3 }) {
  return (
    <div className="carga-contenido esq-zona-bloque" role="status" aria-label={etiqueta}>
      <Esqueleto className="carga-titulo" />
      <Esqueleto className="carga-subtitulo" />
      <div className="carga-grilla">
        {Array.from({ length: tarjetas }, (_, i) => <EsqueletoTarjeta key={i} className="carga-tarjeta" imagen={i === 0 ? '16 / 9' : null} lineas={i === 0 ? 2 : 4} />)}
      </div>
    </div>
  )
}

/** La app entera mientras se confirma la sesión: barra lateral y contenido (aún no se sabe qué página) */
export function CargaApp() {
  return (
    <div className="carga-app esq-zona-bloque" role="status" aria-label="Cargando RoomMatch">
      <div className="carga-app-barra" aria-hidden="true">
        <Esqueleto className="carga-app-logo" />
        {Array.from({ length: 6 }, (_, i) => <Esqueleto key={i} className="carga-app-item" />)}
      </div>
      <CargaContenido />
    </div>
  )
}

/** Una tarjeta centrada (páginas a pantalla completa: cuestionario, elegir rol, pasos de registro) */
export function CargaTarjeta({ etiqueta = 'Cargando' }) {
  return (
    <div className="carga-centrada esq-zona-bloque" role="status" aria-label={etiqueta}>
      <div className="carga-tarjeta-sola">
        <Esqueleto forma="circulo" ancho={72} alto={72} />
        <Esqueleto className="carga-titulo" />
        <Esqueleto className="carga-subtitulo" />
        <Esqueleto forma="bloque" className="carga-bloque" />
        <Esqueleto className="carga-boton" />
      </div>
    </div>
  )
}

/** La landing mientras se descarga (primera visita): la barra de arriba y el hero con su ilustración */
export function CargaLanding() {
  return (
    <div className="carga-landing esq-zona-bloque" role="status" aria-label="Cargando RoomMatch">
      <div className="carga-landing-barra">
        <Esqueleto className="carga-app-logo" />
        <Esqueleto forma="bloque" className="carga-landing-boton" />
      </div>
      <div className="carga-landing-hero">
        <div className="carga-landing-texto">
          <Esqueleto className="carga-landing-etiqueta" />
          <Esqueleto className="carga-landing-titulo" />
          <Esqueleto className="carga-landing-titulo corto" />
          <Esqueleto className="carga-subtitulo" />
          <Esqueleto className="carga-subtitulo" style={{ width: '70%' }} />
          <div className="carga-landing-botones"><Esqueleto forma="bloque" className="carga-landing-boton" /><Esqueleto forma="bloque" className="carga-landing-boton" /></div>
        </div>
        <Esqueleto forma="bloque" className="carga-landing-ilus" />
      </div>
    </div>
  )
}
