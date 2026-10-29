import './enConstruccion.css'

// Página reservada para una historia que aún no se implementa. Quien la tenga a cargo reemplaza
// este componente por la página real, sin tocar las rutas de App.jsx
export default function EnConstruccion({ titulo, historias, descripcion }) {
  return (
    <main className="en-construccion">
      <p className="en-construccion-etiqueta">En construcción · {historias}</p>
      <h1>{titulo}</h1>
      {descripcion && <p>{descripcion}</p>}
    </main>
  )
}
