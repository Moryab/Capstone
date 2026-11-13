// Colecciones del modelo de datos con su validador $jsonSchema (servicio inicializar-bd).
// Corre en cada «docker compose up», antes de indices.js: crea las colecciones que falten y, en las
// que ya existen, actualiza el validador sin tocar los datos (nunca se borra nada).
//
// Es el modelo de datos de la plataforma: si la API agrega o cambia un campo, se actualiza su esquema
// aquí (y en el documento del modelo de datos), para que no se separen.

db = db.getSiblingDB(process.env.MONGO_DB || "roommatch");

// «warn»: un documento que no cumple el esquema se guarda igual y Mongo lo anota en su registro
// (docker compose logs mongo, buscar "Document would fail validation").
// «error»: Mongo lo rechaza y la API responde con un error. Pasar a «error» cuando se hayan probado
// todos los flujos de la plataforma sin advertencias.
const ACCION_VALIDACION = "warn";

const existentes = db.getCollectionNames();

function aplicar(nombre, opciones) {
  const reglas = { validator: opciones.validator, validationLevel: "strict", validationAction: ACCION_VALIDACION };
  if (existentes.includes(nombre)) {
    db.runCommand({ collMod: nombre, ...reglas });
  } else {
    db.createCollection(nombre, reglas);
  }
}

// ============================================================
// COMUNAS
// ============================================================
aplicar("comunas", {
  validator: {
    "$jsonSchema": {
      bsonType: "object",
      required: ["_id","codigo","nombre","region","sector"],
      properties: {
        _id: {"bsonType":"objectId"},
        codigo: {"bsonType":"int"},
        nombre: {"bsonType":"string"},
        region: {"bsonType":"string"},
        centro: {
          bsonType: "object",
          required: ["type","coordinates"],
          properties: {
            type: {"enum":["Point"]},
            coordinates: {"bsonType":"array","minItems":2,"maxItems":2,"items":{"bsonType":"number"}}
          }
        },
        // Provincia de la comuna: «concepcion», «arauco» o «biobio» (agrupa el filtro de búsqueda)
        sector: {"bsonType":"string"},
        provincia: {"bsonType":"string"}
      }
    }
  }
});

// ============================================================
// INSTITUCIONES
// ============================================================
aplicar("instituciones", {
  validator: {
    "$jsonSchema": {
      bsonType: "object",
      required: ["_id","codigo","nombre","sigla","tipo","dominios_correo","activa"],
      properties: {
        _id: {"bsonType":"objectId"},
        codigo: {"bsonType":"int"},
        nombre: {"bsonType":"string"},
        sigla: {"bsonType":"string"},
        tipo: {
          bsonType: "string",
          enum: ["universidad","instituto_profesional","centro_formacion_tecnica"]
        },
        dominios_correo: {"bsonType":"array","items":{"bsonType":"string"}},
        activa: {"bsonType":"bool"},
        sedes: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["nombre","comuna_id","comunas_cercanas_ids"],
            properties: {
              nombre: {"bsonType":"string"},
              comuna_id: {"bsonType":"objectId"},
              direccion: {"bsonType":["string","null"]},
              coordenadas: {
                bsonType: "object",
                required: ["type","coordinates"],
                properties: {
                  type: {"enum":["Point"]},
                  coordinates: {"bsonType":"array","minItems":2,"maxItems":2,"items":{"bsonType":"number"}}
                }
              },
              comunas_cercanas_ids: {"bsonType":"array","items":{"bsonType":"objectId"}},
              sectores_cercanos: {"bsonType":"array","items":{"bsonType":"string"}}
            }
          }
        }
      }
    }
  }
});

// ============================================================
// CARRERAS
// Carreras de pregrado de cada institución (scripts/carreras.js, desde el SIES): el estudiante
// elige la suya de una lista según su institución, para que no se escriba mal
// ============================================================
aplicar("carreras", {
  validator: {
    "$jsonSchema": {
      bsonType: "object",
      required: ["_id","institucion_id","nombre","activa"],
      properties: {
        _id: {"bsonType":"objectId"},
        institucion_id: {"bsonType":"objectId"},
        nombre: {"bsonType":"string"},
        area: {"bsonType":["string","null"]},
        fuente: {"bsonType":"string"},
        activa: {"bsonType":"bool"}
      }
    }
  }
});

