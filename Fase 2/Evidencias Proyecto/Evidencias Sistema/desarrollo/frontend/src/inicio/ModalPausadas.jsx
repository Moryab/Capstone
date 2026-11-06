import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { formatearPesos } from '../publicaciones.js'
import './pausadas.css'

/**
 * Se abre solo al volver a ser oferente (CambioRol.jsx → Inicio) y desde «Revisar ahora» en la
 * tarjeta del inicio. Pregunta por cada publicación pausada, de a una, si sigue disponible:
 * publicarla de nuevo, editarla antes (se publica al guardar) o eliminarla.
 * Si lo cierra, las que no respondió siguen pausadas y la tarjeta del inicio las recuerda.
 */

// Tiempo para ver el check (y el confeti) antes de pasar a la siguiente
const PAUSA_PUBLICADA = 1500
const PAUSA_ELIMINADA = 1000

// Confeti: 18 piezas en abanico hacia arriba. Valores fijos (no aleatorios) para que cada render
// sea igual; solo se anima transform y opacity
const COLORES = ['#3fd1b8', '#f2c94c', '#12766b', '#ff8a7a', '#8fb8ff']
const CONFETI = Array.from({ length: 18 }, (_, i) => {
  const angulo = (-160 + (i * 140) / 17) * (Math.PI / 180) // de -160° a -20°: hacia arriba
  const distancia = 70 + ((i * 37) % 50)
  return {
    x: Math.round(Math.cos(angulo) * distancia),
    y: Math.round(Math.sin(angulo) * distancia),
    giro: ((i * 73) % 360) - 180,
    color: COLORES[i % COLORES.length],
    retraso: (i % 4) * 25,
    forma: i % 3, // tira, cuadrado o círculo
  }
})

function Confeti() {
  return (
    <span className="p-confeti" aria-hidden="true">
      {CONFETI.map((p, i) => (
        <span key={i} className={`p-pieza forma-${p.forma}`} style={{
          '--x': `${p.x}px`, '--y': `${p.y}px`, '--giro': `${p.giro}deg`,
          '--color': p.color, '--retraso': `${p.retraso}ms`,
        }} />
      ))}
    </span>
  )
}

// Check que se dibuja: primero el círculo, después el visto
function CheckAnimado({ grande = false }) {
  return (
    <svg className={`p-check${grande ? ' grande' : ''}`} viewBox="0 0 56 56" aria-hidden="true">
      <circle className="p-check-circulo" cx="28" cy="28" r="25" />
      <path className="p-check-visto" d="M17 29l7.5 7.5L39.5 21" />
    </svg>
  )
}

// Casa con un distintivo de pausa: «tu espacio está en espera»
function IlustracionPausa() {
  return (
    <svg className="p-ilustracion" viewBox="0 0 120 96" aria-hidden="true">
      <circle cx="60" cy="52" r="42" fill="rgb(63 209 184 / 0.14)" />
      <path d="M26 50 L60 22 L94 50" fill="none" stroke="#3fd1b8" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="34" y="48" width="52" height="38" rx="5" fill="#fff" />
      <rect x="54" y="62" width="13" height="24" rx="3" fill="#12766b" />
      <rect x="40" y="55" width="10" height="9" rx="2" fill="#cfece7" />
      <rect x="71" y="55" width="10" height="9" rx="2" fill="#cfece7" />
      <g className="p-ilustracion-pausa">
        <circle cx="92" cy="28" r="15" fill="#f2c94c" />
        <rect x="86.5" y="21" width="4" height="14" rx="1.5" fill="#0e2440" />
        <rect x="93.5" y="21" width="4" height="14" rx="1.5" fill="#0e2440" />
      </g>
    </svg>
  )
}

