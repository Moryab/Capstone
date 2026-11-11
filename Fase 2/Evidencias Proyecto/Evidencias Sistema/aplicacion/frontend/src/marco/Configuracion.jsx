import { useEffect, useId, useRef } from 'react'
import { Link } from 'react-router-dom'
import { IconoCampana, IconoCerrar, IconoEditar, IconoEscudo, IconoFlecha, IconoLuna, IconoSol } from '../inicio/iconos.jsx'
import { NOMBRES_ROL, SIN_CAMBIO_CON_CONVIVENCIA, useCambioRol } from '../rol/CambioRol.jsx'
import { IconoBuscador, IconoOferente } from '../rol/iconos.jsx'
import { useSesion } from '../sesion/SesionContext.jsx'

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

// Fila de una opción que todavía no existe
function FilaPronto({ icono, titulo, texto }) {
  return (
    <div className="i-config-fila bloqueada">
      <span className="i-config-icono" aria-hidden="true">{icono}</span>
      <span className="i-config-textos"><strong>{titulo}</strong><span>{texto}</span></span>
      <span className="i-muy-pronto">Muy pronto</span>
    </div>
  )
}

/**
 * Panel de configuración (se abre con la tuerca). Usa <dialog>, que ya maneja el foco y Escape.
 * En escritorio entra desde la derecha; en móvil sube desde abajo.
 */
export default function Configuracion({ abierto, alCerrar, tema, cambiarTema }) {
  const dialogo = useRef(null)
  const idTema = useId()
  const oscuro = tema === 'oscuro'
  const { usuario } = useSesion()
  const { abrir } = useCambioRol()
  const destino = usuario?.modo === 'buscador' ? 'oferente' : 'buscador'
  const IconoRolDestino = destino === 'oferente' ? IconoOferente : IconoBuscador

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
            <p>Haz que RoomMatch se sienta tuyo.</p>
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

        <section className="i-config-seccion" aria-labelledby="i-config-cuenta">
          <h3 id="i-config-cuenta">Cuenta</h3>
          <div className="i-config-grupo">
            <Link to="/perfil/editar" className="i-config-fila">
              <span className="i-config-icono" aria-hidden="true"><IconoEditar /></span>
              <span className="i-config-textos"><strong>Editar mis datos</strong><span>Nombre, estudios y contacto</span></span>
              <span className="i-config-flecha" aria-hidden="true"><IconoFlecha /></span>
            </Link>
            {usuario?.rol === 'estudiante' && usuario.modo && (
              usuario.con_convivencia ? (
                <div className="i-config-fila bloqueada">
                  <span className="i-config-icono" aria-hidden="true"><IconoRolDestino /></span>
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

        <section className="i-config-seccion" aria-labelledby="i-config-alertas">
          <h3 id="i-config-alertas">Alertas y privacidad</h3>
          <div className="i-config-grupo">
            <FilaPronto icono={<IconoCampana />} titulo="Notificaciones" texto="Avisos cuando recibas un match" />
            <FilaPronto icono={<IconoEscudo />} titulo="Privacidad" texto="Quién puede ver tu perfil" />
          </div>
        </section>
      </div>
    </dialog>
  )
}
