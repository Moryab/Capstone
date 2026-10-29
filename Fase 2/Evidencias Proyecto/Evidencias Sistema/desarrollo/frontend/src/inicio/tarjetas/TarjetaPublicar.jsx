import { BotonMagnetico } from '../../landing/componentes.jsx'
import { Ayuda, Tarjeta } from '../comunes.jsx'
import { IconoMas } from '../iconos.jsx'

// Casa con una llave y una etiqueta de precio: «tengo un espacio para ofrecer»
function Ilustracion() {
  return (
    <svg className="i-publicar-ilustracion" viewBox="0 0 260 200" aria-hidden="true">
      <circle cx="130" cy="110" r="86" fill="rgb(63 209 184 / 0.12)" />
      <g className="i-flota">
        <path d="M60 104 L130 48 L200 104" fill="none" stroke="#3fd1b8" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="76" y="100" width="108" height="76" rx="8" fill="#fff" />
        <rect x="116" y="130" width="28" height="46" rx="4" fill="#12766b" />
        <rect x="88" y="114" width="20" height="18" rx="3" fill="#cfece7" />
        <rect x="152" y="114" width="20" height="18" rx="3" fill="#f2c94c" />
      </g>
      <g className="i-flota lenta">
        <rect x="178" y="40" width="70" height="30" rx="15" fill="#f2c94c" />
        <text x="213" y="60" textAnchor="middle" fontFamily="Outfit, sans-serif" fontWeight="700" fontSize="14" fill="#0e2440">$ / mes</text>
      </g>
      <g className="i-flota rapida">
        <circle cx="40" cy="60" r="14" fill="none" stroke="#f2c94c" strokeWidth="5" />
        <path d="M52 66 L84 82 M72 76 l-5 9 M80 80 l-4 8" stroke="#f2c94c" strokeWidth="5" strokeLinecap="round" />
      </g>
    </svg>
  )
}

// Acción principal: publicar un alojamiento
export default function TarjetaPublicar() {
  return (
    <Tarjeta className="i-area-publicar" cuerpo="i-publicar" etiqueta="i-titulo-publicar" oscura>
      <div className="i-publicar-texto">
        <p className="i-etiqueta claro">Ofrece tu espacio <Ayuda claro texto="Publica una habitación o departamento con la misma cuenta que usas para buscar." /></p>
        <h2 id="i-titulo-publicar">¿Tienes una habitación o departamento disponible?</h2>
        <p>Publícalo con fotos, precio, gastos y reglas de convivencia. Quedará visible para los estudiantes que buscan alojamiento.</p>
        <BotonMagnetico to="/publicaciones/nueva" className="l-boton-luz l-boton-grande">
          <IconoMas tamano={18} /> Publicar alojamiento
        </BotonMagnetico>
      </div>
      <Ilustracion />
    </Tarjeta>
  )
}
