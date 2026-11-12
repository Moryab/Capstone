// Textos y conversiones compartidas por las páginas de publicaciones (EP-03)

export const TIPOS = [
  { valor: 'habitacion', texto: 'Habitación' },
  { valor: 'departamento', texto: 'Departamento' },
]

export const GENEROS_PREFERIDOS = [
  { valor: 'indiferente', texto: 'Indiferente' },
  { valor: 'femenino', texto: 'Solo mujeres' },
  { valor: 'masculino', texto: 'Solo hombres' },
]

export const SERVICIOS = [
  { clave: 'agua', texto: 'Agua' },
  { clave: 'luz', texto: 'Luz' },
  { clave: 'gas', texto: 'Gas' },
  { clave: 'internet', texto: 'Internet' },
]

export const REGLAS = [
  { clave: 'permite_fumar', texto: '¿Se permite fumar?' },
  { clave: 'permite_mascotas', texto: '¿Se permiten mascotas?' },
  { clave: 'permite_visitas', texto: '¿Se permiten visitas?' },
]

export const CARACTERISTICAS = [
  { clave: 'amoblado', texto: 'Amoblado' },
  { clave: 'banio_privado', texto: 'Baño privado' },
  { clave: 'estacionamiento', texto: 'Estacionamiento' },
]

export const ESTADOS = {
  activa: 'Activa',
  completa: 'Sin cupos',
  pausada: 'Pausada',
  suspendida: 'Suspendida por moderación',
}

export const SI_NO = [
  { valor: 'si', texto: 'Sí' },
  { valor: 'no', texto: 'No' },
]

// Mismos límites que valida el backend (CA-05.4)
export const MAX_FOTOS = 5
export const FOTO_MAX_MB = 5
export const FOTO_TIPOS_PUBLICACION = ['image/jpeg', 'image/png']

export const textoDe = (lista, valor) => lista.find((o) => o.valor === valor)?.texto ?? valor

const pesos = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' })
export const formatearPesos = (monto) => pesos.format(monto)

const fechaLarga = new Intl.DateTimeFormat('es-CL', { dateStyle: 'long' })
export const formatearFecha = (iso) => fechaLarga.format(new Date(iso))

// El nombre del archivo identifica cada foto en la API
export const nombreFoto = (url) => url.split('/').pop()

// «A 2,1 km de tu sede»: la distancia que calcula la API desde la zona del alojamiento
export const textoDistancia = (km) => `A ${km.toLocaleString('es-CL')} km de tu sede`

const aSiNo = (valor) => (valor == null ? '' : valor ? 'si' : 'no')
const deSiNo = (valor) => (valor === '' ? null : valor === 'si')
const aNumero = (valor) => (valor === '' ? null : Number(valor))

// Formulario vacío. Los sí/no parten sin elegir para que el oferente responda cada uno (CA-06.5)
export const FORMULARIO_VACIO = {
  tipo: '',
  titulo: '',
  descripcion: '',
  cupos_totales: '1',
  cupos_disponibles: '1',
  costo_mensual: '',
  genero_preferido: 'indiferente',
  'ubicacion.comuna_id': '',
  'ubicacion.sector': '',
  'ubicacion.calle': '',
  'ubicacion.numero': '',
  'ubicacion.direccion_referencia': '',
  'ubicacion.punto': null, // { lat, lng } marcado en el mapa (opcional)
  ...Object.fromEntries(SERVICIOS.flatMap(({ clave }) => [
    [`gastos.${clave}.incluido`, ''],
    [`gastos.${clave}.monto_estimado`, ''],
  ])),
  ...Object.fromEntries(REGLAS.map(({ clave }) => [`reglas.${clave}`, ''])),
  'reglas.horario_silencio.aplica': '',
  'reglas.horario_silencio.desde': '',
  'reglas.horario_silencio.hasta': '',
  'reglas.reglas_adicionales': '',
  ...Object.fromEntries(CARACTERISTICAS.map(({ clave }) => [`caracteristicas.${clave}`, false])),
}

