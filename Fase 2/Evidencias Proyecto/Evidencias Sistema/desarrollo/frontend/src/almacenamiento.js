// Lectura y escritura segura en el navegador: puede fallar en modo privado o con datos bloqueados.
// Solo se usa para preferencias (tema, barra contraída); la app funciona igual sin ellas

export function leerLocal(clave, porDefecto) {
  try {
    const valor = localStorage.getItem(clave)
    return valor === null ? porDefecto : JSON.parse(valor)
  } catch {
    return porDefecto
  }
}

export function guardarLocal(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor))
  } catch {
    // Sin almacenamiento solo no se recuerda la preferencia
  }
}
