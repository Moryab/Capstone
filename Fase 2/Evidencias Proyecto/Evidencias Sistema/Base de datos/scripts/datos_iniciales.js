// Catálogos de comunas e instituciones de la Región del Biobío (servicio inicializar-bd).
// RoomMatch es para estudiantes que llegan de otras ciudades a estudiar en la región: aquí están sus 33
// comunas y todas las instituciones con sedes en ella según la Oferta Académica 2026 del SIES (Mineduc).
// Las coordenadas de las sedes vienen de OpenStreetMap o de geocodificar su dirección; la dirección queda
// en null cuando ninguna fuente la confirma (la sede se ubica entonces en el centro de su comuna).
// Este script es la fuente de los catálogos: al volver a correrlo se actualizan nombres, sedes y
// coordenadas (por código), sin tocar el estado «activa» ni los dominios de correo ya guardados.
// La cuenta de administrador no está aquí: la crea la API, porque su clave se cifra con bcrypt.

db = db.getSiblingDB(process.env.MONGO_DB || "roommatch");

// Provincias de la región: agrupan las comunas en el filtro de búsqueda (campo «sector» de la comuna)
const PROVINCIAS = { concepcion: "Concepción", arauco: "Arauco", biobio: "Biobío" };

// [codigo, nombre, provincia, [longitud, latitud]] — GeoJSON usa primero la longitud. El centro es el
// de la ciudad o pueblo principal de la comuna. Los códigos 1 a 10 son los del Gran Concepción originales
const COMUNAS = [
  [1, "Concepción", "concepcion", [-73.0502, -36.8271]],
  [2, "Talcahuano", "concepcion", [-73.1141, -36.7145]],
  [3, "Hualpén", "concepcion", [-73.0943, -36.7928]],
  [4, "San Pedro de la Paz", "concepcion", [-73.104, -36.8414]],
  [5, "Chiguayante", "concepcion", [-73.0237, -36.9292]],
  [6, "Penco", "concepcion", [-72.9938, -36.7386]],
  [7, "Tomé", "concepcion", [-72.9575, -36.6171]],
  [8, "Coronel", "concepcion", [-73.1562, -37.0165]],
  [9, "Lota", "concepcion", [-73.1564, -37.0945]],
  [10, "Hualqui", "concepcion", [-72.9384, -36.9759]],
  [11, "Florida", "concepcion", [-72.6614, -36.8253]],
  [12, "Santa Juana", "concepcion", [-72.9426, -37.1738]],
  [13, "Lebu", "arauco", [-73.6561, -37.6102]],
  [14, "Arauco", "arauco", [-73.3176, -37.2462]],
  [15, "Cañete", "arauco", [-73.3991, -37.8004]],
  [16, "Contulmo", "arauco", [-73.2286, -38.016]],
  [17, "Curanilahue", "arauco", [-73.3457, -37.4758]],
  [18, "Los Álamos", "arauco", [-73.4618, -37.6271]],
  [19, "Tirúa", "arauco", [-73.4935, -38.3439]],
  [20, "Los Ángeles", "biobio", [-72.3517, -37.4707]],
  [21, "Antuco", "biobio", [-71.6792, -37.33]],
  [22, "Cabrero", "biobio", [-72.4027, -37.0358]],
  [23, "Laja", "biobio", [-72.7149, -37.2795]],
  [24, "Mulchén", "biobio", [-72.2441, -37.7201]],
  [25, "Nacimiento", "biobio", [-72.6731, -37.5018]],
  [26, "Negrete", "biobio", [-72.5293, -37.5857]],
  [27, "Quilaco", "biobio", [-72.0055, -37.6841]],
  [28, "Quilleco", "biobio", [-71.9803, -37.471]],
  [29, "San Rosendo", "biobio", [-72.724, -37.2631]],
  [30, "Santa Bárbara", "biobio", [-72.0214, -37.6681]],
  [31, "Tucapel", "biobio", [-71.9495, -37.2926]],
  [32, "Yumbel", "biobio", [-72.5623, -37.0979]],
  [33, "Alto Biobío", "biobio", [-71.6403, -37.9956]], // Ralco, la cabecera comunal
];

// «Cerca de mi sede»: la comuna de la sede y las que tienen su centro a esta distancia o menos
const RADIO_CERCANIA_KM = 15;

// Sin dirección confirmada, la sede se ubica en el centro de su comuna
const EN_EL_CENTRO = null;