// ============================================================
// USUARIOS
// ============================================================
aplicar("usuarios", {
  validator: {
    "$jsonSchema": {
      bsonType: "object",
      required: [
        "_id",
        "rut",
        "nombre",
        "ap_paterno",
        "correo",
        "password",
        "fecha_registro",
        "rol",
        "estado_cuenta",
        "correo_verificado",
        "fecha_actualizacion"
      ],
      // El administrador no tiene datos personales de estudiante (lo crea la API al iniciar)
      anyOf: [
        {
          properties: {"rol":{"enum":["estudiante"]}},
          required: [
            "ap_materno",
            "fecha_nac",
            "genero",
            "advertencias_recibidas",
            "match_activo_id",
            "buscando_alojamiento"
          ]
        },
        {properties: {"rol":{"enum":["administrador"]}}}
      ],
      properties: {
        _id: {"bsonType":"objectId"},
        rut: {"bsonType":"string"},
        nombre: {"bsonType":"string"},
        ap_paterno: {"bsonType":"string"},
        ap_materno: {"bsonType":"string"},
        fecha_nac: {"bsonType":"date"},
        genero: {"bsonType":"string","enum":["femenino","masculino","no_binario"]},
        correo: {"bsonType":"string"},
        password: {"bsonType":"string"},
        fecha_registro: {"bsonType":"date"},
        rol: {"bsonType":"string","enum":["estudiante","administrador"]},
        estado_cuenta: {"bsonType":"string","enum":["activa","suspendida","eliminada"]},
        advertencias_recibidas: {"bsonType":"int"},
        match_activo_id: {"bsonType":["objectId","null"]},
        correo_verificado: {"bsonType":"bool"},
        fecha_actualizacion: {"bsonType":"date"},
        modo: {"bsonType":["string","null"],"enum":["buscador","oferente",null]},
        fecha_cambio_modo: {"bsonType":["date","null"]},
        buscando_alojamiento: {"bsonType":"bool"},
        // Oferente: false si pausó las propuestas aunque le queden cupos (sin el campo, las recibe)
        recibiendo_propuestas: {"bsonType":"bool"},
        eliminacion: {
          bsonType: "object",
          properties: {
            fecha: {"bsonType":"date"},
            admin_id: {"bsonType":"objectId"},
            accion_id: {"bsonType":"objectId"},
            motivo: {"bsonType":"string"},
            fecha_nuevo_registro: {"bsonType":["date","null"]}
          }
        },
        verificacion: {
          bsonType: "object",
          required: ["estado"],
          properties: {
            estado: {
              bsonType: "string",
              enum: ["no_verificado","pendiente","verificado","rechazado","revocado"]
            },
            metodo: {"bsonType":["string","null"],"enum":["correo_institucional",null]},
            institucion_id: {"bsonType":["objectId","null"]},
            fecha_verificacion: {"bsonType":["date","null"]},
            fecha_revocacion: {"bsonType":["date","null"]},
            motivo_revocacion: {"bsonType":["string","null"]},
            fecha_restauracion: {"bsonType":["date","null"]},
            admin_id: {"bsonType":["objectId","null"]},
            solicitud_id: {"bsonType":["objectId","null"]}
          }
        },
        // null al reactivar la cuenta
        suspension: {
          bsonType: ["object","null"],
          properties: {
            motivo: {"bsonType":["string","null"]},
            fecha: {"bsonType":["date","null"]},
            admin_id: {"bsonType":["objectId","null"]},
            accion_id: {"bsonType":["objectId","null"]},
            estado_previo: {"bsonType":["string","null"]}
          }
        },
        // Al registrarse solo se guarda el teléfono; el resto se completa después y
        // campos_faltantes indica lo que falta (CA-03.5)
        perfil: {
          bsonType: "object",
          required: ["perfil_completo","campos_faltantes"],
          properties: {
            institucion_id: {"bsonType":"objectId"},
            carrera: {"bsonType":"string"},
            // true si no estaba en la lista y la escribió a mano («No encuentro mi carrera»)
            carrera_otra: {"bsonType":"bool"},
            anio_ingreso: {"bsonType":["int","null"]},
            sede: {"bsonType":"string"},
            direccion: {"bsonType":"string"},
            ciudad_origen: {"bsonType":"string"},
            region_origen: {"bsonType":"string"},
            descripcion: {"bsonType":["string","null"]},
            foto_url: {"bsonType":["string","null"]},
            perfil_completo: {"bsonType":"bool"},
            campos_faltantes: {"bsonType":"array","items":{"bsonType":"string"}},
            telefono: {"bsonType":"string"}
          }
        },
        cuestionario: {
          bsonType: "object",
          required: [
            "horario_sueno",
            "horario_estudio",
            "orden_limpieza",
            "ruido",
            "visitas",
            "fumar",
            "mascotas",
            "completo",
            "fecha_respuesta",
            "fecha_actualizacion"
          ],
          // Mientras se responde por primera vez se autoguarda con completo=false: las preguntas
          // sin responder quedan en null y fecha_respuesta también
          properties: {
            horario_sueno: {"bsonType":["string","null"],"enum":["temprano","intermedio","tarde",null]},
            horario_estudio: {"bsonType":["string","null"],"enum":["manana","tarde","noche","variable",null]},
            orden_limpieza: {"bsonType":["string","null"],"enum":["alto","medio","bajo",null]},
            ruido: {"bsonType":["string","null"],"enum":["bajo","moderado","alto",null]},
            visitas: {"bsonType":["string","null"],"enum":["nunca","ocasional","frecuente",null]},
            fumar: {"bsonType":["string","null"],"enum":["no_fuma_no_tolera","no_fuma_tolera","fuma",null]},
            mascotas: {"bsonType":["string","null"],"enum":["no_tiene_no_tolera","no_tiene_tolera","tiene",null]},
            importancia: {
              bsonType: "array",
              items: {
                bsonType: "object",
                required: ["categoria","nivel"],
                properties: {
                  categoria: {
                    bsonType: "string",
                    enum: [
                      "horario_sueno",
                      "horario_estudio",
                      "orden_limpieza",
                      "ruido",
                      "visitas",
                      "fumar",
                      "mascotas"
                    ]
                  },
                  nivel: {"bsonType":"string","enum":["imprescindible","importante","flexible"]}
                }
              }
            },
            completo: {"bsonType":"bool"},
            campos_faltantes: {"bsonType":"array","items":{"bsonType":"string"}},
            fecha_respuesta: {"bsonType":["date","null"]},
            fecha_actualizacion: {"bsonType":"date"}
          }
        },
        ajuste_recomendacion: {
          bsonType: "object",
          properties: {
            // Todas las razones de una evaluación menos «otra»: gastos y comunicación quedan
            // registradas aunque no cambian el cálculo
            categorias_problema: {
              bsonType: "array",
              items: {
                bsonType: "string",
                enum: [
                  "horario_sueno",
                  "horario_estudio",
                  "orden_limpieza",
                  "ruido",
                  "visitas",
                  "fumar",
                  "mascotas",
                  "gastos",
                  "comunicacion"
                ]
              }
            },
            decisiones_registradas: {"bsonType":["int","null"]},
            aprendizaje: {
              bsonType: "array",
              items: {
                bsonType: "object",
                required: ["categoria","peso_personal","confianza"],
                properties: {
                  categoria: {
                    bsonType: "string",
                    enum: [
                      "horario_sueno",
                      "horario_estudio",
                      "orden_limpieza",
                      "ruido",
                      "visitas",
                      "fumar",
                      "mascotas"
                    ]
                  },
                  peso_personal: {"bsonType":"number"},
                  veces_cedio: {"bsonType":"int"},
                  veces_rechazo: {"bsonType":"int"},
                  veces_problema_convivencia: {"bsonType":"int"},
                  tendencia: {
                    bsonType: ["string","null"],
                    enum: ["mas_tolerante","igual","menos_tolerante",null]
                  },
                  confianza: {"bsonType":"number"},
                  sugerir_actualizacion: {"bsonType":"bool"},
                  fecha_actualizacion: {"bsonType":["date","null"]}
                }
              }
            },
            fecha_actualizacion: {"bsonType":["date","null"]}
          }
        },
        preferencias_busqueda: {
          bsonType: "object",
          properties: {
            costo_min: {"bsonType":["int","null"]},
            costo_max: {"bsonType":["int","null"]},
            comunas_ids: {"bsonType":"array","items":{"bsonType":"objectId"}},
            tipo_alojamiento: {"bsonType":["string","null"],"enum":["habitacion","departamento",null]},
            requiere_mascotas: {"bsonType":["bool","null"]},
            requiere_fumar: {"bsonType":["bool","null"]},
            requiere_visitas: {"bsonType":["bool","null"]},
            gastos_incluidos: {"bsonType":["bool","null"]},
            amoblado: {"bsonType":["bool","null"]},
            estacionamiento: {"bsonType":["bool","null"]}
          }
        },
        seguridad: {
          bsonType: "object",
          required: ["intentos_fallidos","token_version"],
          properties: {
            intentos_fallidos: {"bsonType":"int"},
            bloqueado_hasta: {"bsonType":["date","null"]},
            token_version: {"bsonType":"int"},
            ultimo_inicio_sesion: {"bsonType":["date","null"]},
            ultima_actividad: {"bsonType":["date","null"]}
          }
        },
        // Código pendiente de «¿Olvidaste tu contraseña?» (solo su hash). Se borra al cambiarla
        recuperacion: {
          bsonType: "object",
          required: ["codigo_hash","expira","intentos","fecha_envio"],
          properties: {
            codigo_hash: {"bsonType":"string"},
            expira: {"bsonType":"date"},
            intentos: {"bsonType":"int"},
            fecha_envio: {"bsonType":"date"}
          }
        },
        // Código pendiente para verificar el correo (solo su hash). Se borra al verificarlo
        verificacion_correo: {
          bsonType: "object",
          required: ["codigo_hash","expira","intentos","fecha_envio"],
          properties: {
            codigo_hash: {"bsonType":"string"},
            expira: {"bsonType":"date"},
            intentos: {"bsonType":"int"},
            fecha_envio: {"bsonType":"date"}
          }
        }
      }
    }
  }
});

