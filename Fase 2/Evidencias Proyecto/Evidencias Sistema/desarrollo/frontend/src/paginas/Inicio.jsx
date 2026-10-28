import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import Avatar from '../componentes/Avatar.jsx'
import {
  IconoCheck, IconoFlecha, IconoHogar, IconoLupa, IconoPersona, IconoRoomies, IconoSalir,
} from '../componentes/Iconos.jsx'
import { useFondoCiudad } from '../fondo.js'
import { describirFaltantes } from '../perfil.js'
import { formatearPesos } from '../publicaciones.js'
import { useSesion } from '../sesion/SesionContext.jsx'

const saludoSegunHora = () => {
  const hora = new Date().getHours()
  if (hora < 12) return 'Buenos días'
  if (hora < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

const mayusculaInicial = (texto = '') => texto.charAt(0).toUpperCase() + texto.slice(1)

// Acceso directo. Sin `a` es una función que aún no existe y se marca «Próximamente»
function Acceso({ a, icono, titulo, texto, destacado }) {
  const contenido = (
    <>
      <span className="inicio-acceso-icono" aria-hidden="true">{icono}</span>
      <span className="inicio-acceso-texto">
        <strong>{titulo}</strong>
        <span>{texto}</span>
      </span>
      {a ? (
        <span className="inicio-acceso-flecha" aria-hidden="true"><IconoFlecha /></span>
      ) : (
        <span className="inicio-pronto">Próximamente</span>
      )}
    </>
  )
  const clases = `inicio-acceso${destacado ? ' destacado' : ''}`
  return a ? (
    <Link to={a} className={clases}>{contenido}</Link>
  ) : (
    <div className={`${clases} deshabilitado`} aria-disabled="true">{contenido}</div>
  )
}

// Página de inicio tras iniciar sesión: resumen de la cuenta y accesos a lo que se puede hacer
export default function Inicio() {
  const { usuario, cerrarSesion } = useSesion()
  const [publicaciones, setPublicaciones] = useState(null)
  useFondoCiudad()

  useEffect(() => {
    api('/publicaciones/mias').then(setPublicaciones).catch(() => setPublicaciones([]))
  }, [])

  const nombre = mayusculaInicial(usuario.nombre)
  const activas = publicaciones?.filter((p) => p.estado === 'activa').length ?? 0

  // Primeros pasos. Los que aún no existen en la plataforma se muestran como «Próximamente»
  const pasos = [
    { titulo: 'Crea tu cuenta', hecho: true },
    { titulo: 'Completa tu perfil', hecho: usuario.perfil_completo, a: '/perfil/editar' },
    { titulo: 'Sube tu foto de perfil', hecho: Boolean(usuario.foto_url), a: '/perfil' },
    { titulo: 'Responde el cuestionario de convivencia', pronto: true },
    { titulo: 'Recibe tus propuestas de match', pronto: true },
  ]
  const disponibles = pasos.filter((p) => !p.pronto)
  const hechos = disponibles.filter((p) => p.hecho).length
  const avance = Math.round((hechos / disponibles.length) * 100)

  return (
    <main className="inicio">
      <section className="inicio-hero" aria-labelledby="inicio-titulo">
        <Avatar nombre={usuario.nombre} apellido={usuario.ap_paterno} foto={usuario.foto_url}
          tamano={88} className="inicio-avatar" />
        <div className="inicio-hero-texto">
          <p className="inicio-saludo">{saludoSegunHora()}</p>
          <h1 id="inicio-titulo">Hola, {nombre}</h1>
          <p className="inicio-correo">{usuario.correo}</p>
        </div>
        <div className="inicio-hero-acciones">
          <Link to="/perfil" className="boton claro"><IconoPersona /> Ver mi perfil</Link>
          <button type="button" className="boton fantasma" onClick={cerrarSesion}>
            <IconoSalir /> Cerrar sesión
          </button>
        </div>
      </section>

      {/* CA-03.5: mientras falte algo, se recuerda qué falta */}
      {!usuario.perfil_completo && (
        <div className="inicio-aviso" role="status">
          <div>
            <strong>Tu perfil está incompleto</strong>
            <p>
              Complétalo para poder buscar alojamiento y roomie.
              {usuario.campos_faltantes.length > 0 && (
                <> Falta: {describirFaltantes(usuario.campos_faltantes)}.</>
              )}
            </p>
          </div>
          <Link to="/perfil/editar" className="boton">Completar perfil</Link>
        </div>
      )}

      <div className="inicio-cuerpo">
        <section className="inicio-panel" aria-labelledby="titulo-acciones">
          <h2 id="titulo-acciones">¿Qué quieres hacer hoy?</h2>
          <div className="inicio-accesos">
            <Acceso a="/publicaciones/nueva" icono={<IconoHogar />} titulo="Publicar alojamiento" destacado
              texto="Ofrece una habitación o departamento a otros estudiantes." />
            <Acceso a="/perfil" icono={<IconoPersona />} titulo="Mi perfil"
              texto="Revisa cómo te ven los demás y administra tus publicaciones." />
            <Acceso icono={<IconoLupa />} titulo="Buscar alojamiento"
              texto="Filtra por precio, comuna y cercanía a tu sede." />
            <Acceso icono={<IconoRoomies />} titulo="Encontrar roomie"
              texto="Te propondremos estudiantes compatibles con tus hábitos." />
          </div>
        </section>

        <aside className="inicio-lateral">
          <section className="inicio-panel" aria-labelledby="titulo-pasos">
            <div className="inicio-panel-encabezado">
              <h2 id="titulo-pasos">Tus primeros pasos</h2>
              <span className="inicio-avance-texto">{hechos} de {disponibles.length}</span>
            </div>
            <div className="inicio-barra" role="progressbar" aria-valuenow={avance} aria-valuemin={0}
              aria-valuemax={100} aria-label="Avance de los primeros pasos">
              <span style={{ width: `${avance}%` }} />
            </div>
            <ol className="inicio-pasos">
              {pasos.map((paso) => (
                <li key={paso.titulo} className={paso.hecho ? 'hecho' : paso.pronto ? 'pronto' : undefined}>
                  <span className="inicio-paso-marca" aria-hidden="true">{paso.hecho && <IconoCheck />}</span>
                  {paso.a && !paso.hecho ? <Link to={paso.a}>{paso.titulo}</Link> : <span>{paso.titulo}</span>}
                  {paso.hecho && <span className="visualmente-oculto"> (listo)</span>}
                  {paso.pronto && <span className="inicio-pronto">Próximamente</span>}
                </li>
              ))}
            </ol>
          </section>

          <section className="inicio-panel" aria-labelledby="titulo-mis-pubs">
            <div className="inicio-panel-encabezado">
              <h2 id="titulo-mis-pubs">Tus publicaciones</h2>
              {publicaciones?.length > 0 && <Link to="/perfil" className="inicio-enlace">Ver todas</Link>}
            </div>
            {publicaciones === null && <p className="sin-dato">Cargando…</p>}
            {publicaciones?.length === 0 && (
              <p className="inicio-vacio">
                Aún no publicas alojamientos. <Link to="/publicaciones/nueva">Publicar el primero</Link>
              </p>
            )}
            {publicaciones?.length > 0 && (
              <>
                <dl className="inicio-cifras">
                  <div><dt>Publicadas</dt><dd>{publicaciones.length}</dd></div>
                  <div><dt>Activas</dt><dd>{activas}</dd></div>
                </dl>
                <ul className="inicio-mini-pubs">
                  {publicaciones.slice(0, 2).map((p) => (
                    <li key={p.id}>
                      <Link to={`/alojamientos/${p.id}`}>{p.titulo}</Link>
                      <span>{p.ubicacion.comuna_nombre} · {formatearPesos(p.costo_mensual)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </aside>
      </div>
    </main>
  )
}
