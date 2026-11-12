import Campo from '../componentes/Campo.jsx'
import SelectorCarrera from '../componentes/SelectorCarrera.jsx'
import SelectorComuna, { cambiosDeRegion } from '../componentes/SelectorComuna.jsx'
import { ANIO_INGRESO_MAX, ANIO_INGRESO_MIN, errorAnioIngreso, sinSignos } from '../perfil.js'
import { IlustracionPaso } from './ilustraciones.jsx'

const TEXTOS = {
  estudios: {
    titulo: '¿Dónde estudias?',
    ayuda: 'Con tu sede te mostramos alojamientos y roomies cerca de donde estudias.',
  },
  origen: {
    titulo: '¿De dónde eres?',
    ayuda: 'Tu ciudad y región aparecen en tu perfil. Tu dirección no se muestra a nadie: solo se ven tu ciudad y región.',
  },
}

/**
 * Pasos 1 y 2 del cuestionario de bienvenida: completan los datos obligatorios del perfil
 * (CA-03.5) para no tener que llenar aparte un formulario largo.
 */
export default function PasoPerfil({ tipo, perfil, errores, catalogo, alCambiar, tituloRef, idTitulo }) {
  const { titulo, ayuda } = TEXTOS[tipo]
  const cambiar = (e) => alCambiar(e.target.name, e.target.value)

  const institucion = catalogo?.instituciones.find((i) => i.id === perfil.institucion_id)
  const opcionesInstitucion = (catalogo?.instituciones ?? []).map((i) => ({ valor: i.id, texto: `${i.nombre} (${i.sigla})` }))
  const opcionesRegion = (catalogo?.regiones ?? []).map((r) => ({ valor: r, texto: r }))
  const opcionesSede = (institucion?.sedes ?? []).map((s) => ({ valor: s, texto: s }))

  return (
    <div className="c-paso-perfil" role="group" aria-labelledby={idTitulo}>
      <p className="c-categoria">{tipo === 'estudios' ? 'Tus estudios' : 'De dónde eres'}</p>
      <h1 id={idTitulo} ref={tituloRef} tabIndex={-1} className="c-titulo">{titulo}</h1>
      <p className="c-ayuda">{ayuda}</p>

      <div className="c-formulario">
        <span className="c-formulario-ilustracion"><IlustracionPaso tipo={tipo} /></span>
        <div className="c-formulario-campos">
          {tipo === 'estudios' ? (
            <>
              <Campo etiqueta="Institución" nombre="institucion_id" id="c-institucion" value={perfil.institucion_id}
                onChange={cambiar} error={errores.institucion_id} opciones={opcionesInstitucion} required />
              <div className="c-fila">
                <Campo etiqueta="Sede" nombre="sede" id="c-sede" value={perfil.sede} onChange={cambiar}
                  error={errores.sede} opciones={opcionesSede} disabled={!institucion} required
                  ayuda={institucion ? undefined : 'Primero elige tu institución'} />
                <Campo etiqueta="Año de ingreso (opcional)" nombre="anio_ingreso" id="c-anio" type="number"
                  value={perfil.anio_ingreso} onChange={cambiar} onKeyDown={sinSignos} inputMode="numeric"
                  min={ANIO_INGRESO_MIN} max={ANIO_INGRESO_MAX} placeholder={String(ANIO_INGRESO_MAX)}
                  error={errores.anio_ingreso ?? errorAnioIngreso(perfil.anio_ingreso)} />
              </div>
              <SelectorCarrera id="c-carrera" institucionId={perfil.institucion_id} valor={perfil.carrera}
                otra={perfil.carrera_otra} alCambiar={alCambiar} error={errores.carrera} />
            </>
          ) : (
            <>
              <div className="c-fila">
                {/* Primero la región; la ciudad se busca entre las comunas de esa región */}
                <Campo etiqueta="Región de origen" nombre="region_origen" id="c-region" value={perfil.region_origen}
                  onChange={(e) => alCambiar(cambiosDeRegion(e.target.value, perfil.ciudad_origen))}
                  error={errores.region_origen} opciones={opcionesRegion} required />
                <SelectorComuna id="c-ciudad" region={perfil.region_origen} valor={perfil.ciudad_origen}
                  alCambiar={alCambiar} error={errores.ciudad_origen} />
              </div>
              <Campo etiqueta="Dirección de tu ciudad de origen" nombre="direccion" id="c-direccion"
                value={perfil.direccion} onChange={cambiar} error={errores.direccion} maxLength={150} required
                placeholder="Por ejemplo: Los Carrera 1250, depto. 304" autoComplete="street-address"
                ayuda="Calle y número. Privada: no aparece en tu perfil." />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
