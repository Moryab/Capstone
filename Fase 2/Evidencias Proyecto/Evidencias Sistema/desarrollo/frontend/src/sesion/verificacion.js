// RoomMatch es solo para estudiantes: mientras un administrador no apruebe su documento, la cuenta
// tiene acceso limitado (no publica, no ve roomies ni propuestas de match). El administrador no se verifica
export const estaVerificado = (usuario) =>
  usuario?.rol === 'administrador' || usuario?.verificacion_estado === 'verificado'
