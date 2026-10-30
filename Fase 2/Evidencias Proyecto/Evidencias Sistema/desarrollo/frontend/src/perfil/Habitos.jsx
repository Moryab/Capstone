import { useState } from 'react'
import { Link } from 'react-router-dom'
import { textoRespuesta } from '../cuestionario.js'
import { CATEGORIAS, corto, fraseConvivencia, mayuscula, NIVELES } from './datos.js'
import { IconoHabito, IconoSello } from './iconos.jsx'

// Ficha de un hábito: al frente el ícono y la respuesta corta; al voltearla (mouse, toque o
// Enter), la respuesta completa y su importancia. El texto completo también está para lectores
function Ficha({ clave, titulo, valor, nivel, imprescindible }) {
  const [volteada, setVolteada] = useState(false)
  const datosNivel = nivel ? NIVELES[nivel] : null
  return (
    <li className={`p2-ficha p2-anima${imprescindible ? ' es-imprescindible' : ''}${volteada ? ' volteada' : ''}`}>
      <button type="button" className="p2-ficha-boton" aria-expanded={volteada} onClick={() => setVolteada((v) => !v)}
        onMouseLeave={() => setVolteada(false)}>
        <span className="p2-ficha-interior">
          <span className="p2-ficha-cara frente">
            {imprescindible && <span className="p2-sello-mini" title="Imprescindible"><IconoSello tamano={14} /></span>}
            <span className="p2-ficha-icono"><IconoHabito clave={clave} tamano={30} /></span>
            <span className="p2-ficha-categoria">{titulo}</span>
            <span className="p2-ficha-corto">{corto(clave, valor)}</span>
          </span>
          <span className="p2-ficha-cara reverso" aria-hidden={!volteada}>
            <span className="p2-ficha-categoria">{titulo}</span>
            <span className="p2-ficha-completo">{textoRespuesta(clave, valor)}</span>
            <span className={`p2-nivel ${nivel ?? 'no-imprescindible'}`}>
              {datosNivel ? datosNivel.titulo : 'No es imprescindible'}
            </span>
            {datosNivel && <span className="p2-ficha-nivel-texto">{datosNivel.texto}</span>}
          </span>
        </span>
        <span className="visualmente-oculto">
          {volteada ? '' : `: ${textoRespuesta(clave, valor)}. ${datosNivel ? datosNivel.titulo : ''}`}
        </span>
      </button>
    </li>
  )
}

/**
 * «Perfil de convivencia»: frase resumen, imprescindibles con sello y una ficha por hábito
 * (HU-13 y CA-16.1). `importancia` ({categoria: nivel}) se conoce en el propio perfil y, en el de
 * otro, por el cálculo de compatibilidad; si falta, solo se sabe qué es imprescindible.
 */
export default function Habitos({ perfil, importancia }) {
  const propio = perfil.es_propio
  const nombre = mayuscula(perfil.nombre)
  if (!perfil.habitos) {
    return (
      <section className="p2-tarjeta p2-anima" aria-labelledby="p2-titulo-habitos">
        <h2 id="p2-titulo-habitos">Perfil de convivencia</h2>
        <p className="p2-vacio">
          {propio
            ? <>Aún no respondes el cuestionario. <Link to="/perfil/cuestionario">Responderlo ahora</Link></>
            : `${nombre} aún no responde el cuestionario de hábitos.`}
        </p>
      </section>
    )
  }

  const imprescindibles = CATEGORIAS.filter(({ clave }) => perfil.imprescindibles.includes(clave))
  const nivelDe = (clave) => importancia?.[clave] ?? (perfil.imprescindibles.includes(clave) ? 'imprescindible' : null)

  return (
    <section className="p2-tarjeta p2-habitos p2-anima" aria-labelledby="p2-titulo-habitos">
      <div className="p2-tarjeta-cabecera">
        <h2 id="p2-titulo-habitos">Perfil de convivencia</h2>
        {propio && <Link to="/perfil/cuestionario" className="p2-boton-texto">Editar hábitos</Link>}
      </div>

      <div className="p2-frase">
        <p className="p2-frase-etiqueta">{propio ? 'Tu forma de convivir' : `Cómo convive ${nombre}`}</p>
        <p className="p2-frase-texto">{fraseConvivencia(perfil.habitos, perfil.genero)}</p>
      </div>

      {imprescindibles.length > 0 && (
        <div className="p2-imprescindibles">
          <span className="p2-sello"><IconoSello /> Imprescindible</span>
          <ul>
            {imprescindibles.map(({ clave, titulo }) => (
              <li key={clave}><IconoHabito clave={clave} tamano={18} /> {titulo}: {corto(clave, perfil.habitos[clave]).toLowerCase()}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="p2-ayuda">Pasa el mouse o toca una ficha para ver la respuesta completa.</p>
      <ul className="p2-fichas">
        {CATEGORIAS.map(({ clave, titulo }) => (
          <Ficha key={clave} clave={clave} titulo={titulo} valor={perfil.habitos[clave]} nivel={nivelDe(clave)}
            imprescindible={perfil.imprescindibles.includes(clave)} />
        ))}
      </ul>
    </section>
  )
}
