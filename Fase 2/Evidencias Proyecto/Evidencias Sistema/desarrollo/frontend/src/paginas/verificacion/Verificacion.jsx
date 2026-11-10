import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api, apiArchivo } from '../../api.js'
import { useAvisoBreve } from '../../componentes/AvisoBreve.jsx'
import { useSesion } from '../../sesion/SesionContext.jsx'
import { COMPROBANTE_MAX_MB, fechaHora, textoSituacion, textoTipo, TIPOS_COMPROBANTE } from './datos.js'
import FormComprobante from './FormComprobante.jsx'
import { Sello, TEXTOS_ESTADO } from './Sello.jsx'
import './estado.css'

// Pasos de una solicitud con comprobante: cuál está hecho, cuál en curso y cuál falta
function pasosDe(verificacion) {
  const { estado, solicitud } = verificacion
  const enviada = Boolean(solicitud)
  const resultado = {
    verificado: { texto: 'Verificada', tono: 'ok' },
    rechazado: { texto: 'Rechazada', tono: 'error' },
    revocado: { texto: 'Revocada', tono: 'error' },
  }[estado]
  return [
    { texto: 'Enviaste tu comprobante', detalle: enviada && fechaHora.format(new Date(solicitud.fecha_solicitud)), estado: enviada ? 'hecho' : 'actual' },
    { texto: 'Revisión del equipo', detalle: estado === 'pendiente' ? 'Suele tardar menos de 2 días hábiles' : null, estado: estado === 'pendiente' ? 'actual' : enviada ? 'hecho' : 'falta' },
    { texto: resultado ? `Resultado: ${resultado.texto.toLowerCase()}` : 'Resultado', estado: resultado ? 'hecho' : 'falta', tono: resultado?.tono },
  ]
}

const ETIQUETA_ESTADO = {
  verificado: 'Cuenta verificada',
  pendiente: 'En revisión',
  rechazado: 'Solicitud rechazada',
  revocado: 'Verificación revocada',
  no_verificado: 'Sin verificar',
}

// Lo que se desbloquea con la cuenta verificada
const DESBLOQUEOS = [
  { a: '/alojamientos', texto: 'Buscar alojamiento', detalle: 'Escríbeles a los oferentes' },
  { a: '/roomies', texto: 'Encontrar roomie', detalle: 'Mira tu compatibilidad' },
  { a: '/propuestas', texto: 'Propuestas de match', detalle: 'Recibe y responde propuestas' },
]

/**
 * HU-21: pestaña «Verificación» de Mi perfil (/perfil/verificacion). A un lado, cómo va (sello, motivo
 * si lo hay y los pasos), sobre un fondo de color; al otro, lo que corresponde hacer: enviar el
 * comprobante o revisar lo enviado. Con #formulario (desde el aviso de rechazo) baja al formulario.
 */