// El formulario guarda todo plano con claves «a.b.c», igual que las claves de error de la API
export function aFormulario(pub) {
  const { ubicacion, gastos, reglas, caracteristicas } = pub
  return {
    ...FORMULARIO_VACIO,
    tipo: pub.tipo,
    titulo: pub.titulo,
    descripcion: pub.descripcion,
    cupos_totales: String(pub.cupos_totales),
    cupos_disponibles: String(pub.cupos_disponibles),
    costo_mensual: String(pub.costo_mensual),
    genero_preferido: pub.genero_preferido,
    'ubicacion.comuna_id': ubicacion.comuna_id,
    'ubicacion.sector': ubicacion.sector,
    'ubicacion.calle': ubicacion.calle ?? '',
    'ubicacion.numero': ubicacion.numero ?? '',
    'ubicacion.direccion_referencia': ubicacion.direccion_referencia ?? '',
    'ubicacion.punto': ubicacion.punto ?? null,
    ...Object.fromEntries(SERVICIOS.flatMap(({ clave }) => [
      [`gastos.${clave}.incluido`, aSiNo(gastos[clave].incluido)],
      [`gastos.${clave}.monto_estimado`, gastos[clave].monto_estimado?.toString() ?? ''],
    ])),
    ...Object.fromEntries(REGLAS.map(({ clave }) => [`reglas.${clave}`, aSiNo(reglas[clave])])),
    'reglas.horario_silencio.aplica': aSiNo(reglas.horario_silencio.aplica),
    'reglas.horario_silencio.desde': reglas.horario_silencio.desde ?? '',
    'reglas.horario_silencio.hasta': reglas.horario_silencio.hasta ?? '',
    'reglas.reglas_adicionales': reglas.reglas_adicionales ?? '',
    ...Object.fromEntries(CARACTERISTICAS.map(({ clave }) => [
      `caracteristicas.${clave}`, Boolean(caracteristicas[clave]),
    ])),
  }
}

// Lo que espera la API: objetos anidados, números y booleanos (null en lo que falta)
export function aPayload(f) {
  return {
    tipo: f.tipo || null,
    titulo: f.titulo,
    descripcion: f.descripcion,
    cupos_totales: aNumero(f.cupos_totales),
    cupos_disponibles: aNumero(f.cupos_disponibles),
    costo_mensual: aNumero(f.costo_mensual),
    genero_preferido: f.genero_preferido,
    ubicacion: {
      comuna_id: f['ubicacion.comuna_id'],
      sector: f['ubicacion.sector'],
      calle: f['ubicacion.calle'] || null,
      numero: f['ubicacion.numero'] || null,
      direccion_referencia: f['ubicacion.direccion_referencia'] || null,
      punto: f['ubicacion.punto'],
    },
    gastos: Object.fromEntries(SERVICIOS.map(({ clave }) => [clave, {
      incluido: deSiNo(f[`gastos.${clave}.incluido`]),
      monto_estimado: aNumero(f[`gastos.${clave}.monto_estimado`]),
    }])),
    reglas: {
      ...Object.fromEntries(REGLAS.map(({ clave }) => [clave, deSiNo(f[`reglas.${clave}`])])),
      horario_silencio: {
        aplica: deSiNo(f['reglas.horario_silencio.aplica']),
        desde: f['reglas.horario_silencio.desde'] || null,
        hasta: f['reglas.horario_silencio.hasta'] || null,
      },
      reglas_adicionales: f['reglas.reglas_adicionales'] || null,
    },
    caracteristicas: Object.fromEntries(CARACTERISTICAS.map(({ clave }) => [
      clave, f[`caracteristicas.${clave}`],
    ])),
  }
}

/**
 * Busca en OpenStreetMap (Nominatim) el punto de una dirección de Chile. Prueba primero la dirección
 * estructurada (número y calle en la comuna), luego como texto libre y, si el número no aparece en el
 * mapa, solo la calle. Devuelve { lat, lng, aproximado } o null. Solo se usa en el formulario de quien publica.
 */
// Nominatim pide como máximo una consulta por segundo
let ultimaConsulta = 0
const esperarTurno = async () => {
  const espera = ultimaConsulta + 1100 - Date.now()
  if (espera > 0) await new Promise((listo) => { setTimeout(listo, espera) })
  ultimaConsulta = Date.now()
}

export async function ubicarDireccion({ calle, numero, comuna }) {
  const buscar = async (consulta) => {
    await esperarTurno()
    const params = new URLSearchParams({ ...consulta, countrycodes: 'cl', format: 'jsonv2', limit: '1', 'accept-language': 'es' })
    const respuesta = await fetch(`https://nominatim.openstreetmap.org/search?${params}`)
    if (!respuesta.ok) throw new Error('No pudimos consultar el mapa. Intenta de nuevo en un momento.')
    const [lugar] = await respuesta.json()
    return lugar ? { lat: Number(Number(lugar.lat).toFixed(6)), lng: Number(Number(lugar.lon).toFixed(6)) } : null
  }
  // «Avenida», «Av.», «Calle» o «Pasaje» al inicio suelen impedir que el mapa la encuentre
  const nombre = calle.replace(/^(avenida|avda\.?|av\.?|calle|pasaje|psje\.?)\s+/i, '')
  const exacto = await buscar({ street: `${numero} ${calle}`, city: comuna, country: 'Chile' })
    ?? (nombre !== calle ? await buscar({ street: `${numero} ${nombre}`, city: comuna, country: 'Chile' }) : null)
    ?? await buscar({ q: `${calle} ${numero}, ${comuna}, Chile` })
  if (exacto) return { ...exacto, aproximado: false }
  const soloCalle = await buscar({ street: nombre, city: comuna, country: 'Chile' })
  return soloCalle && { ...soloCalle, aproximado: true }
}