// ============================================================
// SOLICITUDES_VERIFICACION
// ============================================================
aplicar("solicitudes_verificacion", {
  validator: {
    "$jsonSchema": {
      bsonType: "object",
      required: ["_id","codigo","usuario_id","institucion_id","tipo_comprobante","fecha_solicitud","estado"],
      properties: {
        _id: {"bsonType":"objectId"},
        codigo: {"bsonType":"int"},
        usuario_id: {"bsonType":"objectId"},
        institucion_id: {"bsonType":"objectId"},
        admin_revisor_id: {"bsonType":["objectId","null"]},
        tipo_comprobante: {
          bsonType: "string",
          enum: ["certificado_alumno_regular","comprobante_matricula","credencial_estudiantil","carta_aceptacion"]
        },
        situacion: {"bsonType":"string","enum":["matriculado","seleccionado"]},
        vigencia_hasta: {"bsonType":["date","null"]},
        fecha_solicitud: {"bsonType":"date"},
        fecha_revision: {"bsonType":["date","null"]},
        estado: {"bsonType":"string","enum":["pendiente","en_revision","aprobada","rechazada"]},
        motivo_rechazo: {"bsonType":["string","null"]},
        observaciones: {"bsonType":["string","null"]},
        // Las revocaciones anteriores a guardarse aquí se copian desde el usuario y pueden venir incompletas
        revocacion: {
          bsonType: "object",
          properties: {
            fecha: {"bsonType":["date","null"]},
            motivo: {"bsonType":["string","null"]},
            admin_id: {"bsonType":["objectId","null"]}
          }
        },
        archivo: {
          bsonType: "object",
          required: ["ruta","nombre_original","formato","tamano_bytes"],
          properties: {
            ruta: {"bsonType":"string"},
            nombre_original: {"bsonType":"string"},
            formato: {"bsonType":"string","enum":["pdf","jpg","png"]},
            tamano_bytes: {"bsonType":"int"},
            hash_sha256: {"bsonType":["string","null"]}
          }
        }
      }
    }
  }
});