// [codigo, nombre, sigla, tipo, dominios_correo, sedes]
// sede: [nombre, comuna, direccion, [longitud, latitud] o EN_EL_CENTRO]
// Los nombres de las sedes de las 11 primeras instituciones se mantienen: los perfiles guardan la sede por nombre
const INSTITUCIONES = [
  [1, "Universidad de Concepción", "UdeC", "universidad", ["udec.cl"], [
    ["Campus Concepción", "Concepción", "Víctor Lamas 1290", [-73.0348, -36.831]],
    ["Campus Los Ángeles", "Los Ángeles", "Juan Antonio Coloma 0201", [-72.345, -37.472]],
  ]],
  [2, "Universidad del Bío-Bío", "UBB", "universidad", ["ubiobio.cl", "alumnos.ubiobio.cl"], [
    ["Sede Concepción", "Concepción", "Avenida Collao 1202", [-73.012, -36.8232]],
  ]],
  [3, "Universidad Católica de la Santísima Concepción", "UCSC", "universidad", ["ucsc.cl"], [
    ["Campus San Andrés", "Concepción", "Alonso de Ribera 2850", [-73.0577, -36.7973]],
    ["Instituto Tecnológico Sede Talcahuano", "Talcahuano", null, [-73.104, -36.7366]],
    ["Instituto Tecnológico Sede Los Ángeles", "Los Ángeles", null, [-72.349, -37.4715]],
    ["Instituto Tecnológico Sede Cañete", "Cañete", "Avenida Presidente Frei 787", [-73.3907, -37.792]],
  ]],
  [4, "Universidad Andrés Bello", "UNAB", "universidad", ["unab.cl", "uandresbello.edu"], [
    ["Sede Concepción", "Talcahuano", "Autopista Concepción-Talcahuano 7100", [-73.0759, -36.78]],
  ]],
  [5, "Universidad San Sebastián", "USS", "universidad", ["uss.cl", "correo.uss.cl"], [
    ["Sede Concepción", "Concepción", "Lientur 1457", [-73.0433, -36.8131]],
  ]],
  [6, "Universidad del Desarrollo", "UDD", "universidad", ["udd.cl"], [
    ["Sede Concepción", "Concepción", "Ainavillo 456", [-73.0371, -36.8205]],
  ]],
  [7, "Universidad Santo Tomás", "UST", "universidad", ["santotomas.cl"], [
    ["Sede Concepción", "Concepción", "Avenida Arturo Prat 879", [-73.0616, -36.8267]],
    ["Sede Los Ángeles", "Los Ángeles", null, [-72.3543, -37.472]],
  ]],
  [8, "Duoc UC", "Duoc UC", "instituto_profesional", ["duocuc.cl"], [
    ["Sede San Andrés de Concepción", "Concepción", "Paicaví 3280", [-73.0625, -36.7954]],
    ["Campus Arauco", "Arauco", "Camino a Carampangue 1060", [-73.2945, -37.2475]],
    ["Campus Nacimiento", "Nacimiento", null, [-72.662, -37.511]],
  ]],
  [9, "INACAP", "INACAP", "instituto_profesional", ["inacap.cl", "inacapmail.cl"], [
    ["Sede Concepción-Talcahuano", "Talcahuano", "Autopista Concepción-Talcahuano 7421", [-73.0748, -36.7822]],
    ["Sede San Pedro de la Paz", "San Pedro de la Paz", "Los Mañíos 3925", [-73.131, -36.8517]],
    ["Sede Los Ángeles", "Los Ángeles", "Avenida Ricardo Vicuña 825", [-72.3583, -37.4715]],
  ]],
  [10, "Instituto Profesional Virginio Gómez", "IPVG", "instituto_profesional", ["virginiogomez.cl"], [
    ["Sede Concepción", "Concepción", "Avenida Arturo Prat 196", [-73.0562, -36.8332]],
    ["Sede Los Ángeles", "Los Ángeles", "Arturo Prat 451", [-72.3564, -37.468]],
  ]],
  [11, "Instituto Profesional AIEP", "AIEP", "instituto_profesional", ["aiep.cl"], [
    ["Sede Concepción", "Concepción", "Barros Arana 302", [-73.0546, -36.8286]],
    ["Sede Los Ángeles", "Los Ángeles", "Mendoza 438", [-72.3542, -37.4686]],
  ]],
  // Desde aquí, las que se suman al abrir RoomMatch a toda la región. Sin dominio de correo confirmado,
  // la cuenta se verifica con el comprobante de matrícula
  [12, "Universidad Técnica Federico Santa María", "UTFSM", "universidad", ["usm.cl", "sansano.usm.cl"], [
    ["Sede Concepción", "Hualpén", "Arteaga Alemparte 943", [-73.0842, -36.7854]],
  ]],
  [13, "Universidad de las Américas", "UDLA", "universidad", ["udla.cl", "edu.udla.cl"], [
    ["Campus Chacabuco", "Concepción", "Chacabuco 539", [-73.0488, -36.8308]],
    ["Campus El Boldal", "Concepción", "Avenida Jorge Alessandri 1160", [-73.0581, -36.7833]],
  ]],
  [14, "Universidad Bolivariana", "U. Bolivariana", "universidad", [], [
    ["Sede Concepción", "Concepción", "Diagonal Pedro Aguirre Cerda 1129", [-73.0433, -36.8259]],
    ["Sede Los Ángeles", "Los Ángeles", null, [-72.3571, -37.4802]],
  ]],
  [15, "Instituto Profesional del Valle Central", "IPVC", "instituto_profesional", [], [
    ["Sede Concepción", "Concepción", "Barros Arana 231", [-73.0558, -36.8286]],
    ["Sede Los Ángeles", "Los Ángeles", null, EN_EL_CENTRO],
  ]],
  [16, "Instituto Profesional Diego Portales", "IPDP", "instituto_profesional", [], [
    ["Sede Concepción", "Concepción", "Maipú 301", [-73.0564, -36.8257]],
  ]],
  [17, "Instituto de Estudios Bancarios Guillermo Subercaseaux", "IEB", "instituto_profesional", [], [
    ["Sede Concepción", "Concepción", "Víctor Lamas 1150", [-73.0408, -36.8294]],
  ]],
  [18, "Instituto Profesional IPG", "IPG", "instituto_profesional", [], [
    ["Sede Concepción", "Concepción", null, [-73.0386, -36.823]],
    ["Sede Arauco", "Arauco", "Carlos Condell 212", [-73.3146, -37.2454]],
  ]],
  [19, "Instituto Profesional Providencia", "IPP", "instituto_profesional", [], [
    ["Sede Concepción", "Concepción", "Angol 528", [-73.0552, -36.8283]],
  ]],
  [20, "CFT CEDUC UCN", "CEDUC UCN", "centro_formacion_tecnica", [], [
    ["Sede Hualpén", "Hualpén", "Avenida Cristóbal Colón 7551", [-73.0864, -36.7841]],
    ["Sede Lebu", "Lebu", null, [-73.6594, -37.6114]],
  ]],
  [21, "Centro de Formación Técnica de la Región del Biobío", "CFT Biobío", "centro_formacion_tecnica", [], [
    ["Sede Coronel", "Coronel", null, EN_EL_CENTRO],
    ["Sede Los Álamos", "Los Álamos", null, EN_EL_CENTRO],
    ["Sede San Pedro de la Paz", "San Pedro de la Paz", null, EN_EL_CENTRO],
    ["Sede Tirúa", "Tirúa", null, EN_EL_CENTRO],
  ]],
  [22, "CFT Lota-Arauco", "CFT Lota-Arauco", "centro_formacion_tecnica", [], [
    ["Casa Central (Lota)", "Lota", null, EN_EL_CENTRO],
    ["Sede Cañete", "Cañete", "Arturo Prat 338", [-73.3979, -37.8]],
  ]],
];

