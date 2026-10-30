import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { IconoCamara } from '../componentes/Iconos.jsx'
import Completitud from '../perfil/Completitud.jsx'
import DatosClave from '../perfil/DatosClave.jsx'
import { TarjetaContacto } from '../perfil/EstadoMatch.jsx'
import Habitos from '../perfil/Habitos.jsx'
import { IconoOjo } from '../perfil/iconos.jsx'
import PaginaPerfil from '../perfil/PaginaPerfil.jsx'
import Publicaciones from '../perfil/Publicaciones.jsx'
import SobreMi from '../perfil/SobreMi.jsx'
import { marcarTransicionPerfil } from '../perfil/transicion.js'
import { CargandoPerfil } from './LayoutPerfil.jsx'
import { FOTO_MAX_MB, FOTO_TIPOS } from '../perfil.js'
import { useSesion } from '../sesion/SesionContext.jsx'

// Pestaña «Ver perfil»: el propio perfil, con la foto editable, «Sobre mí» en línea y el avance
export default function MiPerfil() {
  const { usuario, recargarUsuario } = useSesion()
  const [perfil, setPerfil] = useState(null)
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
  const [subiendo, setSubiendo] = useState(false)
  const [importancia, setImportancia] = useState(null)
  const selectorFoto = useRef(null)

  useEffect(() => {
    api(`/usuarios/${usuario.id}/perfil`)
      .then(setPerfil)
      .catch((err) => setMensaje({ tipo: 'alerta', texto: err.message }))
    // La importancia de cada hábito (no solo los imprescindibles) se ve en las fichas
    api('/cuestionario').then((c) => setImportancia(c.importancia)).catch(() => {})
  }, [usuario.id])

  const guardarFoto = async (pedir, textoExito) => {
    setSubiendo(true)
    setMensaje({ tipo: '', texto: '' })
    try {
      const respuesta = await pedir()
      setPerfil((actual) => ({ ...actual, foto_url: respuesta.foto_url ?? null }))
      setMensaje({ tipo: 'exito', texto: textoExito })
      await recargarUsuario()
    } catch (err) {
      setMensaje({ tipo: 'alerta', texto: err.errores?.foto ?? err.message })
    } finally {
      setSubiendo(false)
    }
  }

  const cambiarFoto = async (e) => {
    const archivo = e.target.files[0]
    e.target.value = '' // permite volver a elegir el mismo archivo
    if (!archivo) return

    // Se revisa antes de subir para avisar al tiro; el backend vuelve a validar
    if (!FOTO_TIPOS.includes(archivo.type)) {
      setMensaje({ tipo: 'alerta', texto: 'La foto debe ser una imagen JPG, PNG o WebP' })
      return
    }
    if (archivo.size > FOTO_MAX_MB * 1024 * 1024) {
      setMensaje({ tipo: 'alerta', texto: `La foto debe pesar como máximo ${FOTO_MAX_MB} MB` })
      return
    }

    const formulario = new FormData()
    formulario.append('foto', archivo)
    await guardarFoto(() => api('/perfil/foto', { metodo: 'POST', datos: formulario }), 'Tu foto de perfil se actualizó.')
  }

  const quitarFoto = () =>
    guardarFoto(() => api('/perfil/foto', { metodo: 'DELETE' }), 'Quitaste tu foto de perfil.')

  if (!perfil) {
    return <CargandoPerfil texto={mensaje.texto} />
  }

  const controlesFoto = (
    <>
      <button type="button" className="avatar-boton" onClick={() => selectorFoto.current.click()}
        disabled={subiendo} aria-label={perfil.foto_url ? 'Cambiar foto de perfil' : 'Subir foto de perfil'}
        title={perfil.foto_url ? 'Cambiar foto' : 'Subir foto'}>
        <IconoCamara />
      </button>
      <input ref={selectorFoto} type="file" accept={FOTO_TIPOS.join(',')} onChange={cambiarFoto} hidden />
      {subiendo && <span className="avatar-cargando" role="status">Guardando…</span>}
    </>
  )

  // Editar el perfil se hace desde la pestaña de arriba; aquí: ver la vista pública y quitar la foto
  const acciones = (
    <>
      {/* Vista previa como la ve otro estudiante, con transición animada (View Transitions) */}
      <Link to="/perfil-publico" viewTransition onClick={marcarTransicionPerfil} className="boton secundario"><IconoOjo /> Ver como me ven</Link>
      {perfil.foto_url && (
        <button type="button" className="boton secundario" onClick={quitarFoto} disabled={subiendo}>
          Quitar foto
        </button>
      )}
    </>
  )

  const aviso = mensaje.texto && (
    <p className={`p2-aviso ${mensaje.tipo}`} role={mensaje.tipo === 'alerta' ? 'alert' : 'status'}>{mensaje.texto}</p>
  )

  return (
    <PaginaPerfil perfil={perfil} modo="propio" sobreAvatar={controlesFoto} acciones={acciones} aviso={aviso}
      principal={(
        <>
          <SobreMi perfil={perfil} alGuardar={(descripcion) => { setPerfil((p) => ({ ...p, descripcion })); recargarUsuario() }} />
          <Habitos perfil={perfil} importancia={importancia} />
          <Publicaciones />
        </>
      )}
      lateral={(
        <>
          {/* CA-03.5: lo que falta, con el siguiente paso sugerido */}
          <Completitud perfil={perfil} camposFaltantes={usuario.campos_faltantes} alSubirFoto={() => selectorFoto.current.click()} />
          <TarjetaContacto perfil={perfil} />
          <DatosClave perfil={perfil} />
        </>
      )} />
  )
}