// ============================================================
// PUBLICACIONES
// ============================================================
aplicar("publicaciones", {
  validator: {
    "$jsonSchema": {
      bsonType: "object",
      required: [
        "_id",
        "codigo",
        "oferente_id",
        "tipo",
        "titulo",
        "cupos_totales",
        "cupos_disponibles",
        "costo_mensual",
        "estado",
        "fecha_publicacion",
        "cantidad_reportes",
        "cantidad_reportes_pendiente"
      ],
      properties: {
        _id: {"bsonType":"objectId"},
        codigo: {"bsonType":"int"},
        oferente_id: {"bsonType":"objectId"},
        tipo: {"bsonType":"string","enum":["habitacion","departamento"]},
        titulo: {"bsonType":"string"},
        descripcion: {"bsonType":["string","null"]},
        cupos_totales: {"bsonType":"int"},
        cupos_disponibles: {"bsonType":"int"},
        costo_mensual: {"bsonType":"int"},
        genero_preferido: {"bsonType":["string","null"],"enum":["femenino","masculino","indiferente",null]},
        estado: {"bsonType":"string","enum":["activa","pausada","completa","suspendida","eliminada"]},
        fecha_publicacion: {"bsonType":"date"},
        fecha_ultima_modificacion: {"bsonType":["date","null"]},
        fecha_eliminacion: {"bsonType":["date","null"]},
        eliminada_por: {"bsonType":["string","null"],"enum":["oferente","administrador",null]},
        cantidad_reportes: {"bsonType":"int"},
        cantidad_reportes_pendiente: {"bsonType":"int"},
        ubicacion: {
          bsonType: "object",
          required: ["comuna_id","comuna_nombre","sector"],
          properties: {
            comuna_id: {"bsonType":"objectId"},
            comuna_nombre: {"bsonType":"string"},
            sector: {"bsonType":"string"},
            direccion_referencia: {"bsonType":["string","null"]},
            coordenadas: {
              bsonType: "object",
              required: ["type","coordinates"],
              properties: {
                type: {"enum":["Point"]},
                coordinates: {"bsonType":"array","minItems":2,"maxItems":2,"items":{"bsonType":"number"}}
              }
            }
          }
        },
        gastos: {
          bsonType: "object",
          required: ["agua","luz","gas","internet","todos_incluidos"],
          properties: {
            agua: {
              bsonType: "object",
              required: ["incluido"],
              properties: {"incluido":{"bsonType":"bool"},"monto_estimado":{"bsonType":["int","null"]}}
            },
            luz: {
              bsonType: "object",
              required: ["incluido"],
              properties: {"incluido":{"bsonType":"bool"},"monto_estimado":{"bsonType":["int","null"]}}
            },
            gas: {
              bsonType: "object",
              required: ["incluido"],
              properties: {"incluido":{"bsonType":"bool"},"monto_estimado":{"bsonType":["int","null"]}}
            },
            internet: {
              bsonType: "object",
              required: ["incluido"],
              properties: {"incluido":{"bsonType":"bool"},"monto_estimado":{"bsonType":["int","null"]}}
            },
            todos_incluidos: {"bsonType":"bool"}
          }
        },
        reglas: {
          bsonType: "object",
          required: ["permite_fumar","permite_mascotas","permite_visitas","horario_silencio"],
          properties: {
            permite_fumar: {"bsonType":"bool"},
            permite_mascotas: {"bsonType":"bool"},
            permite_visitas: {"bsonType":"bool"},
            horario_silencio: {
              bsonType: "object",
              required: ["aplica"],
              properties: {
                aplica: {"bsonType":"bool"},
                desde: {"bsonType":["string","null"]},
                hasta: {"bsonType":["string","null"]}
              }
            },
            reglas_adicionales: {"bsonType":["string","null"]}
          }
        },
        caracteristicas: {
          bsonType: "object",
          properties: {
            amoblado: {"bsonType":["bool","null"]},
            banio_privado: {"bsonType":["bool","null"]},
            estacionamiento: {"bsonType":["bool","null"]}
          }
        },
        fotos: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["url","formato","tamano_bytes","es_principal","orden","fecha_subida"],
            properties: {
              url: {"bsonType":"string"},
              formato: {"bsonType":"string","enum":["jpg","png","webp"]},
              tamano_bytes: {"bsonType":"int"},
              es_principal: {"bsonType":"bool"},
              orden: {"bsonType":"int"},
              fecha_subida: {"bsonType":"date"}
            }
          }
        },
        // null al restaurar la publicación o reactivar la cuenta de su dueño
        moderacion: {
          bsonType: ["object","null"],
          properties: {
            ultima_accion_id: {"bsonType":["objectId","null"]},
            motivo: {"bsonType":["string","null"]},
            estado_previo: {"bsonType":["string","null"]},
            fecha: {"bsonType":["date","null"]}
          }
        }
      }
    }
  }
});

// ============================================================
// COMPATIBILIDADES
// ============================================================
aplicar("compatibilidades", {
  validator: {
    "$jsonSchema": {
      bsonType: "object",
      required: [
        "_id",
        "codigo",
        "usuario_a_id",
        "usuario_b_id",
        "porcentaje_base",
        "porcentaje",
        "nivel",
        "descartado",
        "categorias_coincidentes",
        "categorias_diferentes",
        "parametros_version",
        "vigente",
        "fecha_calculo"
      ],
      properties: {
        _id: {"bsonType":"objectId"},
        codigo: {"bsonType":"int"},
        usuario_a_id: {"bsonType":"objectId"},
        usuario_b_id: {"bsonType":"objectId"},
        porcentaje_base: {"bsonType":"number"},
        porcentaje: {"bsonType":"number"},
        nivel: {"bsonType":"string","enum":["alta","media","baja"]},
        descartado: {"bsonType":"bool"},
        categoria_descarte: {
          bsonType: ["string","null"],
          enum: [
            "horario_sueno",
            "horario_estudio",
            "orden_limpieza",
            "ruido",
            "visitas",
            "fumar",
            "mascotas",
            null
          ]
        },
        categorias_coincidentes: {
          bsonType: "array",
          items: {
            bsonType: "string",
            enum: [
              "horario_sueno",
              "horario_estudio",
              "orden_limpieza",
              "ruido",
              "visitas",
              "fumar",
              "mascotas"
            ]
          }
        },
        categorias_diferentes: {
          bsonType: "array",
          items: {
            bsonType: "string",
            enum: [
              "horario_sueno",
              "horario_estudio",
              "orden_limpieza",
              "ruido",
              "visitas",
              "fumar",
              "mascotas"
            ]
          }
        },
        parametros_version: {"bsonType":"string"},
        vigente: {"bsonType":"bool"},
        fecha_calculo: {"bsonType":"date"},
        detalle: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: [
              "categoria",
              "respuesta_a",
              "respuesta_b",
              "coincide",
              "distancia",
              "puntaje",
              "peso_base",
              "peso"
            ],
            properties: {
              categoria: {
                bsonType: "string",
                enum: [
                  "horario_sueno",
                  "horario_estudio",
                  "orden_limpieza",
                  "ruido",
                  "visitas",
                  "fumar",
                  "mascotas"
                ]
              },
              respuesta_a: {"bsonType":"string"},
              respuesta_b: {"bsonType":"string"},
              importancia_a: {"bsonType":["string","null"],"enum":["imprescindible","importante","flexible",null]},
              importancia_b: {"bsonType":["string","null"],"enum":["imprescindible","importante","flexible",null]},
              coincide: {"bsonType":"bool"},
              distancia: {"bsonType":"int"},
              puntaje: {"bsonType":"number"},
              peso_base: {"bsonType":"number"},
              ajuste_personal: {"bsonType":["number","null"]},
              peso: {"bsonType":"number"},
              conflicto_imprescindible: {"bsonType":"bool"}
            }
          }
        }
      }
    }
  }
});

