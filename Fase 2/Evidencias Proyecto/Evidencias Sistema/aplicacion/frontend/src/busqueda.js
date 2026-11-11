// Filtros del listado de alojamientos (EP-04). Los filtros aplicados viven en la dirección
// (/alojamientos?costo_max=200000&comunas=...), así se mantienen al abrir un detalle y volver,
// hasta que se presione «Limpiar filtros» (CA-12.5)

export const FILTROS_VACIOS = {
  costo_min: '',
  costo_max: '',
  comunas: [],
  cerca_institucion: false,
  tipo_alojamiento: '',
  requiere_mascotas: '',
  requiere_fumar: '',
  requiere_visitas: '',
  gastos_incluidos: false,
  amoblado: false,
  estacionamiento: false,
}

const TEXTOS = ['costo_min', 'costo_max', 'tipo_alojamiento', 'requiere_mascotas', 'requiere_fumar', 'requiere_visitas']
const CASILLAS = ['cerca_institucion', 'gastos_incluidos', 'amoblado', 'estacionamiento']

// CA-12.1: «da lo mismo» no filtra; las otras dos exigen que la regla coincida
export const REGLAS_FILTRO = [
  { clave: 'requiere_mascotas', texto: 'Mascotas' },
  { clave: 'requiere_fumar', texto: 'Fumar' },
  { clave: 'requiere_visitas', texto: 'Visitas' },
]
export const OPCIONES_REGLA = [
  { valor: '', texto: 'Da lo mismo' },
  { valor: 'true', texto: 'Permitido' },
  { valor: 'false', texto: 'No permitido' },
]

export const EXTRAS_FILTRO = [
  { clave: 'gastos_incluidos', texto: 'Gastos incluidos' },
  { clave: 'amoblado', texto: 'Amoblado' },
  { clave: 'estacionamiento', texto: 'Estacionamiento' },
]

// Zonas del Gran Concepción según el campo `sector` de cada comuna
export const ZONAS = [
  { valor: 'centro', texto: 'Zona centro' },
  { valor: 'norte', texto: 'Zona norte' },
  { valor: 'sur', texto: 'Zona sur' },
]

export function desdeURL(params) {
  return {
    ...FILTROS_VACIOS,
    ...Object.fromEntries(TEXTOS.map((clave) => [clave, params.get(clave) ?? ''])),
    ...Object.fromEntries(CASILLAS.map((clave) => [clave, params.get(clave) === 'true'])),
    comunas: params.getAll('comunas'),
  }
}

// Solo van a la dirección los filtros con valor; la página 1 no se escribe
export function aURL(filtros, pagina = 1) {
  const params = new URLSearchParams()
  for (const clave of TEXTOS) {
    if (filtros[clave] !== '') params.set(clave, limpiarMonto(clave, filtros[clave]))
  }
  for (const clave of CASILLAS) {
    if (filtros[clave]) params.set(clave, 'true')
  }
  for (const id of filtros.comunas) params.append('comunas', id)
  if (pagina > 1) params.set('pagina', pagina)
  return params
}

export const hayFiltros = (params) => [...params.keys()].some((clave) => clave !== 'pagina')
export const soloCosto = (params) =>
  [...params.keys()].every((clave) => ['costo_min', 'costo_max', 'pagina'].includes(clave))

// Se aceptan los puntos de miles («150.000»)
const limpiarMonto = (clave, valor) => (clave.startsWith('costo_') ? valor.replaceAll('.', '').trim() : valor)

// CA-10.3: con un error el filtro no se aplica. El backend vuelve a validar
export function validarCosto(filtros) {
  const errores = {}
  const montos = {}
  for (const clave of ['costo_min', 'costo_max']) {
    const valor = limpiarMonto(clave, filtros[clave])
    if (valor === '') continue
    if (valor.startsWith('-')) errores[clave] = 'El monto no puede ser negativo'
    else if (!/^\d+$/.test(valor)) errores[clave] = 'Ingresa el monto en pesos, solo números'
    else montos[clave] = Number(valor)
  }
  if (montos.costo_min != null && montos.costo_max != null && montos.costo_min > montos.costo_max) {
    errores.costo_max = 'El máximo debe ser mayor o igual al mínimo'
  }
  return errores
}

const aTexto = (valor) => (valor == null ? '' : String(valor))
const aNumero = (valor) => (valor === '' ? null : Number(limpiarMonto('costo_', valor)))
const aBool = (valor) => (valor === '' ? null : valor === 'true')

// CA-12.2: las preferencias guardadas (usuarios.preferencias_busqueda) completan los filtros
export function desdePreferencias(p) {
  return {
    ...FILTROS_VACIOS,
    costo_min: aTexto(p.costo_min),
    costo_max: aTexto(p.costo_max),
    comunas: p.comunas_ids,
    cerca_institucion: Boolean(p.cerca_institucion),
    tipo_alojamiento: p.tipo_alojamiento ?? '',
    requiere_mascotas: aTexto(p.requiere_mascotas),
    requiere_fumar: aTexto(p.requiere_fumar),
    requiere_visitas: aTexto(p.requiere_visitas),
    gastos_incluidos: p.gastos_incluidos,
    amoblado: p.amoblado,
    estacionamiento: p.estacionamiento,
  }
}

export function aPreferencias(f) {
  return {
    costo_min: aNumero(f.costo_min),
    costo_max: aNumero(f.costo_max),
    comunas_ids: f.comunas,
    cerca_institucion: f.cerca_institucion,
    tipo_alojamiento: f.tipo_alojamiento || null,
    requiere_mascotas: aBool(f.requiere_mascotas),
    requiere_fumar: aBool(f.requiere_fumar),
    requiere_visitas: aBool(f.requiere_visitas),
    gastos_incluidos: f.gastos_incluidos,
    amoblado: f.amoblado,
    estacionamiento: f.estacionamiento,
  }
}

export const sinPreferencias = (p) =>
  JSON.stringify(desdePreferencias(p)) === JSON.stringify(FILTROS_VACIOS)
