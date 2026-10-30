// Transición animada entre «Mi perfil» y «Ver como me ven». El perfil recibe su nombre de transición
// (clase transicion-perfil en <html>) solo mientras dura este cambio de página: si lo tuviera siempre,
// al cambiar el tema se dibujaría encima del panel de configuración
export function marcarTransicionPerfil() {
  document.documentElement.classList.add('transicion-perfil')
  setTimeout(() => document.documentElement.classList.remove('transicion-perfil'), 900)
}