// ============================================================
// MATCHES
// ============================================================
aplicar("matches", {
  validator: {
    "$jsonSchema": {
      bsonType: "object",
      required: [
        "_id",
        "codigo",
        "usuario_a_id",
        "usuario_b_id",
        "compatibilidad_id",
        "pctj_compatibilidad",
        "publicacion_id",
        "estado",
        "resultado",
        "fecha_sugerencia",
        "parametros_version"
      ],
      properties: {
        _id: {"bsonType":"objectId"},
        codigo: {"bsonType":"int"},
        usuario_a_id: {"bsonType":"objectId"},
        usuario_b_id: {"bsonType":"objectId"},
        compatibilidad_id: {"bsonType":"objectId"},
        pctj_compatibilidad: {"bsonType":"number"},
        publicacion_id: {"bsonType":"objectId"},
        estado: {
          bsonType: "string",
          enum: ["sugerido","pendiente","confirmado","rechazado","expirado","finalizado"]
        },
        resultado: {"bsonType":"string","enum":["pendiente","exitoso","no_exitoso","sin_convivencia"]},
        fecha_sugerencia: {"bsonType":"date"},
        fecha_respuesta: {"bsonType":["date","null"]},
        fecha_confirmacion: {"bsonType":["date","null"]},
        fecha_inicio_convivencia: {"bsonType":["date","null"]},
        fecha_habilitacion_evaluacion: {"bsonType":["date","null"]},
        fecha_fin_convivencia: {"bsonType":["date","null"]},
        motivo_fin: {
          bsonType: ["string","null"],
          enum: ["incompatibilidad","termino_arriendo","cambio_ciudad","fin_estudios","otro",null]
        },
        duracion_convivencia_dias: {"bsonType":["int","null"]},
        fin_por_cuenta_eliminada: {"bsonType":["bool","null"]},
        parametros_version: {"bsonType":"string"},
        respuesta_a: {
          bsonType: "object",
          required: ["estado"],
          properties: {
            estado: {"bsonType":"string","enum":["pendiente","aceptado","rechazado"]},
            fecha_respuesta: {"bsonType":["date","null"]},
            motivo_rechazo: {
              bsonType: ["string","null"],
              enum: [
                "baja_compatibilidad",
                "alojamiento_no_conviene",
                "ya_encontro_alojamiento",
                "otro",
                null
              ]
            }
          }
        },
        respuesta_b: {
          bsonType: "object",
          required: ["estado"],
          properties: {
            estado: {"bsonType":"string","enum":["pendiente","aceptado","rechazado"]},
            fecha_respuesta: {"bsonType":["date","null"]},
            motivo_rechazo: {
              bsonType: ["string","null"],
              enum: [
                "baja_compatibilidad",
                "alojamiento_no_conviene",
                "ya_encontro_alojamiento",
                "otro",
                null
              ]
            }
          }
        },
        evaluacion: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["evaluador_id","evaluado_id","momento","funciona","calificacion","fecha_eval"],
            properties: {
              evaluador_id: {"bsonType":"objectId"},
              evaluado_id: {"bsonType":"objectId"},
              momento: {"bsonType":"string","enum":["mes_1","cierre"]},
              funciona: {"bsonType":"bool"},
              // La evaluación de «cierre» (al terminar la convivencia) no lleva calificación
              calificacion: {"bsonType":["int","null"]},
              comentario: {"bsonType":["string","null"]},
              razones: {
                bsonType: "array",
                items: {
                  bsonType: "object",
                  required: ["razon","gravedad"],
                  properties: {
                    razon: {
                      bsonType: "string",
                      enum: [
                        "horario_sueno",
                        "horario_estudio",
                        "orden_limpieza",
                        "ruido",
                        "visitas",
                        "fumar",
                        "mascotas",
                        "gastos",
                        "comunicacion",
                        "otra"
                      ]
                    },
                    gravedad: {"bsonType":"string","enum":["leve","moderada","grave"]}
                  }
                }
              },
              razon_otra_detalle: {"bsonType":["string","null"]},
              fecha_eval: {"bsonType":"date"}
            }
          }
        },
        seguimiento: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["usuario_id","momento","evaluado"],
            properties: {
              usuario_id: {"bsonType":"objectId"},
              momento: {"bsonType":"string","enum":["mes_1","cierre"]},
              fecha_aviso: {"bsonType":["date","null"]},
              fecha_recordatorio: {"bsonType":["date","null"]},
              evaluado: {"bsonType":"bool"}
            }
          }
        }
      }
    }
  }
});

