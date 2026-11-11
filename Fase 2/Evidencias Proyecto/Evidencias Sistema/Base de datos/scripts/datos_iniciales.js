// Catálogos de comunas e instituciones del Gran Concepción (servicio inicializar-bd).
// Se insertan solo si no existen (por su código), así no se pisan cambios hechos después en la base.
// Las coordenadas son aproximadas y las direcciones en null están por confirmar.
// La cuenta de administrador no está aquí: la crea la API, porque su clave se cifra con bcrypt.

db = db.getSiblingDB(process.env.MONGO_DB || "roommatch");

// [codigo, nombre, sector, [longitud, latitud]] — GeoJSON usa primero la longitud
const COMUNAS = [
  [1, "Concepción", "centro", [-73.0498, -36.827]],
  [2, "Talcahuano", "norte", [-73.117, -36.7249]],
  [3, "Hualpén", "norte", [-73.095, -36.79]],
  [4, "San Pedro de la Paz", "sur", [-73.106, -36.843]],
  [5, "Chiguayante", "sur", [-73.028, -36.925]],
  [6, "Penco", "norte", [-72.995, -36.74]],
  [7, "Tomé", "norte", [-72.957, -36.617]],
  [8, "Coronel", "sur", [-73.158, -37.017]],
  [9, "Lota", "sur", [-73.156, -37.089]],
  [10, "Hualqui", "sur", [-72.938, -36.977]],
];

const CERCA_DE_CONCEPCION = ["Concepción", "San Pedro de la Paz", "Chiguayante", "Hualpén", "Talcahuano"];
const CERCA_DE_TALCAHUANO = ["Talcahuano", "Hualpén", "Concepción", "Penco"];

// [codigo, nombre, sigla, tipo, dominios_correo, sedes]
// sede: [nombre, comuna, direccion, [longitud, latitud], comunas cercanas]
const INSTITUCIONES = [
  [1, "Universidad de Concepción", "UdeC", "universidad", ["udec.cl"], [
    ["Campus Concepción", "Concepción", "Víctor Lamas 1290", [-73.0359, -36.8296], CERCA_DE_CONCEPCION],
  ]],
  [2, "Universidad del Bío-Bío", "UBB", "universidad", ["ubiobio.cl", "alumnos.ubiobio.cl"], [
    ["Sede Concepción", "Concepción", "Avenida Collao 1202", [-73.0128, -36.8211], CERCA_DE_CONCEPCION],
  ]],
  [3, "Universidad Católica de la Santísima Concepción", "UCSC", "universidad", ["ucsc.cl"], [
    ["Campus San Andrés", "Concepción", "Alonso de Ribera 2850", [-73.0612, -36.7966], CERCA_DE_CONCEPCION],
  ]],
  [4, "Universidad Andrés Bello", "UNAB", "universidad", ["unab.cl", "uandresbello.edu"], [
    ["Sede Concepción", "Talcahuano", "Autopista Concepción-Talcahuano 7100", [-73.0773, -36.7869], CERCA_DE_TALCAHUANO],
  ]],
  [5, "Universidad San Sebastián", "USS", "universidad", ["uss.cl", "correo.uss.cl"], [
    ["Sede Concepción", "Concepción", "Lientur 1457", [-73.0379, -36.833], CERCA_DE_CONCEPCION],
  ]],
  [6, "Universidad del Desarrollo", "UDD", "universidad", ["udd.cl"], [
    ["Sede Concepción", "Concepción", "Ainavillo 456", [-73.03, -36.8125], CERCA_DE_CONCEPCION],
  ]],
  [7, "Universidad Santo Tomás", "UST", "universidad", ["santotomas.cl"], [
    ["Sede Concepción", "Concepción", null, [-73.0498, -36.827], CERCA_DE_CONCEPCION],
  ]],
  [8, "Duoc UC", "Duoc UC", "instituto_profesional", ["duocuc.cl"], [
    ["Sede San Andrés de Concepción", "Concepción", "Paicaví 3280", [-73.056, -36.809], CERCA_DE_CONCEPCION],
  ]],
  [9, "INACAP", "INACAP", "instituto_profesional", ["inacap.cl", "inacapmail.cl"], [
    ["Sede Concepción-Talcahuano", "Talcahuano", null, [-73.08, -36.78], CERCA_DE_TALCAHUANO],
  ]],
  [10, "Instituto Profesional Virginio Gómez", "IPVG", "instituto_profesional", ["virginiogomez.cl"], [
    ["Sede Concepción", "Concepción", null, [-73.0498, -36.827], CERCA_DE_CONCEPCION],
  ]],
  [11, "Instituto Profesional AIEP", "AIEP", "instituto_profesional", ["aiep.cl"], [
    ["Sede Concepción", "Concepción", null, [-73.0498, -36.827], CERCA_DE_CONCEPCION],
  ]],
];

function punto(coordenadas) {
  return { type: "Point", coordinates: coordenadas };
}

function insertarSiNoExiste(coleccion, documentos) {
  for (const doc of documentos) {
    db[coleccion].updateOne({ codigo: doc.codigo }, { $setOnInsert: doc }, { upsert: true });
  }
  // El contador queda al día para que lo que se cree después no repita códigos
  const mayor = Math.max(...documentos.map((doc) => doc.codigo));
  db.contadores.updateOne({ _id: coleccion }, { $max: { secuencia: mayor } }, { upsert: true });
}

insertarSiNoExiste(
  "comunas",
  COMUNAS.map(([codigo, nombre, sector, centro]) => ({
    codigo, nombre, region: "Biobío", sector, centro: punto(centro),
  }))
);

const idsComunas = {};
db.comunas.find({}, { nombre: 1 }).forEach((comuna) => {
  idsComunas[comuna.nombre] = comuna._id;
});

insertarSiNoExiste(
  "instituciones",
  INSTITUCIONES.map(([codigo, nombre, sigla, tipo, dominios, sedes]) => ({
    codigo,
    nombre,
    sigla,
    tipo,
    dominios_correo: dominios,
    activa: true,
    sedes: sedes.map(([sede, comuna, direccion, coordenadas, cercanas]) => ({
      nombre: sede,
      comuna_id: idsComunas[comuna],
      direccion,
      coordenadas: punto(coordenadas),
      comunas_cercanas_ids: cercanas.map((c) => idsComunas[c]),
      sectores_cercanos: [],
    })),
  }))
);

print("Datos iniciales listos");
