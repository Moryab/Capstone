import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { FOTO_MAX_MB, FOTO_TIPOS_PUBLICACION, MAX_FOTOS, nombreFoto } from '../publicaciones.js'

// Fotos del alojamiento (CA-05.4: hasta 5, JPG o PNG, máximo 5 MB cada una).
// - Al editar (hay publicacionId) cada cambio se guarda al tiro en la API; `fotos` son { url, es_principal }.
// - Al publicar aún no existe la publicación: se guardan los archivos ({ archivo, vista }) y el
//   formulario los sube después de crearla. La primera de la lista queda como principal.
export default function FotosPublicacion({ publicacionId, fotos, onCambio }) {
  const enApi = Boolean(publicacionId)
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

  // Las vistas previas locales ocupan memoria hasta que se liberan al salir del formulario
  const vistas = useRef([])
  useEffect(() => {
    vistas.current = fotos.map((f) => f.vista).filter(Boolean)
  }, [fotos])
  useEffect(() => () => vistas.current.forEach((v) => URL.revokeObjectURL(v)), [])

  const agregar = async (e) => {
    const archivos = [...e.target.files]
    e.target.value = '' // permite volver a elegir el mismo archivo
    setError('')

    if (fotos.length + archivos.length > MAX_FOTOS) {
      setError(`Puedes subir como máximo ${MAX_FOTOS} fotos.`)
      return
    }
    const invalida = archivos.find(
      (a) => !FOTO_TIPOS_PUBLICACION.includes(a.type) || a.size > FOTO_MAX_MB * 1024 * 1024,
    )
    if (invalida) {
      setError(`«${invalida.name}» no sirve: las fotos deben ser JPG o PNG de máximo ${FOTO_MAX_MB} MB.`)
      return
    }

    if (!enApi) {
      onCambio([...fotos, ...archivos.map((archivo) => ({ archivo, vista: URL.createObjectURL(archivo) }))])
      return
    }

    setOcupado(true)
    let actuales = fotos
    try {
      for (const archivo of archivos) {
        const formulario = new FormData()
        formulario.append('foto', archivo)
        const { foto } = await api(`/publicaciones/${publicacionId}/fotos`, { metodo: 'POST', datos: formulario })
        actuales = [...actuales, foto]
        onCambio(actuales)
      }
    } catch (err) {
      setError(err.errores?.fotos ?? err.message)
    } finally {
      setOcupado(false)
    }
  }

  const quitar = async (indice) => {
    setError('')
    const quitada = fotos[indice]
    const restantes = fotos.filter((_, i) => i !== indice)
    if (!enApi) {
      URL.revokeObjectURL(quitada.vista)
      onCambio(restantes)
      return
    }
    setOcupado(true)
    try {
      await api(`/publicaciones/${publicacionId}/fotos/${nombreFoto(quitada.url)}`, { metodo: 'DELETE' })
      // Igual que la API: si se quitó la principal, pasa a serlo la primera que queda
      if (quitada.es_principal && restantes.length) restantes[0] = { ...restantes[0], es_principal: true }
      onCambio(restantes)
    } catch (err) {
      setError(err.message)
    } finally {
      setOcupado(false)
    }
  }

  const hacerPrincipal = async (indice) => {
    setError('')
    const elegida = fotos[indice]
    const resto = fotos.filter((_, i) => i !== indice)
    if (!enApi) {
      onCambio([elegida, ...resto])
      return
    }
    setOcupado(true)
    try {
      await api(`/publicaciones/${publicacionId}/fotos/${nombreFoto(elegida.url)}/principal`, { metodo: 'PUT' })
      onCambio([{ ...elegida, es_principal: true }, ...resto.map((f) => ({ ...f, es_principal: false }))])
    } catch (err) {
      setError(err.message)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="fotos-publicacion" aria-busy={ocupado}>
      {fotos.length > 0 && (
        <ul className="fotos-lista">
          {fotos.map((foto, i) => {
            const principal = enApi ? foto.es_principal : i === 0
            return (
              <li key={foto.url ?? foto.vista} className={principal ? 'principal' : undefined}>
                <img src={foto.url ?? foto.vista} alt={`Foto ${i + 1} del alojamiento`} />
                {principal && <span className="foto-etiqueta">Principal</span>}
                <div className="foto-acciones">
                  {!principal && (
                    <button type="button" onClick={() => hacerPrincipal(i)} disabled={ocupado}>
                      Hacer principal
                    </button>
                  )}
                  <button type="button" onClick={() => quitar(i)} disabled={ocupado}
                    aria-label={`Quitar la foto ${i + 1}`}>
                    Quitar
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {fotos.length < MAX_FOTOS && (
        <>
          <input id="fotos-entrada" type="file" accept="image/jpeg,image/png" multiple
            onChange={agregar} disabled={ocupado} className="visualmente-oculto"
            aria-describedby="fotos-ayuda" />
          <label htmlFor="fotos-entrada" className={`boton secundario${ocupado ? ' deshabilitado' : ''}`}>
            {ocupado ? 'Subiendo…' : 'Agregar fotos'}
          </label>
        </>
      )}
      <p className="campo-ayuda" id="fotos-ayuda">
        Hasta {MAX_FOTOS} fotos JPG o PNG de máximo {FOTO_MAX_MB} MB cada una ({fotos.length}/{MAX_FOTOS}).
        La foto principal es la que se ve en los listados.
      </p>
      {error && <p className="campo-error" role="alert">{error}</p>}
    </div>
  )
}
