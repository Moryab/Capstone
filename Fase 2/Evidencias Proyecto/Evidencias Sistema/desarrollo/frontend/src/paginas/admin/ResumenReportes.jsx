import { textoMotivo } from '../../reportes.js'
import { EstadoVacio, ICONOS_ESTADO } from './ui/componentes.jsx'
import { useCifraAnimada } from './ui/animaciones.js'

/*
 * Resumen de la página «Reportes»: a la izquierda los estados (que también filtran), a la derecha el
 * total con la barra perfiles / publicaciones, y abajo los tres motivos más reportados de cada tipo.
 * Colores por entidad, siempre los mismos (perfil = azul, publicación = magenta), validados para
 * daltonismo en claro y oscuro; el texto va en colores de texto y cada color lleva su etiqueta.
 */

const numero = new Intl.NumberFormat('es-CL')
const porcentaje = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })
const ESTADOS = [
  { valor: 'pendiente', texto: 'Pendientes', ayuda: 'Esperan que alguien los tome', icono: ICONOS_ESTADO.reloj, clave: 'pendientes' },
  { valor: 'en_revision', texto: 'En revisión', ayuda: 'Un administrador los está viendo', icono: ICONOS_ESTADO.lupa, clave: 'en_revision' },
  { valor: 'resuelto', texto: 'Resueltos', ayuda: 'Ya tienen una decisión', icono: ICONOS_ESTADO.check, clave: 'resueltos_total' },
]
export const TIPOS_RESUMEN = [
  { valor: 'usuario', texto: 'Perfiles', singular: 'perfiles' },
  { valor: 'publicacion', texto: 'Publicaciones', singular: 'publicaciones' },
]

// Cifra que cuenta hasta su valor (y entre valores al cambiar de pestaña), con ancho fijo
function Cifra({ valor, className }) {
  const ref = useCifraAnimada(valor ?? null, (n) => numero.format(Math.round(n)))
  return <span ref={ref} className={className}>{valor == null ? '0' : numero.format(valor)}</span>
}

/**
 * Barra dividida: cada tipo ocupa su parte del total. Se dibuja con clip-path (sin cambiar el
 * diseño), así pasa suave de un reparto a otro. Con una pestaña elegida, el otro tipo queda gris.
 */
function Division({ porTipo, tipo }) {
  const total = (porTipo?.usuario ?? 0) + (porTipo?.publicacion ?? 0)
  const parte = total ? porTipo.usuario / total : 0.5
  return (
    <div className="r-division" data-vacia={!total || undefined} data-tipo={tipo || undefined} aria-hidden="true"
      style={{ '--parte': parte }}>
      <span className="r-division-tramo" data-tipo="usuario" />
      <span className="r-division-tramo" data-tipo="publicacion" />
    </div>
  )
}

const HORAS_AVISO = 18 // un pendiente sin tomar por más de esto merece atención

// «18 horas», «2 días»
const textoEspera = (horas) => (horas < 48 ? `${horas} horas` : `${Math.floor(horas / 24)} días`)

/** Cuántas horas lleva esperando el pendiente más antiguo, si pasa del aviso; si no, null */
function horasDeEspera(fecha) {
  if (!fecha) return null
  const horas = Math.floor((Date.now() - new Date(fecha).getTime()) / 36e5)
  return horas >= HORAS_AVISO ? horas : null
}