// ============================================================
// REPORTES
// ============================================================
aplicar("reportes", {
  validator: {
    "$jsonSchema": {
      bsonType: "object",
      required: [
        "_id",
        "codigo",
        "tipo_elemento",
        "elemento_reportado_id",
        "usuario_reportado",
        "reportante_id",
        "estado",
        "fecha_reporte",
        "reportante_notificado",
        "motivo"
      ],
      properties: {
        _id: {"bsonType":"objectId"},
        codigo: {"bsonType":"int"},
        tipo_elemento: {"bsonType":"string","enum":["usuario","publicacion"]},
        elemento_reportado_id: {"bsonType":"objectId"},
        usuario_reportado: {"bsonType":"objectId"},
        reportante_id: {"bsonType":"objectId"},
        descripcion: {"bsonType":["string","null"]},
        estado: {"bsonType":"string","enum":["pendiente","en_revision","resuelto"]},
        fecha_reporte: {"bsonType":"date"},
        admin_revisor_id: {"bsonType":["objectId","null"]},
        fecha_toma_revision: {"bsonType":["date","null"]},
        fecha_resolucion: {"bsonType":["date","null"]},
        resolucion: {
          bsonType: ["string","null"],
          enum: [
            "sin_accion",
            "advertencia",
            "cuenta_suspendida",
            "verificacion_revocada",
            "publicacion_suspendida",
            "publicacion_eliminada",
            null
          ]
        },
        accion_moderacion_id: {"bsonType":["objectId","null"]},
        reportante_notificado: {"bsonType":"bool"},
        motivo: {
          bsonType: "string",
          enum: [
            "perfil_falso",
            "comportamiento_inapropiado",
            "informacion_falsa",
            "publicacion_enganosa",
            "estafa",
            "contenido_inapropiado",
            "fotos_no_corresponden",
            "otro"
          ]
        }
      }
    }
  }
});

// ============================================================
// ACCIONES_MODERACION
// ============================================================
aplicar("acciones_moderacion", {
  validator: {
    "$jsonSchema": {
      bsonType: "object",
      required: [
        "_id",
        "codigo",
        "admin_id",
        "objetivo_tipo",
        "objetivo_id",
        "accion",
        "justificacion",
        "estado_anterior",
        "estado_nuevo",
        "afectado_notificado",
        "fecha_accion"
      ],
      properties: {
        _id: {"bsonType":"objectId"},
        codigo: {"bsonType":"int"},
        admin_id: {"bsonType":"objectId"},
        objetivo_tipo: {"bsonType":"string","enum":["usuario","publicacion"]},
        objetivo_id: {"bsonType":"objectId"},
        accion: {
          bsonType: "string",
          enum: [
            "desestimar_reporte",
            "advertir_usuario",
            "suspender_usuario",
            "reactivar_usuario",
            "eliminar_usuario",
            "revocar_verificacion",
            "cambiar_rol",
            "suspender_publicacion",
            "eliminar_publicacion",
            "reactivar_publicacion"
          ]
        },
        motivo: {
          bsonType: ["string","null"],
          enum: [
            "informacion_falsa",
            "contenido_inapropiado",
            "precio_distinto",
            "publicacion_duplicada",
            "otro",
            null
          ]
        },
        justificacion: {"bsonType":"string"},
        reportes_ids: {"bsonType":"array","items":{"bsonType":"objectId"}},
        // En «cambiar_rol» son el rol buscador/oferente, y el anterior puede no existir
        estado_anterior: {"bsonType":["string","null"]},
        estado_nuevo: {"bsonType":["string","null"]},
        revierte_accion_id: {"bsonType":["objectId","null"]},
        afectado_notificado: {"bsonType":"bool"},
        fecha_accion: {"bsonType":"date"}
      }
    }
  }
});

// ============================================================
// NOTIFICACIONES
// ============================================================
aplicar("notificaciones", {
  validator: {
    "$jsonSchema": {
      bsonType: "object",
      required: [
        "_id",
        "codigo",
        "usuario_id",
        "tipo",
        "titulo",
        "mensaje",
        "leido",
        "estado_envio",
        "fecha_notificacion"
      ],
      properties: {
        _id: {"bsonType":"objectId"},
        codigo: {"bsonType":"int"},
        usuario_id: {"bsonType":"objectId"},
        tipo: {
          bsonType: "string",
          enum: [
            "verificacion_correo",
            "verificacion_estudiante",
            "nuevo_match",
            "respuesta_match",
            "match_confirmado",
            "evaluacion_disponible",
            "recordatorio_evaluacion",
            "reporte_resuelto",
            "accion_moderacion",
            "recuperacion_password",
            "confirmar_preferencia"
          ]
        },
        titulo: {"bsonType":"string"},
        mensaje: {"bsonType":"string"},
        leido: {"bsonType":"bool"},
        fecha_lectura: {"bsonType":["date","null"]},
        estado_envio: {"bsonType":"string","enum":["pendiente","enviado","fallido"]},
        fecha_programada: {"bsonType":["date","null"]},
        fecha_notificacion: {"bsonType":"date"},
        referencia: {
          bsonType: "object",
          required: ["entidad_id"],
          properties: {
            // Ambos en null cuando el aviso no lleva a nada (por ejemplo, «Revisamos tu reporte»)
            tipo_entidad: {"bsonType":["string","null"],"enum":["usuario","publicacion","match",null]},
            entidad_id: {"bsonType":["objectId","null"]}
          }
        }
      }
    }
  }
});

// ============================================================
// PARAMETROS_ALGORITMO
// ============================================================
aplicar("parametros_algoritmo", {
  validator: {
    "$jsonSchema": {
      bsonType: "object",
      required: [
        "_id",
        "codigo",
        "version",
        "estado",
        "pesos_base",
        "pesos_categoria",
        "multiplicador_imprescindible",
        "incremento_por_razon",
        "ajuste_personal_max",
        "fecha_vigencia_desde"
      ],
      properties: {
        _id: {"bsonType":"objectId"},
        codigo: {"bsonType":"int"},
        version: {"bsonType":"string"},
        estado: {"bsonType":"string","enum":["borrador","en_validacion","activa","retirada"]},
        version_anterior: {"bsonType":["string","null"]},
        ajuste_id: {"bsonType":["objectId","null"]},
        pesos_base: {"bsonType":"object"},
        pesos_categoria: {"bsonType":"object"},
        multiplicador_imprescindible: {"bsonType":"number"},
        incremento_por_razon: {"bsonType":"number"},
        minimo_casos_ajuste: {"bsonType":"int"},
        minimo_decisiones_personal: {"bsonType":"int"},
        ajuste_personal_max: {"bsonType":"number"},
        creado_por: {"bsonType":["objectId","null"]},
        notas: {"bsonType":["string","null"]},
        fecha_vigencia_desde: {"bsonType":"date"},
        fecha_vigencia_hasta: {"bsonType":["date","null"]},
        umbrales: {
          bsonType: "object",
          required: ["alta","media"],
          properties: {"alta":{"bsonType":"int"},"media":{"bsonType":"int"}}
        },
        metas: {
          bsonType: "object",
          properties: {
            match_exitoso: {"bsonType":"number"},
            tasa_respuesta: {"bsonType":"number"},
            tasa_reportes_max: {"bsonType":"number"}
          }
        }
      }
    }
  }
});

