// Formato mientras se escribe: el RUT y el teléfono se ven separados como en el ejemplo del campo.
// El backend acepta estos formatos y los normaliza (schemas/usuarios.py: normalizar_rut y
// normalizar_telefono), así que se envían tal como se ven

/**
 * RUT: solo dígitos y una K final. Se agrupa con puntos y el dígito verificador va tras el guion:
 * «123456789» → «12.345.678-9», «7654321k» → «7.654.321-K». Máximo 8 dígitos más el verificador.
 */
export function formatearRut(valor) {
  const limpio = valor.toUpperCase().replace(/[^0-9K]/g, '')
  // La K solo puede ser el último carácter (dígito verificador)
  const sinK = limpio.replace(/K(?=.)/g, '')
  const recortado = sinK.slice(0, 9)
  if (recortado.length <= 1) return recortado
  const cuerpo = recortado.slice(0, -1).replace(/K/g, '')
  const dv = recortado.slice(-1)
  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`
}

/**
 * Teléfono celular de Chile: solo números, separados como «9 1234 5678». Si se pega con el
 * prefijo del país (+56 9 1234 5678 o 56912345678), el prefijo se quita.
 */
export function formatearTelefono(valor) {
  let digitos = valor.replace(/\D/g, '')
  if (digitos.length > 9 && digitos.startsWith('56')) digitos = digitos.slice(2)
  digitos = digitos.slice(0, 9)
  return [digitos.slice(0, 1), digitos.slice(1, 5), digitos.slice(5, 9)].filter(Boolean).join(' ')
}
