import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { mayuscula } from './datos.js'
import { IconoLapiz } from './iconos.jsx'

const MAXIMO = 300 // mismo límite que valida el backend (CA-03.1)

/**
 * «Sobre mí». En el propio perfil se edita en línea (lápiz → texto → Guardar/Cancelar) con
 * PUT /api/perfil/descripcion; la pestaña «Editar perfil» sigue funcionando igual.
 */
export default function SobreMi({ perfil, alGuardar }) {
  const propio = perfil.es_propio
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(perfil.descripcion ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const area = useRef(null)

  useEffect(() => {
    if (editando) area.current?.focus()
  }, [editando])

  const abrir = () => {
    setTexto(perfil.descripcion ?? '')
    setError('')
    setEditando(true)
  }

  const guardar = async () => {
    setGuardando(true)
    setError('')
    try {
      const { perfil: nuevo } = await api('/perfil/descripcion', { metodo: 'PUT', datos: { descripcion: texto } })
      alGuardar?.(nuevo.descripcion ?? null)
      setEditando(false)
    } catch (err) {
      setError(err.errores?.descripcion ?? err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="p2-tarjeta p2-sobre p2-anima" aria-labelledby="p2-titulo-sobre">
      <div className="p2-tarjeta-cabecera">
        <h2 id="p2-titulo-sobre">Sobre {propio ? 'mí' : mayuscula(perfil.nombre)}</h2>
        {propio && !editando && (
          <button type="button" className="p2-boton-texto" onClick={abrir}>
            <IconoLapiz /> {perfil.descripcion ? 'Editar' : 'Agregar'}
          </button>
        )}
      </div>

      {editando ? (
        <div className="p2-sobre-edicion">
          <label htmlFor="p2-descripcion" className="visualmente-oculto">Descripción</label>
          <textarea id="p2-descripcion" ref={area} value={texto} maxLength={MAXIMO} rows={4}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setEditando(false)}
            placeholder="Cuéntales a tus posibles roomies cómo eres, qué estudias y qué buscas." />
          <div className="p2-sobre-pie">
            <span className="p2-contador" aria-live="polite">{texto.length}/{MAXIMO}</span>
            <button type="button" className="boton secundario" onClick={() => setEditando(false)} disabled={guardando}>Cancelar</button>
            <button type="button" className="boton" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
          </div>
          {error && <p className="alerta" role="alert">{error}</p>}
        </div>
      ) : perfil.descripcion ? (
        <blockquote className="p2-cita"><p>{perfil.descripcion}</p></blockquote>
      ) : (
        <p className="p2-vacio">
          {propio
            ? 'Aún no escribes nada. Cuéntales a tus posibles roomies cómo eres, qué estudias y qué buscas.'
            : 'Este estudiante aún no agrega una descripción.'}
        </p>
      )}
    </section>
  )
}
