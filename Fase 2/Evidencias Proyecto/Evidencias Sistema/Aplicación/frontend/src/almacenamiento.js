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

// Lo mismo, pero solo mientras dure la pestaña (sessionStorage): por ejemplo, el último aviso ya anunciado
export function leerSesion(clave, porDefecto) {
  try {
    const valor = sessionStorage.getItem(clave)
    return valor === null ? porDefecto : JSON.parse(valor)
  } catch {
    return porDefecto
  }
}

export function guardarSesion(clave, valor) {
  try {
    sessionStorage.setItem(clave, JSON.stringify(valor))
  } catch {
    // Sin almacenamiento, en el peor caso el aviso se repite al recargar
  }
}
