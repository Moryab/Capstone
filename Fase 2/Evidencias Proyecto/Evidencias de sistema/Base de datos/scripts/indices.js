// Índices definidos en el modelo de datos. Si ya existen con la misma definición, Mongo no hace nada,
// por eso este script corre en cada «docker compose up» (servicio inicializar-bd).
// Si se cambia la definición de un índice que ya existe, hay que borrarlo antes (ver rut_1).

db = db.getSiblingDB(process.env.MONGO_DB || "roommatch");

db.usuarios.createIndex({ correo: 1 }, { unique: true, name: "correo_1" });
// Antes el RUT era opcional y su índice era parcial; ahora se pide en el registro (CA-01.1)
const rut = db.usuarios.getIndexes().find((indice) => indice.name === "rut_1");
if (rut && rut.partialFilterExpression) {
  db.usuarios.dropIndex("rut_1");
}
db.usuarios.createIndex({ rut: 1 }, { unique: true, name: "rut_1" });
// El teléfono no se repite entre cuentas; es parcial porque las cuentas antiguas pueden no tenerlo
db.usuarios.createIndex(
  { "perfil.telefono": 1 },
  { unique: true, partialFilterExpression: { "perfil.telefono": { $type: "string" } }, name: "perfil.telefono_1" }
);

db.comunas.createIndex({ codigo: 1 }, { unique: true, name: "codigo_1" });
db.comunas.createIndex({ centro: "2dsphere" }, { name: "centro_2dsphere" });
db.instituciones.createIndex({ codigo: 1 }, { unique: true, name: "codigo_1" });
db.instituciones.createIndex({ "sedes.coordenadas": "2dsphere" }, { name: "sedes.coordenadas_2dsphere" });
db.carreras.createIndex({ institucion_id: 1, nombre: 1 }, { unique: true, name: "institucion_id_1_nombre_1" });

db.publicaciones.createIndex({ codigo: 1 }, { unique: true, name: "codigo_1" });
db.publicaciones.createIndex({ "ubicacion.coordenadas": "2dsphere" }, { name: "ubicacion.coordenadas_2dsphere" });
db.publicaciones.createIndex(
  { estado: 1, costo_mensual: 1, "ubicacion.comuna_id": 1 },
  { name: "estado_1_costo_mensual_1_ubicacion.comuna_id_1" }
);
// Listado de alojamientos: activos, del más reciente al más antiguo (CA-09.1)
db.publicaciones.createIndex({ estado: 1, fecha_publicacion: -1 }, { name: "estado_1_fecha_publicacion_-1" });

// Cambios del cuestionario de hábitos (HU-13), según el modelo de datos
db.historial_cuestionario.createIndex({ codigo: 1 }, { unique: true, name: "codigo_1" });
db.historial_cuestionario.createIndex({ usuario_id: 1, fecha: -1 }, { name: "usuario_id_1_fecha_-1" });

// Compatibilidad entre pares de estudiantes (HU-14)
db.compatibilidades.createIndex({ codigo: 1 }, { unique: true, name: "codigo_1" });
db.compatibilidades.createIndex(
  { usuario_a_id: 1, usuario_b_id: 1, vigente: 1 },
  { name: "usuario_a_id_1_usuario_b_id_1_vigente_1" }
);
// Para buscar los cálculos donde el usuario quedó como usuario_b (no está en el modelo de datos)
db.compatibilidades.createIndex({ usuario_b_id: 1, vigente: 1 }, { name: "usuario_b_id_1_vigente_1" });

// Propuestas de match (HU-17) y avisos, según el modelo de datos
db.matches.createIndex({ codigo: 1 }, { unique: true, name: "codigo_1" });
db.matches.createIndex({ usuario_a_id: 1, estado: 1 }, { name: "usuario_a_id_1_estado_1" });
db.matches.createIndex({ usuario_b_id: 1, estado: 1 }, { name: "usuario_b_id_1_estado_1" });
db.notificaciones.createIndex({ codigo: 1 }, { unique: true, name: "codigo_1" });
db.notificaciones.createIndex({ usuario_id: 1, leido: 1 }, { name: "usuario_id_1_leido_1" });

// Cada área agrega sus índices solo dentro de su bloque, así no se cruzan los cambios en git

