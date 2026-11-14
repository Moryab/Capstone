/*
 * Lo último que respondió la API para cada ruta GET (por ejemplo, '/perfil'). Permite mostrar al
 * instante una vista ya visitada y actualizarla por detrás (useApi). Vive solo en memoria: se pierde
 * al recargar la página.
 *
 * Para no mostrar nunca datos viejos o ajenos se vacía entera:
 * - al iniciar o cerrar sesión (el token cambia: podrían ser datos de otra persona), y
 * - después de cualquier cambio exitoso (POST, PUT, DELETE…): lo guardado podría ya no ser cierto.
 */
const memoria = new Map()

export const leerMemoria = (ruta) => (ruta ? memoria.get(ruta) : undefined)
export const guardarMemoria = (ruta, datos) => {
  if (ruta) memoria.set(ruta, datos)
}
export const limpiarMemoria = () => memoria.clear()
