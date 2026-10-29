import Campo from '../componentes/Campo.jsx'
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
  const opcionesSede = (institucion?.sedes ?? []).map((s) => ({ valor: s, texto: s }))
  const opcionesRegion = (catalogo?.regiones ?? []).map((r) => ({ valor: r, texto: r }))

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
                  value={perfil.anio_ingreso} onChange={cambiar} error={errores.anio_ingreso} inputMode="numeric" />
              </div>
              <Campo etiqueta="Carrera" nombre="carrera" id="c-carrera" value={perfil.carrera} onChange={cambiar}
                error={errores.carrera} maxLength={100} required placeholder="Por ejemplo: Ingeniería en Informática" />
            </>
          ) : (
            <>
              <div className="c-fila">
                <Campo etiqueta="Ciudad de origen" nombre="ciudad_origen" id="c-ciudad" value={perfil.ciudad_origen}
                  onChange={cambiar} error={errores.ciudad_origen} maxLength={80} required />
                <Campo etiqueta="Región de origen" nombre="region_origen" id="c-region" value={perfil.region_origen}
                  onChange={cambiar} error={errores.region_origen} opciones={opcionesRegion} required />
              </div>
              <Campo etiqueta="Dirección de tu ciudad de origen" nombre="direccion" id="c-direccion"
                value={perfil.direccion} onChange={cambiar} error={errores.direccion} maxLength={150} required
                ayuda="Privada: no aparece en tu perfil." />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