// ============================================================
// ESTADISTICAS_MATCH
// Diseño para una fase futura; el sistema aún no la usa.
// ============================================================
aplicar("estadisticas_match", {
  validator: {
    "$jsonSchema": {
      bsonType: "object",
      description: "Diseño para una fase futura; el sistema aún no la usa.",
      required: [
        "_id",
        "codigo",
        "periodo",
        "matches_generados",
        "matches_confirmados",
        "matches_con_convivencia",
        "evaluaciones_esperadas",
        "evaluaciones_respondidas",
        "exitosos",
        "no_exitosos",
        "publicaciones_activas",
        "publicaciones_reportadas",
        "reportes_publicaciones",
        "tasa_convivencia",
        "tasa_respuesta",
        "tasa_reportes",
        "tasa_exito",
        "parametros_version",
        "fecha_generacion"
      ],
      properties: {
        _id: {"bsonType":"objectId"},
        codigo: {"bsonType":"int"},
        periodo: {"bsonType":"string"},
        matches_generados: {"bsonType":"int"},
        matches_confirmados: {"bsonType":"int"},
        matches_con_convivencia: {"bsonType":"int"},
        evaluaciones_esperadas: {"bsonType":"int"},
        evaluaciones_respondidas: {"bsonType":"int"},
        exitosos: {"bsonType":"int"},
        no_exitosos: {"bsonType":"int"},
        publicaciones_activas: {"bsonType":"int"},
        publicaciones_reportadas: {"bsonType":"int"},
        reportes_publicaciones: {"bsonType":"int"},
        tasa_convivencia: {"bsonType":"number"},
        tasa_respuesta: {"bsonType":"number"},
        tasa_reportes: {"bsonType":"number"},
        tasa_exito: {"bsonType":"number"},
        parametros_version: {"bsonType":"string"},
        fecha_generacion: {"bsonType":"date"},
        razones_frecuencia: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["razon","cantidad"],
            properties: {
              razon: {
                bsonType: "string",
                enum: [
                  "horario_sueno",
                  "horario_estudio",
                  "orden_limpieza",
                  "ruido",
                  "visitas",
                  "fumar",
                  "mascotas",
                  "gastos",
                  "comunicacion",
                  "otra"
                ]
              },
              cantidad: {"bsonType":"int"}
            }
          }
        },
        analisis_categorias: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: [
              "categoria",
              "casos_con_diferencia",
              "fracasos_con_diferencia",
              "casos_sin_diferencia",
              "fracasos_sin_diferencia"
            ],
            properties: {
              categoria: {
                bsonType: "string",
                enum: [
                  "horario_sueno",
                  "horario_estudio",
                  "orden_limpieza",
                  "ruido",
                  "visitas",
                  "fumar",
                  "mascotas"
                ]
              },
              casos_con_diferencia: {"bsonType":"int"},
              fracasos_con_diferencia: {"bsonType":"int"},
              casos_sin_diferencia: {"bsonType":"int"},
              fracasos_sin_diferencia: {"bsonType":"int"},
              tasa_fracaso_con_diferencia: {"bsonType":["number","null"]},
              tasa_fracaso_sin_diferencia: {"bsonType":["number","null"]}
            }
          }
        }
      }
    }
  }
});

// ============================================================
// INTERACCIONES
// Diseño para una fase futura; el sistema aún no la usa.
// ============================================================
aplicar("interacciones", {
  validator: {
    "$jsonSchema": {
      bsonType: "object",
      description: "Diseño para una fase futura; el sistema aún no la usa.",
      required: ["_id","codigo","usuario_id","tipo","fecha"],
      properties: {
        _id: {"bsonType":"objectId"},
        codigo: {"bsonType":"int"},
        usuario_id: {"bsonType":"objectId"},
        otro_usuario_id: {"bsonType":["objectId","null"]},
        match_id: {"bsonType":["objectId","null"]},
        compatibilidad_id: {"bsonType":["objectId","null"]},
        publicacion_id: {"bsonType":["objectId","null"]},
        tipo: {
          bsonType: "string",
          enum: ["sugerencia_vista","perfil_visto","match_aceptado","match_rechazado","match_expirado"]
        },
        pctj_compatibilidad: {"bsonType":["number","null"]},
        categorias_conflicto: {
          bsonType: "array",
          items: {
            bsonType: "string",
            enum: [
              "horario_sueno",
              "horario_estudio",
              "orden_limpieza",
              "ruido",
              "visitas",
              "fumar",
              "mascotas"
            ]
          }
        },
        categorias_cedidas: {
          bsonType: "array",
          items: {
            bsonType: "string",
            enum: [
              "horario_sueno",
              "horario_estudio",
              "orden_limpieza",
              "ruido",
              "visitas",
              "fumar",
              "mascotas"
            ]
          }
        },
        motivo_rechazo: {
          bsonType: ["string","null"],
          enum: ["baja_compatibilidad","alojamiento_no_conviene","ya_encontro_alojamiento","otro",null]
        },
        parametros_version: {"bsonType":["string","null"]},
        fecha: {"bsonType":"date"}
      }
    }
  }
});

