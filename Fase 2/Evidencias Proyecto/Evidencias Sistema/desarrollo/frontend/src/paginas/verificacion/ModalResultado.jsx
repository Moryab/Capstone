import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api.js'
import { lanzarConfeti } from '../../inicio/confeti.js'
import { useSesion } from '../../sesion/SesionContext.jsx'
import { Sello, TEXTOS_ESTADO } from './Sello.jsx'
import './estado.css'
import './verificacion.css'

// Qué ofrecer según el resultado: el botón principal lleva al lugar donde se sigue
const ACCIONES = {
  verificado: { principal: 'Buscar alojamiento', a: '/alojamientos', secundaria: 'Ver mi perfil', b: '/perfil' },
  rechazado: { principal: 'Enviar nuevo comprobante', a: '/perfil/verificacion#formulario', secundaria: 'Más tarde' },
  revocado: { principal: 'Enviar comprobante actualizado', a: '/perfil/verificacion#formulario', secundaria: 'Más tarde' },
  pendiente: { principal: 'Ver mi solicitud', a: '/perfil/verificacion', secundaria: 'Cerrar' },
  no_verificado: { principal: 'Verificar mi cuenta', a: '/perfil/verificacion#formulario', secundaria: 'Más tarde' },
}

/**
 * Se abre al tocar un aviso de verificación (Avisos.jsx), encima de la página en que se esté: el
 * resultado con su sello animado (y un confeti breve si se verificó), el motivo si lo hay y un
 * botón que lleva directo a lo que corresponde. Muestra el estado actual, no solo el del aviso.
 */
export default function ModalResultado({ abierto, alCerrar }) {
  const dialogo = useRef(null)
  const confeti = useRef(null)
  const navegar = useNavigate()
  const { recargarUsuario } = useSesion()
  const [verificacion, setVerificacion] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const d = dialogo.current
    if (abierto && !d.open) d.showModal()
    if (!abierto && d.open) d.close()
    if (!abierto) return
    setVerificacion(null)
    setError('')
    api('/verificacion')
      .then((v) => {
        setVerificacion(v)
        recargarUsuario() // la insignia y lo que se desbloquea quedan al día en toda la app
        if (v.estado === 'verificado') setTimeout(() => lanzarConfeti(confeti.current), 260)
      })
      .catch((err) => setError(err.message))
  }, [abierto, recargarUsuario])

  const estado = verificacion?.estado
  const textos = TEXTOS_ESTADO[estado] ?? TEXTOS_ESTADO.no_verificado
  const acciones = ACCIONES[estado] ?? ACCIONES.no_verificado
  const motivo = estado === 'rechazado' ? verificacion.solicitud?.motivo_rechazo
    : estado === 'revocado' ? verificacion.motivo_revocacion : null
  const ir = (destino) => {
    alCerrar()
    navegar(destino)
  }

  return (
    <dialog ref={dialogo} className="vr-dialogo" aria-labelledby="vr-titulo" data-estado={estado}
      onCancel={(e) => { e.preventDefault(); alCerrar() }}
      onClick={(e) => e.target === dialogo.current && alCerrar()}>
      <div className="vr-contenido">
        <button type="button" className="vr-cerrar" onClick={alCerrar} aria-label="Cerrar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>

        {!verificacion && !error && (
          <div className="vr-cargando" role="status" aria-label="Cargando el resultado">
            <span className="vf-sil-sello" /><span /><span />
          </div>
        )}
        {error && <p className="alerta" role="alert">{error}</p>}

        {verificacion && (
          <>
            <div className="vr-sello">
              <Sello estado={estado} />
              <span ref={confeti} className="vr-confeti" aria-hidden="true" />
            </div>
            <h2 id="vr-titulo">{textos.titulo}</h2>
            <p className="vr-texto">{textos.texto}</p>

            {motivo && (
              <div className="vf-motivo">
                <span>Motivo</span>
                <p>{motivo}</p>
              </div>
            )}
            {estado === 'rechazado' && (
              <ul className="vr-consejos" aria-label="Para que lo aprobemos">
                <li>Que se lea bien, sin cortes ni reflejos</li>
                <li>Que esté vigente este semestre</li>
                <li>Que muestre tu nombre y tu institución, igual que en tu perfil</li>
              </ul>
            )}

            <div className="vr-acciones">
              <button type="button" className="vr-boton primario" onClick={() => ir(acciones.a)}>{acciones.principal}</button>
              <button type="button" className="vr-boton" onClick={() => (acciones.b ? ir(acciones.b) : alCerrar())}>
                {acciones.secundaria}
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  )
}
