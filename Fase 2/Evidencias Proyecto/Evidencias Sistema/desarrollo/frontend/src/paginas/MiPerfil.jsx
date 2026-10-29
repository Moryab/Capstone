import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { IconoCamara } from '../componentes/Iconos.jsx'
import PublicacionesPerfil from '../componentes/PublicacionesPerfil.jsx'
import VistaPerfil from '../componentes/VistaPerfil.jsx'
import { CargandoPerfil } from './LayoutPerfil.jsx'
import { describirFaltantes, FOTO_MAX_MB, FOTO_TIPOS } from '../perfil.js'
import { useSesion } from '../sesion/SesionContext.jsx'

// Pestaña «Ver perfil»: el propio perfil tal como lo ven los demás, con la foto editable
export default function MiPerfil() {
  const { usuario, recargarUsuario } = useSesion()
  const [perfil, setPerfil] = useState(null)
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
  const [subiendo, setSubiendo] = useState(false)
  const selectorFoto = useRef(null)

  useEffect(() => {
    api(`/usuarios/${usuario.id}/perfil`)
      .then(setPerfil)
      .catch((err) => setMensaje({ tipo: 'alerta', texto: err.message }))
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

  // Editar el perfil se hace desde la pestaña de arriba; aquí solo queda quitar la foto, si hay
  const acciones = perfil.foto_url && (
    <button type="button" className="boton secundario" onClick={quitarFoto} disabled={subiendo}>
      Quitar foto
    </button>
  )

  const aviso = (
    <div className="perfil-avisos">
      {!perfil.perfil_completo && usuario.campos_faltantes.length > 0 && (
        <p className="alerta">
          Tu perfil está incompleto. Falta: {describirFaltantes(usuario.campos_faltantes)}.{' '}
          <Link to="/perfil/editar">Completar ahora</Link>
        </p>
      )}
      {['no_verificado', 'rechazado', 'revocado'].includes(usuario.verificacion_estado) && (
        <p className="info">
          Tu perfil aún no está verificado como estudiante.{' '}
          <Link to="/verificacion">Verificar mi condición de estudiante</Link>
        </p>
      )}
      {mensaje.texto && (
        <p className={mensaje.tipo} role={mensaje.tipo === 'alerta' ? 'alert' : 'status'}>{mensaje.texto}</p>
      )}
    </div>
  )

  return (
    <VistaPerfil perfil={perfil} sobreAvatar={controlesFoto} acciones={acciones} aviso={aviso}>
      <PublicacionesPerfil />
    </VistaPerfil>
  )
}