export function ResumenReportes({ r, tipo }) {
  const cargando = !r
  const porTipo = r?.por_tipo
  const totalGeneral = porTipo ? porTipo.usuario + porTipo.publicacion : 0
  const tipoActual = TIPOS_RESUMEN.find((t) => t.valor === tipo)
  // Solo en «Todos», donde se ven los dos tipos
  const espera = !tipo ? horasDeEspera(r?.pendiente_mas_antiguo) : null

  return (
    <section className="r-resumen" data-animar="tarjeta" data-cargando={cargando || undefined} aria-label="Resumen de los reportes">
      {/* Contadores por estado (para filtrar las tablas está el selector de más abajo) */}
      <div className="r-estados">
        <p className="r-rotulo">Por estado</p>
        {ESTADOS.map((e) => (
          <div key={e.valor} className="r-estado" data-estado={e.valor}>
            <span className="r-estado-icono" aria-hidden="true">{e.icono}</span>
            <span className="r-estado-texto">
              <strong>{e.texto}</strong>
              <small>{e.ayuda}</small>
            </span>
            <Cifra valor={r?.[e.clave] ?? (e.clave === 'resueltos_total' ? r?.resueltos : undefined)} className="r-estado-cifra" />
          </div>
        ))}
      </div>

      <div className="r-total">
        <p className="r-rotulo">{tipoActual ? `Reportes de ${tipoActual.singular}` : 'Reportes recibidos'}</p>
        <p className="r-total-cifra">
          <Cifra valor={r?.total} />
          <span>{r?.total === 1 ? 'reporte' : 'reportes'} en total</span>
        </p>
        <Division porTipo={porTipo} tipo={tipo} />
        <ul className="r-leyenda">
          {TIPOS_RESUMEN.map((t) => {
            const n = porTipo?.[t.valor] ?? 0
            const atenuado = tipo && tipo !== t.valor
            return (
              <li key={t.valor} data-tipo={t.valor} data-atenuado={atenuado || undefined}>
                <span className="r-muestra" aria-hidden="true" />
                <span className="r-leyenda-texto">{t.texto}</span>
                <Cifra valor={porTipo ? n : null} className="r-leyenda-cifra" />
                <span className="r-leyenda-pct">{totalGeneral ? `${porcentaje.format((100 * n) / totalGeneral)} %` : '—'}</span>
              </li>
            )
          })}
        </ul>
        {tipoActual && totalGeneral > 0 && (
          <p className="r-nota">{numero.format(porTipo[tipo])} de {numero.format(totalGeneral)} reportes son de {tipoActual.singular}.</p>
        )}
        {espera && (
          <p className="r-aviso-espera" role="status">
            <span aria-hidden="true">{ICONOS_ESTADO.reloj}</span>
            El reporte más antiguo sin tomar lleva {textoEspera(espera)} esperando.
          </p>
        )}
      </div>
    </section>
  )
}

const ICONO_TIPO = {
  usuario: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="8" r="3.8" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></svg>,
  publicacion: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 11l8-6.5 8 6.5V20H4z" /><path d="M10 20v-5h4v5" /></svg>,
}

/** Los tres motivos más reportados de cada tipo; con una pestaña elegida, solo los de ese tipo */
export function MotivosReportes({ r, tipo }) {
  // Con la API anterior (sin `motivos`) no se muestra, en vez de romper la página
  if (r && !r.motivos) return null
  const tipos = TIPOS_RESUMEN.filter((t) => !tipo || t.valor === tipo)
  return (
    <div className="r-motivos" data-uno={tipo ? '' : undefined}>
      {tipos.map((t) => {
        const filas = r ? r.motivos[t.valor] ?? [] : null
        const maximo = Math.max(1, ...(filas ?? []).map((f) => f.cantidad))
        const total = r?.por_tipo?.[t.valor] ?? 0
        return (
          <section key={t.valor} className="r-motivos-tarjeta" data-tipo={t.valor} data-animar="tarjeta"
            data-cargando={!r || undefined} aria-labelledby={`motivos-${t.valor}`}>
            <h2 id={`motivos-${t.valor}`} className="r-motivos-titulo">
              <span className="a-icono-tipo" data-tipo={t.valor}>{ICONO_TIPO[t.valor]}</span>
              <span>Motivos más reportados <small>· {t.singular}</small></span>
            </h2>
            {!r && (
              <ol className="r-motivos-lista" aria-hidden="true">
                {[0, 1, 2].map((i) => <li key={i} className="r-motivo-silueta"><span /><span /></li>)}
              </ol>
            )}
            {filas?.length === 0 && (
              <EstadoVacio compacto ilustracion="aldia" titulo={`Sin reportes de ${t.singular}`}
                texto="Cuando alguien reporte, verás aquí los motivos más frecuentes." />
            )}
            {filas?.length > 0 && (
              <ol className="r-motivos-lista">
                {filas.map((f, i) => (
                  <li key={f.motivo} className="r-motivo">
                    <span className="r-motivo-puesto" aria-hidden="true">{i + 1}</span>
                    <span className="r-motivo-nombre">{textoMotivo(f.motivo)}</span>
                    <span className="r-motivo-valor">
                      {numero.format(f.cantidad)}
                      <small>{total ? ` · ${porcentaje.format((100 * f.cantidad) / total)} %` : ''}</small>
                    </span>
                    <span className="r-motivo-barra" aria-hidden="true"><span style={{ '--avance': f.cantidad / maximo }} /></span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )
      })}
    </div>
  )
}
