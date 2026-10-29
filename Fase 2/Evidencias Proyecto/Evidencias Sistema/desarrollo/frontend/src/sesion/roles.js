// Los administradores validan estudiantes y moderan; no buscan alojamiento ni roomie
export const esAdmin = (usuario) => usuario?.rol === 'administrador'