// --- EP-08 · seguimiento post-match (HU-18 a HU-20) ---
// Versiones de los parámetros del algoritmo y revisiones automáticas de sus pesos (modelo de datos).
// En vez del único por «estado» del modelo, solo una versión puede estar activa (las retiradas son varias)
db.parametros_algoritmo.createIndex({ codigo: 1 }, { unique: true, name: "codigo_1" });
db.parametros_algoritmo.createIndex({ version: 1 }, { unique: true, name: "version_1" });
db.parametros_algoritmo.createIndex(
  { estado: 1 },
  { unique: true, partialFilterExpression: { estado: "activa" }, name: "estado_activa_1" }
);
db.ajustes_algoritmo.createIndex({ codigo: 1 }, { unique: true, name: "codigo_1" });
db.ajustes_algoritmo.createIndex({ estado: 1, fecha_creacion: -1 }, { name: "estado_1_fecha_creacion_-1" });
db.ajustes_algoritmo.createIndex({ fecha_creacion: -1 }, { name: "fecha_creacion_-1" });

// --- EP-06 · reportes y moderación (HU-24 a HU-27 y HU-30) ---
db.reportes.createIndex({ codigo: 1 }, { unique: true, name: "codigo_1" });
db.reportes.createIndex({ estado: 1, fecha_reporte: -1 }, { name: "estado_1_fecha_reporte_-1" });
// CA-24.4 y CA-25.4: un reporte abierto por usuario y elemento (no está en el modelo de datos)
db.reportes.createIndex(
  { tipo_elemento: 1, elemento_reportado_id: 1, reportante_id: 1 },
  {
    unique: true,
    partialFilterExpression: { estado: { $in: ["pendiente", "en_revision"] } },
    name: "reporte_abierto_unico",
  }
);
db.acciones_moderacion.createIndex({ codigo: 1 }, { unique: true, name: "codigo_1" });
// Para el historial de acciones de un perfil o una publicación (no está en el modelo de datos)
db.acciones_moderacion.createIndex(
  { objetivo_tipo: 1, objetivo_id: 1, fecha_accion: -1 },
  { name: "objetivo_tipo_1_objetivo_id_1_fecha_accion_-1" }
);

// --- EP-02 · verificación (HU-21 a HU-23) ---
// Solicitudes de verificación (HU-21). El índice por usuario y fecha no está en el modelo de
// datos: sirve para traer la última solicitud del estudiante
db.solicitudes_verificacion.createIndex({ codigo: 1 }, { unique: true, name: "codigo_1" });
db.solicitudes_verificacion.createIndex(
  { usuario_id: 1, fecha_solicitud: -1 },
  { name: "usuario_id_1_fecha_solicitud_-1" }
);

// --- EP-07 · administración (HU-28 y HU-29) ---

// --- Mensajes entre estudiantes (chat) ---
// Una conversación por par: «clave» son los dos ids ordenados
db.conversaciones.createIndex({ clave: 1 }, { unique: true, name: "clave_1" });
db.conversaciones.createIndex(
  { participantes: 1, fecha_actividad: -1 },
  { name: "participantes_1_fecha_actividad_-1" }
);
db.mensajes.createIndex({ conversacion_id: 1, _id: 1 }, { name: "conversacion_id_1__id_1" });
// Para el freno de mensajes por minuto
db.mensajes.createIndex({ autor_id: 1, fecha_envio: -1 }, { name: "autor_id_1_fecha_envio_-1" });

// --- Diseño para una fase futura (el sistema aún no usa estas colecciones) ---
db.estadisticas_match.createIndex({ codigo: 1 }, { unique: true, name: "codigo_1" });
db.estadisticas_match.createIndex(
  { periodo: 1, parametros_version: 1 },
  { unique: true, name: "periodo_1_parametros_version_1" }
);
db.interacciones.createIndex({ codigo: 1 }, { unique: true, name: "codigo_1" });
db.interacciones.createIndex({ usuario_id: 1, fecha: -1 }, { name: "usuario_id_1_fecha_-1" });
db.interacciones.createIndex({ tipo: 1, parametros_version: 1 }, { name: "tipo_1_parametros_version_1" });

print("Índices listos");