function punto(coordenadas) {
  return { type: "Point", coordinates: coordenadas };
}

// Distancia en línea recta entre dos puntos [longitud, latitud] (haversine), en km
function distanciaKm([lon1, lat1], [lon2, lat2]) {
  const rad = (g) => (g * Math.PI) / 180;
  const h = Math.sin(rad(lat2 - lat1) / 2) ** 2
    + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

// El contador queda al día para que lo que se cree después no repita códigos
function contadorAlDia(coleccion, documentos) {
  const mayor = Math.max(...documentos.map((doc) => doc.codigo));
  db.contadores.updateOne({ _id: coleccion }, { $max: { secuencia: mayor } }, { upsert: true });
}

for (const [codigo, nombre, provincia, centro] of COMUNAS) {
  db.comunas.updateOne(
    { codigo },
    { $set: { nombre, region: "Biobío", sector: provincia, provincia: PROVINCIAS[provincia], centro: punto(centro) } },
    { upsert: true }
  );
}
contadorAlDia("comunas", COMUNAS.map(([codigo]) => ({ codigo })));

const comunas = {};
db.comunas.find({}, { nombre: 1, centro: 1 }).forEach((c) => {
  comunas[c.nombre] = c;
});

for (const [codigo, nombre, sigla, tipo, dominios, sedes] of INSTITUCIONES) {
  db.instituciones.updateOne(
    { codigo },
    {
      $set: {
        nombre,
        sigla,
        tipo,
        sedes: sedes.map(([sede, comuna, direccion, coordenadas]) => {
          const ubicacion = coordenadas ?? comunas[comuna].centro.coordinates;
          return {
            nombre: sede,
            comuna_id: comunas[comuna]._id,
            direccion,
            coordenadas: punto(ubicacion),
            // Su comuna y las que tienen el centro a RADIO_CERCANIA_KM o menos de la sede
            comunas_cercanas_ids: Object.values(comunas)
              .filter((c) => c.nombre === comuna || distanciaKm(ubicacion, c.centro.coordinates) <= RADIO_CERCANIA_KM)
              .map((c) => c._id),
            sectores_cercanos: [],
          };
        }),
      },
      $setOnInsert: { activa: true, dominios_correo: dominios },
    },
    { upsert: true }
  );
}
contadorAlDia("instituciones", INSTITUCIONES.map(([codigo]) => ({ codigo })));

print("Datos iniciales listos");
