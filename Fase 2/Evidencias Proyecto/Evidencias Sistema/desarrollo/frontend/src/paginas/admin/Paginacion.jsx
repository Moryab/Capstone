// Paginación de los listados de administración (HU-28 y HU-29). Con una sola página no muestra nada
export default function Paginacion({ datos, irAPagina, etiqueta }) {
  if (datos.paginas <= 1) return null
  return (
    <nav className="paginacion" aria-label={etiqueta}>
      <button type="button" className="boton secundario" disabled={datos.pagina <= 1}
        onClick={() => irAPagina(datos.pagina - 1)}>
        Anterior
      </button>
      <span>Página {datos.pagina} de {datos.paginas}</span>
      <button type="button" className="boton secundario" disabled={datos.pagina >= datos.paginas}
        onClick={() => irAPagina(datos.pagina + 1)}>
        Siguiente
      </button>
    </nav>
  )
}