// ============================================================
// HISTORIAL_CUESTIONARIO
// ============================================================
aplicar("historial_cuestionario", {
  validator: {
    "$jsonSchema": {
      bsonType: "object",
      required: ["_id","codigo","usuario_id","categoria","campo","valor_nuevo","origen","fecha"],
      properties: {
        _id: {"bsonType":"objectId"},
        codigo: {"bsonType":"int"},
        usuario_id: {"bsonType":"objectId"},
        categoria: {
          bsonType: "string",
          enum: ["horario_sueno","horario_estudio","orden_limpieza","ruido","visitas","fumar","mascotas"]
        },
        campo: {"bsonType":"string","enum":["respuesta","importancia"]},
        valor_anterior: {"bsonType":["string","null"]},
        valor_nuevo: {"bsonType":"string"},
        origen: {"bsonType":"string","enum":["usuario","confirmacion_sugerencia"]},
        interacciones_ids: {"bsonType":"array","items":{"bsonType":"objectId"}},
        fecha: {"bsonType":"date"}
      }
    }
  }
});

// ============================================================
// AJUSTES_ALGORITMO
// ============================================================
aplicar("ajustes_algoritmo", {
  validator: {
    "$jsonSchema": {
      bsonType: "object",
      required: [
        "_id",
        "codigo",
        "version_base",
        "estado",
        "periodo_hasta",
        "casos_analizados",
        "fecha_creacion"
      ],
      properties: {
        _id: {"bsonType":"objectId"},
        codigo: {"bsonType":"int"},
        version_base: {"bsonType":"string"},
        version_propuesta: {"bsonType":["string","null"]},
        estado: {"bsonType":"string","enum":["propuesto","en_validacion","aprobado","rechazado"]},
        periodo_desde: {"bsonType":["date","null"]},
        periodo_hasta: {"bsonType":"date"},
        casos_analizados: {"bsonType":"int"},
        estadistica_id: {"bsonType":["objectId","null"]},
        cambios: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["categoria","peso_actual","peso_propuesto"],
            properties: {
              categoria: {
                bsonType: "string",
                enum: [
                  "horario_sueno",
                  "horario_estudio",
                  "orden_limpieza",
                  "ruido",
                  "visitas",
                  "fumar",
                  "mascotas"
                ]
              },
              peso_actual: {"bsonType":"number"},
              peso_propuesto: {"bsonType":"number"},
              tasa_fracaso_con_diferencia: {"bsonType":["number","null"]},
              tasa_fracaso_sin_diferencia: {"bsonType":["number","null"]},
              justificacion: {"bsonType":["string","null"]}
            }
          }
        },
        // null cuando no hubo cambios que validar
        validacion: {
          bsonType: ["object","null"],
          properties: {
            matches_base: {"bsonType":["int","null"]},
            exitosos_base: {"bsonType":["int","null"]},
            tasa_exito_base: {"bsonType":["number","null"]},
            matches_propuesta: {"bsonType":["int","null"]},
            exitosos_propuesta: {"bsonType":["int","null"]},
            tasa_exito_propuesta: {"bsonType":["number","null"]},
            mejora: {"bsonType":["number","null"]},
            fecha_validacion: {"bsonType":["date","null"]}
          }
        },
        creado_por: {"bsonType":["objectId","null"]},
        revisado_por: {"bsonType":["objectId","null"]},
        fecha_creacion: {"bsonType":"date"},
        fecha_decision: {"bsonType":["date","null"]},
        observaciones: {"bsonType":["string","null"]}
      }
    }
  }
});

// ============================================================
// CONVERSACIONES (chat entre estudiantes, HU-31)
// Una conversación por par de estudiantes.
// ============================================================
aplicar("conversaciones", {
  validator: {
    "$jsonSchema": {
      bsonType: "object",
      required: [
        "_id",
        "clave",
        "participantes",
        "creada_por",
        "fecha_creacion",
        "fecha_actividad",
        "no_leidos"
      ],
      properties: {
        _id: {"bsonType":"objectId"},
        clave: {"bsonType":"string","description":"Los dos ids de los participantes, ordenados"},
        participantes: {"bsonType":"array","minItems":2,"maxItems":2,"items":{"bsonType":"objectId"}},
        creada_por: {"bsonType":"objectId"},
        fecha_creacion: {"bsonType":"date"},
        fecha_actividad: {"bsonType":"date"},
        ultimo_mensaje: {
          bsonType: ["object","null"],
          required: ["texto","autor_id","fecha"],
          properties: {
            texto: {"bsonType":"string"},
            autor_id: {"bsonType":"objectId"},
            fecha: {"bsonType":"date"}
          }
        },
        no_leidos: {
          bsonType: "object",
          description: "Clave: id del usuario; valor: cantidad de mensajes no leídos",
          additionalProperties: {"bsonType":"int"}
        }
      }
    }
  }
});

// ============================================================
// MENSAJES (chat entre estudiantes, HU-31)
// ============================================================
aplicar("mensajes", {
  validator: {
    "$jsonSchema": {
      bsonType: "object",
      required: ["_id","conversacion_id","autor_id","texto","fecha_envio"],
      properties: {
        _id: {"bsonType":"objectId"},
        conversacion_id: {"bsonType":"objectId"},
        autor_id: {"bsonType":"objectId"},
        texto: {"bsonType":"string","maxLength":1000},
        publicacion_id: {"bsonType":["objectId","null"]},
        fecha_envio: {"bsonType":"date"}
      }
    }
  }
});

// ============================================================
// CONTADORES
// ============================================================
aplicar("contadores", {
  validator: {
    "$jsonSchema": {
      bsonType: "object",
      required: ["_id","secuencia"],
      properties: {"_id":{"bsonType":"string"},"secuencia":{"bsonType":"int"}}
    }
  }
});

print("Colecciones listas");
