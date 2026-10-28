const CLAVE_TOKEN = 'roommatch_token'

export const obtenerToken = () => localStorage.getItem(CLAVE_TOKEN)
export const guardarToken = (token) => localStorage.setItem(CLAVE_TOKEN, token)
export const borrarToken = () => localStorage.removeItem(CLAVE_TOKEN)

// Error de la API con el código HTTP y, en los 422, los mensajes por campo (CA-01.3)
export class ErrorApi extends Error {
  constructor(estado, mensaje, errores = {}) {
    super(mensaje)
    this.estado = estado
    this.errores = errores
  }
}

// Se avisa a la sesión cuando un token deja de servir (logout, expiración o inactividad CA-02.5)
let alExpirarSesion = () => {}
export const configurarExpiracion = (funcion) => {
  alExpirarSesion = funcion
}

// `datos` puede ser un objeto (se envía como JSON) o un FormData (para subir archivos, como la foto)
export async function api(ruta, { metodo = 'GET', datos } = {}) {
  const token = obtenerToken()
  const esArchivo = datos instanceof FormData
  // Con FormData el navegador pone solo el Content-Type, con el separador de las partes
  const cabeceras = esArchivo ? {} : { 'Content-Type': 'application/json' }
  if (token) cabeceras.Authorization = `Bearer ${token}`

  let respuesta
  try {
    respuesta = await fetch(`/api${ruta}`, {
      method: metodo,
      headers: cabeceras,
      body: datos ? (esArchivo ? datos : JSON.stringify(datos)) : undefined,
    })
  } catch {
    throw new ErrorApi(0, 'No se pudo conectar con el servidor. Intenta nuevamente')
  }

  const cuerpo = await respuesta.json().catch(() => ({}))
  if (respuesta.ok) return cuerpo

  // Un 401 con token es sesión expirada; sin token es, por ejemplo, credenciales incorrectas
  if (respuesta.status === 401 && token) {
    borrarToken()
    alExpirarSesion()
  }
  const mensaje = typeof cuerpo.detail === 'string' ? cuerpo.detail : 'Ocurrió un error inesperado'
  throw new ErrorApi(respuesta.status, mensaje, cuerpo.errores)
}