function FichaPublicacion({ pub, etapa, enviando, error, onPublicar, onPreguntarBorrar, onBorrar, onVolver, onEditar, tituloRef }) {
  const principal = pub.fotos.find((f) => f.es_principal)
  return (
    <article className="p-ficha" data-etapa={etapa} aria-labelledby={`p-ficha-${pub.id}`}>
      <div className="p-ficha-foto">
        {principal
          ? <img src={principal.url} alt="" />
          : (
            <svg viewBox="0 0 64 48" aria-hidden="true">
              <path d="M10 26 L32 9 L54 26" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="16" y="24" width="32" height="20" rx="3" fill="currentColor" opacity="0.35" />
            </svg>
          )}
        <span className="p-ficha-estado">{etapa === 'publicada' ? 'Activa' : etapa === 'eliminada' ? 'Eliminada' : 'Pausada'}</span>
      </div>

      <div className="p-ficha-info">
        <h3 id={`p-ficha-${pub.id}`} ref={tituloRef} tabIndex={-1}>{pub.titulo}</h3>
        <ul className="p-ficha-datos" aria-label="Datos de la publicación">
          <li>{pub.ubicacion.comuna_nombre}</li>
          <li><strong>{formatearPesos(pub.costo_mensual)}</strong> / mes</li>
          <li>{pub.cupos_disponibles === 1 ? '1 cupo' : `${pub.cupos_disponibles} cupos`}</li>
        </ul>
      </div>

      {/* Las tres etapas ocupan la misma zona, así el modal no salta de alto */}
      <div className="p-ficha-zona">
        {etapa === 'pregunta' && (
          <div className="p-acciones">
            <button type="button" className="r-boton grande p-si" disabled={enviando} onClick={onPublicar}>
              {enviando ? 'Publicando…' : 'Sí, sigue disponible'}
            </button>
            <div className="p-acciones-fila">
              <Link to={`/publicaciones/${pub.id}/editar`} className="r-boton secundario" onClick={onEditar}>
                Editar antes de publicar
              </Link>
              <button type="button" className="r-boton-texto p-no" disabled={enviando} onClick={onPreguntarBorrar}>
                Ya no la tengo
              </button>
            </div>
          </div>
        )}

        {etapa === 'borrar' && (
          <div className="p-borrar" role="group" aria-labelledby={`p-borrar-${pub.id}`}>
            <p id={`p-borrar-${pub.id}`}><strong>¿Eliminar «{pub.titulo}»?</strong> Ya no podrás recuperarla.</p>
            <div className="p-acciones-fila">
              <button type="button" className="r-boton p-peligro" disabled={enviando} onClick={onBorrar}>
                {enviando ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
              <button type="button" className="r-boton-texto" disabled={enviando} onClick={onVolver}>Volver</button>
            </div>
          </div>
        )}

        {etapa === 'publicada' && (
          <div className="p-exito">
            <span className="p-exito-icono"><CheckAnimado /><Confeti /></span>
            <div>
              <p className="p-exito-titulo">¡Publicada de nuevo!</p>
              <p className="p-exito-texto">
                {pub.cupos_disponibles > 0
                  ? 'Ya la ven quienes buscan alojamiento.'
                  : 'Quedó como completa porque no tiene cupos libres.'}
              </p>
            </div>
          </div>
        )}

        {etapa === 'eliminada' && (
          <div className="p-exito eliminada">
            <span className="p-exito-icono"><CheckAnimado /></span>
            <div>
              <p className="p-exito-titulo">Eliminada</p>
              <p className="p-exito-texto">Ya no aparecerá en tus publicaciones.</p>
            </div>
          </div>
        )}
      </div>

      {error && <p className="p-error" role="alert">{error}</p>}
    </article>
  )
}

export default function ModalPausadas({ publicaciones, alCambiar, alCerrar }) {
  const dialogo = useRef(null)
  const tituloFicha = useRef(null)
  const botonFinal = useRef(null)
  // Copia fija de lo que había al abrir: la lista del inicio se recarga en cada respuesta
  const [lista] = useState(publicaciones)
  const [indice, setIndice] = useState(0)
  const [etapa, setEtapa] = useState('pregunta')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [resumen, setResumen] = useState({ publicadas: 0, eliminadas: 0 })
  const [anuncio, setAnuncio] = useState('')

  const terminado = indice >= lista.length
  const pub = lista[indice]

  useEffect(() => {
    const d = dialogo.current
    if (!d.open) d.showModal()
  }, [])

  // Después de ver el check, pasa a la siguiente (o al cierre)
  useEffect(() => {
    if (etapa !== 'publicada' && etapa !== 'eliminada') return undefined
    const t = setTimeout(() => {
      setIndice((i) => i + 1)
      setEtapa('pregunta')
    }, etapa === 'publicada' ? PAUSA_PUBLICADA : PAUSA_ELIMINADA)
    return () => clearTimeout(t)
  }, [etapa])

  // El foco sigue a la pregunta nueva, o al botón final
  useEffect(() => {
    if (etapa !== 'pregunta') return
    if (terminado) botonFinal.current?.focus()
    else if (indice > 0) tituloFicha.current?.focus()
  }, [indice, etapa, terminado])

  const responder = async (ruta, metodo, siguiente) => {
    setEnviando(true)
    setError('')
    try {
      await api(ruta, { metodo })
      setEtapa(siguiente)
      setResumen((r) => siguiente === 'publicada'
        ? { ...r, publicadas: r.publicadas + 1 }
        : { ...r, eliminadas: r.eliminadas + 1 })
      setAnuncio(siguiente === 'publicada' ? `«${pub.titulo}» se publicó de nuevo` : `«${pub.titulo}» se eliminó`)
      alCambiar()
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  const ocupado = enviando || etapa === 'publicada' || etapa === 'eliminada'
  const restantes = lista.length - indice

  return (
    <dialog ref={dialogo} className="p-modal" aria-labelledby="p-titulo" aria-describedby="p-texto"
      onClose={alCerrar}
      onCancel={(e) => ocupado && e.preventDefault()}
      onClick={(e) => e.target === dialogo.current && !ocupado && dialogo.current.close()}>
      <div className="p-contenido">
        <header className={`p-cabecera${terminado ? ' final' : ''}`}>
          {terminado ? (
            <span className="p-final-icono"><CheckAnimado grande />{resumen.publicadas > 0 && <Confeti />}</span>
          ) : (
            <IlustracionPausa />
          )}
          <div className="p-cabecera-texto">
            <p className="p-etiqueta">{terminado ? 'Todo al día' : 'De vuelta como oferente'}</p>
            <h2 id="p-titulo">
              {terminado
                ? '¡Listo! Tus espacios están al día'
                : lista.length === 1 ? '¿Sigue disponible tu espacio?' : '¿Siguen disponibles tus espacios?'}
            </h2>
            <p id="p-texto">
              {terminado
                ? 'Las publicaciones activas ya pueden recibir propuestas de estudiantes compatibles.'
                : 'Los pausaste mientras buscabas alojamiento. Confirma antes de volver a mostrarlos: así nadie postula a un espacio que ya no tienes.'}
            </p>
          </div>
          {!terminado && lista.length > 1 && (
            <ol className="p-progreso" aria-label={`Espacio ${indice + 1} de ${lista.length}`}>
              {lista.map((p, i) => (
                <li key={p.id} data-estado={i < indice ? 'hecho' : i === indice ? 'actual' : 'pendiente'} />
              ))}
            </ol>
          )}
        </header>

        <div className="p-cuerpo">
          {!terminado && (
            <FichaPublicacion key={pub.id} pub={pub} etapa={etapa} enviando={enviando} error={error}
              tituloRef={tituloFicha}
              onPublicar={() => responder(`/publicaciones/${pub.id}/reactivar`, 'POST', 'publicada')}
              onPreguntarBorrar={() => setEtapa('borrar')}
              onBorrar={() => responder(`/publicaciones/${pub.id}`, 'DELETE', 'eliminada')}
              onVolver={() => setEtapa('pregunta')}
              onEditar={alCerrar} />
          )}

          {terminado && (
            <div className="p-final">
              <ul className="p-final-resumen">
                {resumen.publicadas > 0 && (
                  <li className="publicadas">{resumen.publicadas === 1 ? '1 publicada' : `${resumen.publicadas} publicadas`}</li>
                )}
                {resumen.eliminadas > 0 && (
                  <li>{resumen.eliminadas === 1 ? '1 eliminada' : `${resumen.eliminadas} eliminadas`}</li>
                )}
              </ul>
              <button ref={botonFinal} type="button" className="r-boton grande" onClick={() => dialogo.current.close()}>
                Ir a mi inicio
              </button>
            </div>
          )}

          {!terminado && (
            <p className="p-despues">
              <button type="button" className="r-boton-texto" disabled={ocupado} onClick={() => dialogo.current.close()}>
                Decidir después
              </button>
              <span>
                {restantes === 1 ? 'Quedará pausada' : `Las ${restantes} quedarán pausadas`} y te la{restantes === 1 ? '' : 's'} recordaremos en el inicio.
              </span>
            </p>
          )}
        </div>
      </div>
      <p className="visualmente-oculto" role="status">{anuncio}</p>
    </dialog>
  )
}
