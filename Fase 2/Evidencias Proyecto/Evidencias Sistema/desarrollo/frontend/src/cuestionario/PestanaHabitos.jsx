import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../api.js'
import { CargandoPerfil } from '../paginas/LayoutPerfil.jsx'
import { useSesion } from '../sesion/SesionContext.jsx'
import { aEstado } from './datos.js'
import Fondo from './Fondo.jsx'
import Flujo from './Flujo.jsx'
import Resumen from './Resumen.jsx'
import './cuestionario.css'

/**
 * Pestaña «Hábitos» del perfil (CA-13.5): el resumen de convivencia y, al editar una respuesta,
 * la misma pregunta del cuestionario a pantalla completa. Al guardar se recalcula la compatibilidad.
 */
export default function PestanaHabitos() {
  const { recargarUsuario } = useSesion()
  const [estado, setEstado] = useState(null)
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
  const [editando, setEditando] = useState(null)
  const [claveFondo, setClaveFondo] = useState(null)

  useEffect(() => {
    api('/cuestionario').then((c) => setEstado(aEstado(c))).catch((err) => setMensaje({ tipo: 'alerta', texto: err.message }))
  }, [])

  // Mientras se edita, la página de atrás no se desplaza
  useEffect(() => {
    if (editando === null) return undefined
    document.body.classList.add('c-sin-scroll')
    return () => document.body.classList.remove('c-sin-scroll')
  }, [editando])

  const guardar = useCallback(async (nuevo) => {
    try {
      await api('/cuestionario', { metodo: 'PUT', datos: { ...nuevo.respuestas, importancia: nuevo.importancia } })
      setEstado(nuevo)
      setEditando(null)
      setMensaje({ tipo: 'exito', texto: 'Se guardó tu cambio. Tu compatibilidad ya se actualizó.' })
      await recargarUsuario()
    } catch (err) {
      setMensaje({ tipo: 'alerta', texto: err.errores ? Object.values(err.errores)[0] : err.message })
      setEditando(null)
    }
  }, [recargarUsuario])

  if (!estado) return <CargandoPerfil texto={mensaje.texto} />

  return (
    <main className="tarjeta pagina-perfil c-pestana">
      {mensaje.texto && (
        <p className={mensaje.tipo} role={mensaje.tipo === 'alerta' ? 'alert' : 'status'}>{mensaje.texto}</p>
      )}
      <Resumen estado={estado} alEditar={(i) => { setMensaje({ tipo: '', texto: '' }); setEditando(i) }}
        bajada="Así ven tus hábitos los demás estudiantes. Con esto se calcula tu compatibilidad." />

      {/* Va directo en <body>: la animación de las pestañas del perfil usa transform y
          encerraría a esta capa fija dentro de la tarjeta */}
      {editando !== null && createPortal(
        <div className="c-capa" role="dialog" aria-modal="true" aria-label="Editar respuesta">
          <Fondo clave={claveFondo} />
          <Flujo key={editando} estadoInicial={estado} indiceInicial={editando} modo="una"
            alTerminar={guardar} alSalir={() => setEditando(null)} alCambiarIndice={setClaveFondo}
            textoTerminar="Guardar cambio" />
        </div>,
        document.body,
      )}
    </main>
  )
}
