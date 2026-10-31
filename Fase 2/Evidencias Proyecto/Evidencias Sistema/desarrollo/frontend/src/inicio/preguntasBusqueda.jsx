import { Link } from 'react-router-dom'
import { formatearPesos } from '../publicaciones.js'

// Preguntas de «¿Qué estás buscando?»: las usan la tarjeta «Busca tu lugar» del inicio y la
// elección de rol después del cuestionario. Guardan en usuarios.preferencias_busqueda

export const PRESUPUESTOS = [150000, 200000, 250000, 300000, 400000]

const Trazo = ({ children }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
    strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)
export const ICONOS_BUSQUEDA = {
  costo: <Trazo><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></Trazo>,
  comuna: <Trazo><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></Trazo>,
  tipo: <Trazo><path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18h18M7 10V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3" /></Trazo>,
  sede: <Trazo><path d="M4 21V10l8-6 8 6v11" /><path d="M9 21v-6h6v6" /></Trazo>,
  regla: <Trazo><path d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7z" /></Trazo>,
  extra: <Trazo><path d="M5 12l4 4L19 6" /></Trazo>,
}

// Una opción con forma de chip: es un radio o una casilla de verdad, oculta, con su etiqueta visible
export function Opcion({ tipo = 'radio', nombre, marcada, alCambiar, icono, children }) {
  return (
    <label className="i-opcion">
      <input type={tipo} name={nombre} className="visualmente-oculto" checked={marcada} onChange={alCambiar} />
      <span>{icono}{children}</span>
    </label>
  )
}

// Lo que se pregunta. El resto de las preferencias (reglas, mínimo) se conserva igual al guardar
export const borradorDe = (p) => ({
  costo_max: p?.costo_max ?? null,
  comunas_ids: p?.comunas_ids ?? [],
  cerca_institucion: Boolean(p?.cerca_institucion),
  tipo_alojamiento: p?.tipo_alojamiento ?? null,
  gastos_incluidos: Boolean(p?.gastos_incluidos),
  amoblado: Boolean(p?.amoblado),
  estacionamiento: Boolean(p?.estacionamiento),
})

export function PreguntaPresupuesto({ borrador, cambiar, nombre = 'buscar-presupuesto' }) {
  const montos = borrador.costo_max != null && !PRESUPUESTOS.includes(borrador.costo_max)
    ? [...PRESUPUESTOS, borrador.costo_max].sort((a, b) => a - b)
    : PRESUPUESTOS
  return (
    <fieldset>
      <legend>¿Cuánto puedes pagar al mes?</legend>
      <div className="i-opciones">
        {montos.map((monto) => (
          <Opcion key={monto} nombre={nombre} marcada={borrador.costo_max === monto}
            alCambiar={() => cambiar({ costo_max: monto })}>
            Hasta {formatearPesos(monto)}
          </Opcion>
        ))}
        <Opcion nombre={nombre} marcada={borrador.costo_max == null} alCambiar={() => cambiar({ costo_max: null })}>
          Me da lo mismo
        </Opcion>
      </div>
    </fieldset>
  )
}

export function PreguntaUbicacion({ borrador, cambiar, comunas, institucion }) {
  const alternarComuna = (id) => {
    const elegidas = borrador.comunas_ids.includes(id)
      ? borrador.comunas_ids.filter((c) => c !== id)
      : [...borrador.comunas_ids, id]
    // «Cerca de tu sede» y las comunas son dos formas de decir dónde: se usa una u otra
    cambiar({ comunas_ids: elegidas, cerca_institucion: false })
  }
  return (
    <fieldset>
      <legend>¿Dónde te gustaría vivir?</legend>
      <div className="i-opciones">
        {institucion && (
          <Opcion tipo="checkbox" marcada={borrador.cerca_institucion} icono={ICONOS_BUSQUEDA.sede}
            alCambiar={(e) => cambiar({ cerca_institucion: e.target.checked, comunas_ids: [] })}>
            Cerca de tu sede ({[institucion.sigla, institucion.sede].filter(Boolean).join(' · ')})
          </Opcion>
        )}
        {comunas.map((c) => (
          <Opcion key={c.id} tipo="checkbox" marcada={borrador.comunas_ids.includes(c.id)}
            alCambiar={() => alternarComuna(c.id)}>
            {c.nombre}
          </Opcion>
        ))}
      </div>
      {!institucion && (
        <p className="i-preguntas-nota">
          ¿Quieres vivir cerca de donde estudias? <Link to="/perfil/editar">Agrega tu institución y sede</Link>.
        </p>
      )}
    </fieldset>
  )
}
