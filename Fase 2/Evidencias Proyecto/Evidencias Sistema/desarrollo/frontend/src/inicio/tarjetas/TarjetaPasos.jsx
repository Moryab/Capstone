import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api.js'
import { describirFaltantes, FOTO_MAX_MB, FOTO_TIPOS } from '../../perfil.js'
import { useSesion } from '../../sesion/SesionContext.jsx'
import { Ayuda, Tarjeta } from '../comunes.jsx'
import { lanzarConfeti } from '../confeti.js'
import { IconoCamara, IconoCandado, IconoCheck } from '../iconos.jsx'
import { guardarLocal, leerLocal } from '../utilidades.js'

const PROXIMOS = ['Cuestionario de convivencia', 'Propuestas de match']

// Anillo de avance. Parte vacío y se llena al aparecer (con «reducir movimiento» ya está lleno)
function Anillo({ hechos, total }) {
  const [lleno, setLleno] = useState(false)
  useEffect(() => {
    const t = requestAnimationFrame(() => setLleno(true))
    return () => cancelAnimationFrame(t)
  }, [])
  const avance = (hechos / total) * 100

  return (
    <div className="i-anillo" role="img" aria-label={`${hechos} de ${total} pasos completados`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="50" className="i-anillo-fondo" />
        <circle cx="60" cy="60" r="50" className="i-anillo-avance" pathLength="100"
          style={{ strokeDashoffset: lleno ? 100 - avance : 100 }} />
      </svg>
      <span className="i-anillo-texto" aria-hidden="true"><strong>{hechos}</strong> de {total}</span>
    </div>
  )
}

// Zona para subir la foto sin salir del inicio: se arrastra la imagen o se elige el archivo
function SubirFoto() {
  const { recargarUsuario } = useSesion()
  const [arrastrando, setArrastrando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')

  const subir = async (archivo) => {
    if (!archivo) return
    setError('')
    if (!FOTO_TIPOS.includes(archivo.type)) {
      setError('La foto debe ser una imagen JPG, PNG o WebP')
      return
    }
    if (archivo.size > FOTO_MAX_MB * 1024 * 1024) {
      setError(`La foto debe pesar como máximo ${FOTO_MAX_MB} MB`)
      return
    }
    const formulario = new FormData()
    formulario.append('foto', archivo)
    setSubiendo(true)
    try {
      await api('/perfil/foto', { metodo: 'POST', datos: formulario })
      await recargarUsuario() // al cambiar la sesión, el paso se marca y se celebra
    } catch (err) {
      setError(err.errores?.foto ?? err.message)
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <>
      <label className={`i-soltar${arrastrando ? ' activo' : ''}${subiendo ? ' ocupado' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastrando(false); subir(e.dataTransfer.files[0]) }}>
        <input type="file" accept={FOTO_TIPOS.join(',')} className="visualmente-oculto" disabled={subiendo}
          onChange={(e) => { subir(e.target.files[0]); e.target.value = '' }} />
        <span className="i-soltar-icono" aria-hidden="true"><IconoCamara /></span>
        <span className="i-soltar-texto">
          <strong>{subiendo ? 'Subiendo tu foto…' : 'Arrastra tu foto aquí'}</strong>
          <span>o haz clic para elegirla · JPG, PNG o WebP, hasta {FOTO_MAX_MB} MB</span>
        </span>
      </label>
      {error && <p className="i-error" role="alert">{error}</p>}
    </>
  )
}

// Primeros pasos: anillo de avance, checklist y el siguiente paso resuelto ahí mismo
export default function TarjetaPasos() {
  const { usuario } = useSesion()
  const confeti = useRef(null)
  const [celebrado, setCelebrado] = useState(null)

  const pasos = [
    { clave: 'cuenta', titulo: 'Crea tu cuenta', hecho: true },
    { clave: 'perfil', titulo: 'Completa tu perfil', hecho: usuario.perfil_completo },
    { clave: 'foto', titulo: 'Sube tu foto de perfil', hecho: Boolean(usuario.foto_url) },
  ]
  const hechos = pasos.filter((p) => p.hecho).length
  const siguiente = pasos.find((p) => !p.hecho)
  const estado = Object.fromEntries(pasos.map((p) => [p.clave, p.hecho]))
  const firma = JSON.stringify(estado)

  // Se celebra un paso cuando pasa de pendiente a listo respecto de la última visita
  // (o recién, al subir la foto aquí). La primera vez solo se guarda el estado
  useEffect(() => {
    const clave = `rm_pasos_${usuario.id}`
    const anterior = leerLocal(clave, null)
    guardarLocal(clave, JSON.parse(firma))
    if (!anterior) return undefined
    const nuevo = Object.entries(JSON.parse(firma)).find(([paso, hecho]) => hecho && anterior[paso] === false)
    if (!nuevo) return undefined
    const t = setTimeout(() => {
      setCelebrado(nuevo[0])
      lanzarConfeti(confeti.current)
    }, 700)
    return () => clearTimeout(t)
  }, [firma, usuario.id])

  return (
    <Tarjeta className="i-area-pasos" cuerpo="i-pasos" etiqueta="i-titulo-pasos">
      <div className="i-tarjeta-encabezado">
        <h2 id="i-titulo-pasos">Tus primeros pasos</h2>
        <Ayuda texto="Completa estos pasos para que otros estudiantes confíen en tu perfil. Se marcan solos cuando los terminas." />
      </div>

      <div className="i-pasos-resumen">
        <div className="i-anillo-zona">
          <Anillo hechos={hechos} total={pasos.length} />
          <span ref={confeti} className="i-confeti-origen" aria-hidden="true" />
        </div>
        <ol className="i-checklist">
          {pasos.map((p) => (
            <li key={p.clave} className={`${p.hecho ? 'hecho' : ''}${celebrado === p.clave ? ' celebrado' : ''}${siguiente === p ? ' siguiente' : ''}`}>
              <span className="i-check" aria-hidden="true">{p.hecho && <IconoCheck />}</span>
              <span>{p.titulo}</span>
              <span className="visualmente-oculto">{p.hecho ? ' (listo)' : ' (pendiente)'}</span>
            </li>
          ))}
          {PROXIMOS.map((titulo) => (
            <li key={titulo} className="pronto">
              <span className="i-check" aria-hidden="true"><IconoCandado tamano={11} /></span>
              <span>{titulo}</span>
              <span className="i-muy-pronto">Muy pronto</span>
            </li>
          ))}
        </ol>
      </div>

      {/* El siguiente paso pendiente, destacado y accionable */}
      <div className="i-siguiente" aria-live="polite">
        {siguiente?.clave === 'perfil' && (
          <>
            <p className="i-siguiente-titulo">Siguiente paso: completa tu perfil</p>
            {usuario.campos_faltantes.length > 0 && (
              <p className="i-siguiente-texto">Falta: {describirFaltantes(usuario.campos_faltantes)}.</p>
            )}
            <Link to="/perfil/editar" className="l-boton">Completar perfil</Link>
          </>
        )}
        {siguiente?.clave === 'foto' && (
          <>
            <p className="i-siguiente-titulo">Siguiente paso: sube tu foto de perfil</p>
            <SubirFoto />
          </>
        )}
        {!siguiente && (
          <p className="i-siguiente-listo">
            <span className="i-check grande" aria-hidden="true"><IconoCheck tamano={16} /></span>
            Completaste todos los pasos disponibles por ahora. Los siguientes se habilitarán más adelante.
          </p>
        )}
      </div>
    </Tarjeta>
  )
}
