import { useEffect, useId, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  IconoBandera, IconoCampana, IconoCerrar, IconoEditar, IconoEscudo, IconoFlecha, IconoLuna, IconoMatch, IconoSol,
  IconoUsuario, IconoVerificado,
} from '../inicio/iconos.jsx'
import { NOMBRES_ROL, SIN_CAMBIO_CON_CONVIVENCIA, useCambioRol } from '../rol/CambioRol.jsx'
import { IconoBuscador, IconoOferente } from '../rol/iconos.jsx'
import { useSesion } from '../sesion/SesionContext.jsx'
import { estaVerificado } from '../sesion/verificacion.js'

// Interruptor del tema: de día un sol con nube, de noche una luna con estrellas
function Interruptor({ oscuro, alCambiar, etiqueta }) {
  return (
    <button type="button" role="switch" aria-checked={oscuro} aria-labelledby={etiqueta}
      className="i-interruptor" onClick={(e) => {
        const caja = e.currentTarget.getBoundingClientRect()
        alCambiar({ x: caja.left + caja.width / 2, y: caja.top + caja.height / 2 })
      }}>
      <span className="i-interruptor-estrellas" aria-hidden="true"><span /><span /><span /></span>
      <span className="i-interruptor-nube" aria-hidden="true" />
      <span className="i-interruptor-perilla" aria-hidden="true" />
    </button>
  )
}

// Interruptor simple (sí / no) para las preferencias de avisos del administrador
function FilaInterruptor({ icono, titulo, texto, activo, alCambiar, tono }) {
  const id = useId()
  return (
    <div className="i-config-fila" data-tono={tono}>
      <span className="i-config-icono" aria-hidden="true">{icono}</span>
      <span className="i-config-textos"><strong id={id}>{titulo}</strong><span>{texto}</span></span>
      <button type="button" role="switch" aria-checked={activo} aria-labelledby={id} className="i-switch"
        onClick={() => alCambiar(!activo)}>
        <span aria-hidden="true" />
      </button>
    </div>
  )
}

// Fila que lleva a otra página (y cierra el panel)
function FilaEnlace({ a, icono, titulo, texto, alCerrar }) {
  return (
    <Link to={a} className="i-config-fila" onClick={alCerrar}>
      <span className="i-config-icono" aria-hidden="true">{icono}</span>
      <span className="i-config-textos"><strong>{titulo}</strong><span>{texto}</span></span>
      <span className="i-config-flecha" aria-hidden="true"><IconoFlecha /></span>
    </Link>
  )
}

/**
 * Panel de configuración (se abre con la tuerca). Usa <dialog>, que ya maneja el foco y Escape.
 * En escritorio entra desde la derecha; en móvil sube desde abajo. Muestra solo lo que le sirve a cada
 * uno: el estudiante, su cuenta, su rol y cómo lo ven los demás; el administrador, la apariencia y qué
 * avisos de moderación quiere en su campana (no tiene perfil de estudiante que editar).
 */
