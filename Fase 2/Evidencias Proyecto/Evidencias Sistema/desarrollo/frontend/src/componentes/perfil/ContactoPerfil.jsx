const Icono = ({ children }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
)
const Telefono = () => <Icono><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></Icono>
const Mensaje = () => <Icono><path d="M21 12a8.5 8.5 0 0 1-12.5 7.5L3 21l1.5-5.5A8.5 8.5 0 1 1 21 12z" /></Icono>
const Candado = () => <Icono><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Icono>

// +56912345678 → +56 9 1234 5678
const formatear = (telefono) => {
  const m = /^\+56(\d)(\d{4})(\d{4})$/.exec(telefono ?? '')
  return m ? `+56 ${m[1]} ${m[2]} ${m[3]}` : telefono
}

/**
 * Contacto del perfil. El teléfono solo llega desde la API cuando hay un match confirmado entre
 * ambos o es el propio perfil; si no, se explica cuándo se mostrará.
 */
export default function ContactoPerfil({ perfil }) {
  const propio = perfil.es_propio
  const visible = perfil.contacto_visible && perfil.telefono
  const numero = perfil.telefono?.replace(/\D/g, '')

  return (
    <section className="perfil-seccion pv-seccion pv-contacto pv-anima" aria-labelledby="pv-titulo-contacto">
      <h2 id="pv-titulo-contacto"><Telefono /> Contacto</h2>
      {visible ? (
        <>
          <p className="pv-telefono">{formatear(perfil.telefono)}</p>
          {propio ? (
            <p className="pv-nota">Solo lo ven tus matches confirmados.</p>
          ) : (
            <div className="pv-contacto-acciones">
              <a href={`tel:+${numero}`} className="boton"><Telefono /> Llamar</a>
              <a href={`https://wa.me/${numero}`} className="boton secundario" target="_blank" rel="noreferrer">
                <Mensaje /> WhatsApp
              </a>
            </div>
          )}
        </>
      ) : (
        <p className="pv-bloqueado">
          <span className="pv-bloqueado-icono"><Candado /></span>
          {propio
            ? 'Agrega tu teléfono en «Editar perfil»: es la forma en que tus matches te contactan.'
            : `El teléfono de ${perfil.nombre} se muestra cuando ambos acepten el match.`}
        </p>
      )}
    </section>
  )
}