export default function Verificacion() {
  const { usuario, recargarUsuario } = useSesion()
  const { hash } = useLocation()
  const { avisar } = useAvisoBreve()
  const [verificacion, setVerificacion] = useState(null)
  const [instituciones, setInstituciones] = useState(null)
  const [institucionPerfil, setInstitucionPerfil] = useState('')
  const [error, setError] = useState('')
  const [abriendo, setAbriendo] = useState(false)
  const formulario = useRef(null)

  useEffect(() => {
    Promise.all([api('/verificacion'), api('/catalogos/perfil'), api('/perfil')])
      .then(([verificacionApi, catalogo, perfil]) => {
        setVerificacion(verificacionApi)
        setInstituciones(catalogo.instituciones)
        // Se propone la institución del perfil; el estudiante la puede cambiar
        setInstitucionPerfil(perfil.institucion_id ?? '')
      })
      .catch((err) => setError(err.message))
  }, [])

  // Desde el aviso de rechazo o revocación: directo al formulario
  const listo = Boolean(verificacion && instituciones)
  useEffect(() => {
    if (listo && hash === '#formulario' && formulario.current) {
      formulario.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      formulario.current.querySelector('input')?.focus({ preventScroll: true })
    }
  }, [listo, hash])

  const alEnviar = async (respuesta) => {
    setVerificacion(respuesta.verificacion) // el sello cambia y se vuelve a dibujar
    avisar(respuesta.mensaje) // CA-21.2
    window.scrollTo({ top: 0, behavior: 'smooth' })
    await recargarUsuario()
  }

  // CA-21.5: el comprobante no tiene URL pública; se descarga con la sesión y se abre en otra pestaña.
  // La pestaña se abre antes de esperar la descarga para que el navegador no la bloquee
  const verComprobante = async () => {
    const ventana = window.open('', '_blank')
    setAbriendo(true)
    try {
      const blob = await apiArchivo(`/verificacion/solicitudes/${verificacion.solicitud.id}/comprobante`)
      const url = URL.createObjectURL(blob)
      if (ventana) ventana.location.href = url
      else window.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      ventana?.close()
      setError(err.message)
    } finally {
      setAbriendo(false)
    }
  }

  if (!listo) {
    return (
      <div className="vf-pagina">
        <h1 className="visualmente-oculto">Verificación de estudiante</h1>
        {error ? <p className="alerta" role="alert">{error}</p> : (
          <div className="vf-grilla" aria-busy="true" aria-label="Cargando tu verificación">
            <div className="vf-tarjeta vf-silueta"><span className="vf-sil-sello" /><span /><span /><span /></div>
            <div className="vf-tarjeta vf-silueta"><span /><span /><span /><span /></div>
          </div>
        )}
      </div>
    )
  }

  const { estado, solicitud } = verificacion
  const textos = TEXTOS_ESTADO[estado] ?? TEXTOS_ESTADO.no_verificado
  const motivo = estado === 'rechazado' ? solicitud?.motivo_rechazo : estado === 'revocado' ? verificacion.motivo_revocacion : null
  const porCorreo = verificacion.verificado_con_correo
  const conPasos = Boolean(solicitud) && !porCorreo
  const fechaVerificacion = verificacion.fecha_verificacion ?? (estado === 'verificado' ? solicitud?.fecha_revision : null)

  return (
    <div className="vf-pagina">
      <h1 className="visualmente-oculto">Verificación de estudiante</h1>
      {error && <p className="alerta" role="alert">{error}</p>}

      <div className="vf-grilla">
        {/* Cómo va */}
        <section className="vf-tarjeta vf-estado" data-estado={estado} aria-labelledby="vf-titulo-estado">
          <span className="vf-etiqueta" data-estado={estado}>
            <span className="vf-etiqueta-punto" aria-hidden="true" />{ETIQUETA_ESTADO[estado] ?? ETIQUETA_ESTADO.no_verificado}
          </span>
          <Sello estado={estado} />
          <div className="vf-estado-texto">
            <h2 id="vf-titulo-estado">{textos.titulo}</h2>
            <p>
              {porCorreo
                ? <>Te verificamos con tu correo institucional de <strong>{verificacion.institucion_correo}</strong>.</>
                : textos.texto}
            </p>
            {estado === 'verificado' && fechaVerificacion && (
              <p className="vf-fecha">Verificada el {fechaHora.format(new Date(fechaVerificacion))}</p>
            )}
          </div>
          {motivo && (
            <div className="vf-motivo">
              <span>Motivo</span>
              <p>{motivo}</p>
            </div>
          )}
          {conPasos && (
            <div className="vf-pasos-caja">
            <h3>Cómo va tu solicitud</h3>
            <ol className="vf-pasos">
              {pasosDe(verificacion).map((p) => (
                <li key={p.texto} data-estado={p.estado} data-tono={p.tono}>
                  <span className="vf-paso-punto" aria-hidden="true" />
                  <span className="vf-paso-texto">
                    <strong>{p.texto}</strong>
                    {p.detalle && <small>{p.detalle}</small>}
                  </span>
                </li>
              ))}
            </ol>
            </div>
          )}
          {/* Sin pasos que mostrar: lo útil para este caso, en el mismo recuadro (sin huecos) */}
          {!conPasos && porCorreo && (
            <div className="vf-pasos-caja">
              <h3>Tu verificación</h3>
              <dl className="vf-datos">
                <div><dt>Método</dt><dd>Correo institucional</dd></div>
                <div><dt>Institución</dt><dd>{verificacion.institucion_correo}</dd></div>
                <div><dt>Correo</dt><dd>{usuario.correo}</dd></div>
              </dl>
            </div>
          )}
          {!conPasos && !porCorreo && (
            <div className="vf-pasos-caja">
              <h3>Documentos que sirven</h3>
              <ul className="vf-documentos">
                {TIPOS_COMPROBANTE.map((t) => <li key={t.valor}>{t.texto}</li>)}
              </ul>
              <p className="vf-nota">PDF, JPG o PNG de hasta {COMPROBANTE_MAX_MB} MB. Solo tú y los administradores pueden verlo.</p>
            </div>
          )}
        </section>

        {/* Qué hacer */}
        {verificacion.puede_solicitar ? (
          <section ref={formulario} id="formulario" className="vf-tarjeta vf-formulario" aria-labelledby="vf-titulo-form">
            <h2 id="vf-titulo-form">{estado === 'no_verificado' ? 'Envía tu comprobante' : 'Envía un nuevo comprobante'}</h2>
            <p className="vf-ayuda">
              {estado === 'no_verificado'
                ? 'Elige tu situación y adjunta un documento vigente donde se vea tu nombre y tu institución.'
                : 'Asegúrate de que sea legible, esté vigente y coincida con los datos de tu perfil.'}
            </p>
            <FormComprobante instituciones={instituciones} institucionInicial={institucionPerfil} alEnviar={alEnviar}
              correoInstitucional={verificacion.puede_verificar_correo
                ? { correo: usuario.correo, institucion: verificacion.institucion_correo }
                : null} />
          </section>
        ) : (
          <section className="vf-tarjeta vf-detalle" aria-labelledby="vf-titulo-detalle">
            {solicitud && !porCorreo && (
              <>
                <h2 id="vf-titulo-detalle">Tu solicitud</h2>
                <dl className="vf-datos">
                  <div><dt>Situación</dt><dd>{textoSituacion(solicitud.situacion)}</dd></div>
                  <div><dt>Institución</dt><dd>{solicitud.institucion_nombre ?? 'Sin indicar'}</dd></div>
                  <div><dt>Documento</dt><dd>{textoTipo(solicitud.tipo_comprobante)}</dd></div>
                  <div><dt>Enviada el</dt><dd>{fechaHora.format(new Date(solicitud.fecha_solicitud))}</dd></div>
                </dl>
                <button type="button" className="vf-archivo" onClick={verComprobante} disabled={abriendo}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" />
                  </svg>
                  <span><strong>{solicitud.archivo_nombre}</strong><small>{abriendo ? 'Abriendo…' : 'Ver el comprobante que enviaste'}</small></span>
                </button>
              </>
            )}
            {estado === 'verificado' && (
              <div className="vf-desbloqueos">
                <h2 id={solicitud && !porCorreo ? undefined : 'vf-titulo-detalle'}>Ya puedes</h2>
                <ul>
                  {DESBLOQUEOS.map((d) => (
                    <li key={d.a}>
                      <Link to={d.a} className="vf-desbloqueo">
                        <span><strong>{d.texto}</strong><small>{d.detalle}</small></span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