export default function Configuracion({ abierto, alCerrar, tema, cambiarTema, preferenciasAvisos, cambiarPreferenciasAvisos }) {
  const dialogo = useRef(null)
  const idTema = useId()
  const oscuro = tema === 'oscuro'
  const { usuario } = useSesion()
  const { abrir } = useCambioRol()
  const destino = usuario?.modo === 'buscador' ? 'oferente' : 'buscador'
  const IconoRolDestino = destino === 'oferente' ? IconoOferente : IconoBuscador
  const estudiante = usuario?.rol === 'estudiante'

  useEffect(() => {
    const d = dialogo.current
    if (abierto && !d.open) d.showModal()
    if (!abierto && d.open) d.close()
  }, [abierto])

  return (
    // Un clic en el fondo oscuro (fuera del contenido) también cierra
    <dialog ref={dialogo} className="i-config" aria-labelledby="i-titulo-config" onClose={alCerrar}
      onClick={(e) => e.target === dialogo.current && alCerrar()}>
      <div className="i-config-contenido">
        <div className="i-config-barra">
          <div className="i-config-titulo">
            <h2 id="i-titulo-config">Configuración</h2>
            <p>{estudiante ? 'Haz que RoomMatch se sienta tuyo.' : 'Cómo se ve el panel y qué te avisa.'}</p>
          </div>
          <button type="button" className="i-cerrar" onClick={alCerrar} aria-label="Cerrar configuración">
            <IconoCerrar />
          </button>
        </div>

        <section className="i-config-seccion" aria-labelledby="i-config-apariencia">
          <h3 id="i-config-apariencia">Apariencia</h3>
          <div className="i-config-grupo">
            <div className="i-config-fila">
              <span className="i-config-icono" aria-hidden="true">{oscuro ? <IconoLuna /> : <IconoSol />}</span>
              <span className="i-config-textos">
                <strong id={idTema}>{oscuro ? 'Modo oscuro' : 'Modo claro'}</strong>
                <span>{oscuro ? 'Más cómodo para la vista de noche' : 'Toca para pasar al modo oscuro'}</span>
              </span>
              <Interruptor oscuro={oscuro} etiqueta={idTema}
                alCambiar={(origen) => cambiarTema(oscuro ? 'claro' : 'oscuro', origen)} />
            </div>
          </div>
        </section>

        {/* Administrador: qué muestra la campana. Se guarda en este navegador */}
        {!estudiante && preferenciasAvisos && (
          <section className="i-config-seccion" aria-labelledby="i-config-avisos">
            <h3 id="i-config-avisos">Avisos de moderación</h3>
            <div className="i-config-grupo">
              <FilaInterruptor icono={<IconoBandera />} tono="reporte" titulo="Reportes"
                texto="Perfiles y publicaciones reportados que esperan revisión" activo={preferenciasAvisos.reportes}
                alCambiar={(v) => cambiarPreferenciasAvisos({ ...preferenciasAvisos, reportes: v })} />
              <FilaInterruptor icono={<IconoVerificado />} tono="verificacion" titulo="Solicitudes de verificación"
                texto="Comprobantes de estudiante por aprobar o rechazar" activo={preferenciasAvisos.verificaciones}
                alCambiar={(v) => cambiarPreferenciasAvisos({ ...preferenciasAvisos, verificaciones: v })} />
              <FilaInterruptor icono={<IconoCampana />} tono="atrasado" titulo="Destacar los atrasados"
                texto="Lo que lleva más de 2 días esperando va primero" activo={preferenciasAvisos.atrasados}
                alCambiar={(v) => cambiarPreferenciasAvisos({ ...preferenciasAvisos, atrasados: v })} />
            </div>
            <p className="i-config-nota">
              <IconoEscudo /> Solo cambia lo que ves en la campana. Los contadores de la barra lateral siempre muestran todo lo pendiente.
            </p>
          </section>
        )}

        {estudiante && (
          <section className="i-config-seccion" aria-labelledby="i-config-cuenta">
            <h3 id="i-config-cuenta">Cuenta</h3>
            <div className="i-config-grupo">
              <FilaEnlace a="/perfil/editar" icono={<IconoEditar />} titulo="Editar mis datos"
                texto="Nombre, estudios y contacto" alCerrar={alCerrar} />
              <FilaEnlace a="/perfil/verificacion" icono={<IconoVerificado />} titulo="Verificación de estudiante"
                texto={estaVerificado(usuario) ? 'Tu cuenta está verificada' : 'Revisa el estado o sube tu comprobante'}
                alCerrar={alCerrar} />
              {usuario.modo && (
                usuario.con_convivencia ? (
                  // Con una convivencia en curso el rol no se cambia: se informa, sin botón
                  <div className="i-config-fila">
                    <span className="i-config-icono" aria-hidden="true">{usuario.modo === 'oferente' ? <IconoOferente /> : <IconoBuscador />}</span>
                    <span className="i-config-textos">
                      <strong>Tu rol: {NOMBRES_ROL[usuario.modo]}</strong>
                      <span>{SIN_CAMBIO_CON_CONVIVENCIA}.</span>
                    </span>
                  </div>
                ) : (
                  <button type="button" className="i-config-fila" aria-haspopup="dialog"
                    onClick={() => { alCerrar(); abrir(destino) }}>
                    <span className="i-config-icono" aria-hidden="true"><IconoRolDestino /></span>
                    <span className="i-config-textos">
                      <strong>Cambiar a {destino}</strong>
                      <span>Tu rol hoy: {NOMBRES_ROL[usuario.modo]}</span>
                    </span>
                    <span className="i-config-flecha" aria-hidden="true"><IconoFlecha /></span>
                  </button>
                )
              )}
            </div>
          </section>
        )}

        {estudiante && (
          <section className="i-config-seccion" aria-labelledby="i-config-privacidad">
            <h3 id="i-config-privacidad">Convivencia y privacidad</h3>
            <div className="i-config-grupo">
              <FilaEnlace a="/perfil/cuestionario" icono={<IconoMatch />} titulo="Mis hábitos de convivencia"
                texto="Lo que usamos para calcular tu compatibilidad" alCerrar={alCerrar} />
              <FilaEnlace a="/perfil-publico" icono={<IconoUsuario />} titulo="Cómo te ven los demás"
                texto="Tu perfil tal como lo ven otros estudiantes" alCerrar={alCerrar} />
            </div>
            <p className="i-config-nota">
              <IconoEscudo /> Tu correo, RUT y fecha de nacimiento nunca se muestran a otros estudiantes.
            </p>
          </section>
        )}
      </div>
    </dialog>
  )
}
