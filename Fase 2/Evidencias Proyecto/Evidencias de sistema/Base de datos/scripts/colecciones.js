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

// ============================================================
// DESCRIPCIONES
// Se copian al validador como «description» de cada campo: así se ven en Atlas (pestaña Validation)
// y DbSchema las muestra como comentario en el diagrama y en la documentación del modelo de datos.
// Clave "" = descripción de la colección. Las rutas usan punto, también dentro de arreglos
// (por ejemplo «fotos.url»). Si un campo no aparece en su colección, se usa COMUNES por su nombre.
// ============================================================
const CATEGORIAS = "horario_sueno, horario_estudio, orden_limpieza, ruido, visitas, fumar o mascotas";

const COMUNES = {
  _id: "Identificador único del documento (lo genera MongoDB)",
  codigo: "Número correlativo legible del documento (N.º), asignado con la colección contadores",
  type: "Tipo de geometría GeoJSON; siempre «Point»",
  coordinates: "Posición [longitud, latitud] en grados, en ese orden (estándar GeoJSON)",
  parametros_version: "Versión de parametros_algoritmo con que se hizo el cálculo",
  categoria: "Categoría de hábito: " + CATEGORIAS,
};

const DESCRIPCIONES = {
  comunas: {
    "": "Catálogo de comunas de la Región del Biobío donde se ubican alojamientos e instituciones",
    nombre: "Nombre de la comuna",
    region: "Región a la que pertenece la comuna",
    centro: "Punto central de la comuna (GeoJSON); se usa cuando una publicación no marca un punto exacto",
    sector: "Clave de la provincia (concepcion, arauco o biobio); agrupa las comunas en el filtro de búsqueda",
    provincia: "Nombre de la provincia para mostrar en pantalla",
  },
  instituciones: {
    "": "Instituciones de educación superior con las que se verifica a los estudiantes",
    nombre: "Nombre completo de la institución",
    sigla: "Sigla de la institución (por ejemplo, UdeC)",
    tipo: "Tipo de institución: universidad, instituto profesional o centro de formación técnica",
    dominios_correo: "Dominios de correo institucional (por ejemplo, udec.cl) que permiten verificar al estudiante por correo",
    activa: "Indica si la institución está disponible para elegir en el registro",
    sedes: "Sedes o campus de la institución",
    "sedes.nombre": "Nombre de la sede o campus",
    "sedes.comuna_id": "Comuna donde está la sede (referencia a comunas._id)",
    "sedes.direccion": "Dirección de la sede",
    "sedes.coordenadas": "Ubicación de la sede en el mapa (GeoJSON)",
    "sedes.comunas_cercanas_ids": "Comunas cercanas a la sede, sugeridas al buscar alojamiento (referencias a comunas._id)",
    "sedes.sectores_cercanos": "Sectores o barrios cercanos a la sede",
  },
  carreras: {
    "": "Catálogo de carreras de pregrado de cada institución (fuente: SIES), para elegir la carrera en el perfil",
    institucion_id: "Institución que imparte la carrera (referencia a instituciones._id)",
    nombre: "Nombre de la carrera",
    area: "Área del conocimiento de la carrera",
    fuente: "Origen del dato (por ejemplo, SIES)",
    activa: "Indica si la carrera se muestra en la lista para elegir",
  },
  usuarios: {
    "": "Cuentas de la plataforma: estudiantes (buscadores u oferentes de alojamiento) y administradores",
    rut: "RUT de la persona, único en la plataforma",
    nombre: "Nombre o nombres",
    ap_paterno: "Apellido paterno",
    ap_materno: "Apellido materno",
    fecha_nac: "Fecha de nacimiento; se usa para validar la mayoría de edad",
    genero: "Género declarado: femenino, masculino o no_binario",
    correo: "Correo electrónico con que inicia sesión, único en la plataforma",
    password: "Contraseña cifrada con hash (nunca se guarda en texto plano)",
    fecha_registro: "Fecha de creación de la cuenta",
    rol: "Rol en la plataforma: estudiante o administrador",
    estado_cuenta: "Estado de la cuenta: activa, suspendida o eliminada (eliminación lógica)",
    advertencias_recibidas: "Cantidad de advertencias de moderación recibidas",
    match_activo_id: "Match en el que el estudiante convive actualmente (referencia a matches._id); null si no tiene",
    correo_verificado: "Indica si el estudiante confirmó su correo con el código enviado",
    fecha_actualizacion: "Fecha de la última modificación de la cuenta",
    modo: "Modo de uso del estudiante: buscador (busca alojamiento) u oferente (ofrece alojamiento); null si aún no elige",
    fecha_cambio_modo: "Fecha del último cambio de modo",
    buscando_alojamiento: "Indica si el buscador está buscando alojamiento y recibe propuestas de match",
    recibiendo_propuestas: "Solo oferentes: false si pausó las propuestas aunque le queden cupos",
    eliminacion: "Datos de la eliminación de la cuenta por un administrador",
    "eliminacion.fecha": "Fecha de la eliminación",
    "eliminacion.admin_id": "Administrador que eliminó la cuenta (referencia a usuarios._id)",
    "eliminacion.accion_id": "Acción de moderación que la eliminó (referencia a acciones_moderacion._id)",
    "eliminacion.motivo": "Motivo de la eliminación",
    "eliminacion.fecha_nuevo_registro": "Fecha en que la persona volvió a registrarse con el mismo correo o RUT",
    verificacion: "Estado de la verificación como estudiante",
    "verificacion.estado": "Estado: no_verificado, pendiente, verificado, rechazado o revocado",
    "verificacion.metodo": "Cómo se verificó: correo_institucional, o null si fue con un comprobante revisado por un administrador",
    "verificacion.institucion_id": "Institución con la que se verificó (referencia a instituciones._id)",
    "verificacion.fecha_verificacion": "Fecha en que quedó verificado",
    "verificacion.fecha_revocacion": "Fecha en que se le quitó la verificación",
    "verificacion.motivo_revocacion": "Motivo por el que se revocó la verificación",
    "verificacion.fecha_restauracion": "Fecha en que un administrador restableció una verificación revocada",
    "verificacion.admin_id": "Administrador que aprobó o revocó la verificación (referencia a usuarios._id)",
    "verificacion.solicitud_id": "Solicitud con la que se verificó (referencia a solicitudes_verificacion._id)",
    suspension: "Datos de la suspensión vigente de la cuenta; null cuando se reactiva",
    "suspension.motivo": "Motivo de la suspensión",
    "suspension.fecha": "Fecha de la suspensión",
    "suspension.admin_id": "Administrador que suspendió la cuenta (referencia a usuarios._id)",
    "suspension.accion_id": "Acción de moderación de la suspensión (referencia a acciones_moderacion._id)",
    "suspension.estado_previo": "Estado de la cuenta antes de suspenderla, para devolverlo al reactivarla",
    perfil: "Datos del perfil del estudiante; se completan después del registro",
    "perfil.institucion_id": "Institución donde estudia (referencia a instituciones._id)",
    "perfil.carrera": "Carrera que estudia",
    "perfil.carrera_otra": "true si escribió la carrera a mano porque no estaba en la lista",
    "perfil.anio_ingreso": "Año de ingreso a la carrera",
    "perfil.sede": "Sede o campus donde estudia",
    "perfil.direccion": "Dirección actual del estudiante",
    "perfil.ciudad_origen": "Ciudad de origen",
    "perfil.region_origen": "Región de origen",
    "perfil.descripcion": "Presentación personal que ven los demás estudiantes",
    "perfil.foto_url": "Ruta de la foto de perfil",
    "perfil.perfil_completo": "Indica si el perfil tiene todos los datos obligatorios",
    "perfil.campos_faltantes": "Campos obligatorios del perfil que aún faltan",
    "perfil.telefono": "Teléfono de contacto, único entre cuentas",
    cuestionario: "Respuestas del cuestionario de hábitos de convivencia, base del cálculo de compatibilidad",
    "cuestionario.horario_sueno": "Hora habitual de dormir: temprano, intermedio o tarde",
    "cuestionario.horario_estudio": "Horario en que suele estudiar: manana, tarde, noche o variable",
    "cuestionario.orden_limpieza": "Nivel de orden y limpieza: alto, medio o bajo",
    "cuestionario.ruido": "Nivel de ruido que genera o tolera: bajo, moderado o alto",
    "cuestionario.visitas": "Frecuencia de visitas: nunca, ocasional o frecuente",
    "cuestionario.fumar": "Hábito de fumar: no_fuma_no_tolera, no_fuma_tolera o fuma",
    "cuestionario.mascotas": "Mascotas: no_tiene_no_tolera, no_tiene_tolera o tiene",
    "cuestionario.importancia": "Importancia que el estudiante da a cada categoría de hábito",
    "cuestionario.importancia.nivel": "Importancia: imprescindible, importante o flexible",
    "cuestionario.completo": "Indica si respondió todas las preguntas (mientras responde se autoguarda incompleto)",
    "cuestionario.campos_faltantes": "Preguntas que aún no responde",
    "cuestionario.fecha_respuesta": "Fecha en que completó el cuestionario por primera vez",
    "cuestionario.fecha_actualizacion": "Fecha del último cambio en el cuestionario",
    ajuste_recomendacion: "Aprendizaje personal del algoritmo a partir de las decisiones y evaluaciones del estudiante",
    "ajuste_recomendacion.categorias_problema": "Razones de problemas indicadas en sus evaluaciones de convivencia",
    "ajuste_recomendacion.decisiones_registradas": "Cantidad de decisiones (aceptar o rechazar propuestas) consideradas",
    "ajuste_recomendacion.aprendizaje": "Ajuste aprendido para cada categoría de hábito",
    "ajuste_recomendacion.aprendizaje.peso_personal": "Multiplicador personal del peso de la categoría en su compatibilidad",
    "ajuste_recomendacion.aprendizaje.veces_cedio": "Veces que aceptó una propuesta con diferencias en esta categoría",
    "ajuste_recomendacion.aprendizaje.veces_rechazo": "Veces que rechazó una propuesta con diferencias en esta categoría",
    "ajuste_recomendacion.aprendizaje.veces_problema_convivencia": "Veces que indicó esta categoría como problema en una evaluación",
    "ajuste_recomendacion.aprendizaje.tendencia": "Tendencia observada: mas_tolerante, igual o menos_tolerante",
    "ajuste_recomendacion.aprendizaje.confianza": "Confianza del aprendizaje, de 0 a 1",
    "ajuste_recomendacion.aprendizaje.sugerir_actualizacion": "Indica si se sugiere al estudiante actualizar su respuesta del cuestionario",
    "ajuste_recomendacion.aprendizaje.fecha_actualizacion": "Fecha del último ajuste de la categoría",
    "ajuste_recomendacion.fecha_actualizacion": "Fecha del último recálculo del aprendizaje personal",
    preferencias_busqueda: "Filtros de búsqueda de alojamiento guardados por el buscador",
    "preferencias_busqueda.costo_min": "Costo mensual mínimo en pesos",
    "preferencias_busqueda.costo_max": "Costo mensual máximo en pesos",
    "preferencias_busqueda.comunas_ids": "Comunas de interés (referencias a comunas._id)",
    "preferencias_busqueda.tipo_alojamiento": "Tipo buscado: habitacion o departamento; null si le da lo mismo",
    "preferencias_busqueda.requiere_mascotas": "Busca un lugar que permita mascotas",
    "preferencias_busqueda.requiere_fumar": "Busca un lugar que permita fumar",
    "preferencias_busqueda.requiere_visitas": "Busca un lugar que permita visitas",
    "preferencias_busqueda.gastos_incluidos": "Busca un lugar con los gastos básicos incluidos",
    "preferencias_busqueda.amoblado": "Busca un lugar amoblado",
    "preferencias_busqueda.estacionamiento": "Busca un lugar con estacionamiento",
    seguridad: "Datos de seguridad del inicio de sesión",
    "seguridad.intentos_fallidos": "Intentos fallidos seguidos de inicio de sesión",
    "seguridad.bloqueado_hasta": "Fecha hasta la que el inicio de sesión queda bloqueado por intentos fallidos",
    "seguridad.token_version": "Versión de las sesiones; al aumentarla se cierran todas las sesiones abiertas",
    "seguridad.ultimo_inicio_sesion": "Fecha del último inicio de sesión",
    "seguridad.ultima_actividad": "Fecha de la última actividad en la plataforma",
    recuperacion: "Código pendiente de «¿Olvidaste tu contraseña?»; se borra al cambiar la contraseña",
    "recuperacion.codigo_hash": "Hash del código enviado por correo (el código no se guarda)",
    "recuperacion.expira": "Fecha en que vence el código",
    "recuperacion.intentos": "Intentos fallidos de ingresar el código",
    "recuperacion.fecha_envio": "Fecha en que se envió el código",
    verificacion_correo: "Código pendiente para verificar el correo; se borra al verificarlo",
    "verificacion_correo.codigo_hash": "Hash del código enviado por correo (el código no se guarda)",
    "verificacion_correo.expira": "Fecha en que vence el código",
    "verificacion_correo.intentos": "Intentos fallidos de ingresar el código",
    "verificacion_correo.fecha_envio": "Fecha en que se envió el código",
  },
  solicitudes_verificacion: {
    "": "Solicitudes de verificación de estudiante con un comprobante que revisa un administrador",
    usuario_id: "Estudiante que envía la solicitud (referencia a usuarios._id)",
    institucion_id: "Institución que indica el estudiante (referencia a instituciones._id)",
    admin_revisor_id: "Administrador que revisa la solicitud (referencia a usuarios._id)",
    tipo_comprobante: "Documento enviado: certificado_alumno_regular, comprobante_matricula, credencial_estudiantil o carta_aceptacion",
    situacion: "Situación del estudiante: matriculado o seleccionado (aún no se matricula)",
    vigencia_hasta: "Fecha hasta la que vale el comprobante",
    fecha_solicitud: "Fecha de envío de la solicitud",
    fecha_revision: "Fecha en que se aprobó o rechazó",
    estado: "Estado: pendiente, en_revision, aprobada o rechazada",
    motivo_rechazo: "Motivo del rechazo, que se informa al estudiante",
    observaciones: "Observaciones internas del administrador",
    revocacion: "Datos de la revocación vigente de esta verificación",
    "revocacion.fecha": "Fecha de la revocación",
    "revocacion.motivo": "Motivo de la revocación",
    "revocacion.admin_id": "Administrador que revocó (referencia a usuarios._id)",
    revocaciones_anteriores: "Revocaciones que un administrador dejó sin efecto al restablecer la verificación",
    "revocaciones_anteriores.fecha": "Fecha de la revocación",
    "revocaciones_anteriores.motivo": "Motivo de la revocación",
    "revocaciones_anteriores.admin_id": "Administrador que revocó (referencia a usuarios._id)",
    "revocaciones_anteriores.fecha_restauracion": "Fecha en que se restableció la verificación",
    "revocaciones_anteriores.restaurada_por": "Administrador que la restableció (referencia a usuarios._id)",
    archivo: "Archivo del comprobante subido",
    "archivo.ruta": "Ruta del archivo en el servidor",
    "archivo.nombre_original": "Nombre del archivo tal como lo subió el estudiante",
    "archivo.formato": "Formato del archivo: pdf, jpg o png",
    "archivo.tamano_bytes": "Tamaño del archivo en bytes",
    "archivo.hash_sha256": "Huella SHA-256 del archivo, para detectar comprobantes repetidos",
  },
  publicaciones: {
    "": "Alojamientos (habitaciones o departamentos) que publican los estudiantes oferentes",
    oferente_id: "Estudiante que publica el alojamiento (referencia a usuarios._id)",
    tipo: "Tipo de alojamiento: habitacion o departamento",
    titulo: "Título de la publicación",
    descripcion: "Descripción del alojamiento",
    cupos_totales: "Cantidad total de cupos para compartir",
    cupos_disponibles: "Cupos que quedan libres",
    costo_mensual: "Costo mensual por persona, en pesos chilenos",
    genero_preferido: "Género preferido de quien arrienda: femenino, masculino o indiferente",
    estado: "Estado: activa, pausada, completa (sin cupos), suspendida (por moderación) o eliminada",
    fecha_publicacion: "Fecha de publicación",
    fecha_ultima_modificacion: "Fecha de la última edición",
    fecha_eliminacion: "Fecha de eliminación (eliminación lógica)",
    eliminada_por: "Quién la eliminó: oferente o administrador",
    cantidad_reportes: "Total de reportes recibidos",
    cantidad_reportes_pendiente: "Reportes aún sin resolver",
    ubicacion: "Ubicación del alojamiento",
    "ubicacion.comuna_id": "Comuna del alojamiento (referencia a comunas._id)",
    "ubicacion.comuna_nombre": "Nombre de la comuna, copiado para mostrarlo sin consultar comunas",
    "ubicacion.sector": "Provincia de la comuna (concepcion, arauco o biobio), copiada para filtrar",
    "ubicacion.direccion_referencia": "Referencia de la dirección (calle o sector, sin número exacto)",
    "ubicacion.coordenadas": "Punto que se muestra en el mapa (GeoJSON): el punto marcado o el centro de la comuna",
    "ubicacion.punto_exacto": "Punto marcado por el oferente en el mapa (GeoJSON); null si no marcó ninguno",
    gastos: "Gastos básicos: si están incluidos en el costo mensual o su monto aparte",
    "gastos.agua": "Gasto de agua",
    "gastos.agua.incluido": "Indica si el agua está incluida en el costo mensual",
    "gastos.agua.monto_estimado": "Monto mensual estimado del agua si no está incluida, en pesos",
    "gastos.luz": "Gasto de luz",
    "gastos.luz.incluido": "Indica si la luz está incluida en el costo mensual",
    "gastos.luz.monto_estimado": "Monto mensual estimado de la luz si no está incluida, en pesos",
    "gastos.gas": "Gasto de gas",
    "gastos.gas.incluido": "Indica si el gas está incluido en el costo mensual",
    "gastos.gas.monto_estimado": "Monto mensual estimado del gas si no está incluido, en pesos",
    "gastos.internet": "Gasto de internet",
    "gastos.internet.incluido": "Indica si internet está incluido en el costo mensual",
    "gastos.internet.monto_estimado": "Monto mensual estimado de internet si no está incluido, en pesos",
    "gastos.todos_incluidos": "Indica si todos los gastos básicos están incluidos",
    reglas: "Reglas de convivencia del alojamiento",
    "reglas.permite_fumar": "Se permite fumar",
    "reglas.permite_mascotas": "Se permiten mascotas",
    "reglas.permite_visitas": "Se permiten visitas",
    "reglas.horario_silencio": "Horario de silencio",
    "reglas.horario_silencio.aplica": "Indica si hay horario de silencio",
    "reglas.horario_silencio.desde": "Hora de inicio del silencio (HH:MM)",
    "reglas.horario_silencio.hasta": "Hora de término del silencio (HH:MM)",
    "reglas.reglas_adicionales": "Otras reglas escritas por el oferente",
    caracteristicas: "Características del alojamiento",
    "caracteristicas.amoblado": "Está amoblado",
    "caracteristicas.banio_privado": "Tiene baño privado",
    "caracteristicas.estacionamiento": "Tiene estacionamiento",
    fotos: "Fotos del alojamiento",
    "fotos.url": "Ruta de la foto",
    "fotos.formato": "Formato de la imagen: jpg, png o webp",
    "fotos.tamano_bytes": "Tamaño de la imagen en bytes",
    "fotos.es_principal": "Indica si es la foto de portada",
    "fotos.orden": "Posición de la foto en la galería",
    "fotos.fecha_subida": "Fecha en que se subió la foto",
    moderacion: "Última acción de moderación sobre la publicación; null al restaurarla",
    "moderacion.ultima_accion_id": "Última acción de moderación (referencia a acciones_moderacion._id)",
    "moderacion.motivo": "Motivo de la acción de moderación",
    "moderacion.estado_previo": "Estado de la publicación antes de la acción, para devolverlo al restaurarla",
    "moderacion.fecha": "Fecha de la acción de moderación",
  },
  compatibilidades: {
    "": "Cálculo de compatibilidad de hábitos entre dos estudiantes",
    usuario_a_id: "Primer estudiante del par (referencia a usuarios._id)",
    usuario_b_id: "Segundo estudiante del par (referencia a usuarios._id)",
    porcentaje_base: "Porcentaje de compatibilidad sin los ajustes personales aprendidos (0 a 100)",
    porcentaje: "Porcentaje de compatibilidad final, con los ajustes personales (0 a 100)",
    nivel: "Nivel según los umbrales del algoritmo: alta, media o baja",
    descartado: "true si el par se descarta por un conflicto en una categoría imprescindible",
    categoria_descarte: "Categoría que provocó el descarte",
    categorias_coincidentes: "Categorías en que ambos respondieron lo mismo",
    categorias_diferentes: "Categorías en que sus respuestas difieren",
    vigente: "Indica si es el cálculo actual del par (false si se recalculó después)",
    fecha_calculo: "Fecha del cálculo",
    detalle: "Resultado de la comparación en cada categoría de hábito",
    "detalle.respuesta_a": "Respuesta del primer estudiante",
    "detalle.respuesta_b": "Respuesta del segundo estudiante",
    "detalle.importancia_a": "Importancia que le da el primer estudiante",
    "detalle.importancia_b": "Importancia que le da el segundo estudiante",
    "detalle.coincide": "Indica si las respuestas son iguales",
    "detalle.distancia": "Diferencia entre respuestas: 0 iguales, 1 parcial, 2 opuestas",
    "detalle.puntaje": "Puntaje de la categoría, de 0 (opuestas) a 1 (iguales)",
    "detalle.peso_base": "Peso de la categoría según la importancia mayor de los dos",
    "detalle.ajuste_personal": "Multiplicador por el aprendizaje personal de los estudiantes",
    "detalle.peso": "Peso final de la categoría en el porcentaje",
    "detalle.conflicto_imprescindible": "true si difieren en una categoría que alguno marcó como imprescindible",
  },
  matches: {
    "": "Propuestas de convivencia entre un buscador y un oferente para una publicación, con su seguimiento",
    usuario_a_id: "Estudiante buscador de alojamiento (referencia a usuarios._id)",
    usuario_b_id: "Estudiante oferente, dueño de la publicación (referencia a usuarios._id)",
    compatibilidad_id: "Cálculo de compatibilidad usado (referencia a compatibilidades._id)",
    pctj_compatibilidad: "Porcentaje de compatibilidad al proponer el match",
    publicacion_id: "Alojamiento propuesto (referencia a publicaciones._id)",
    estado: "Estado: sugerido, pendiente, confirmado, rechazado, expirado o finalizado",
    resultado: "Resultado de la convivencia: pendiente, exitoso, no_exitoso o sin_convivencia",
    fecha_sugerencia: "Fecha en que se propuso el match",
    fecha_respuesta: "Fecha de la última respuesta",
    fecha_confirmacion: "Fecha en que ambos aceptaron",
    fecha_inicio_convivencia: "Fecha de inicio de la convivencia",
    fecha_habilitacion_evaluacion: "Fecha desde la que se puede evaluar la convivencia (un mes después de confirmar)",
    fecha_fin_convivencia: "Fecha de término de la convivencia",
    motivo_fin: "Motivo del término: incompatibilidad, termino_arriendo, cambio_ciudad, fin_estudios u otro",
    duracion_convivencia_dias: "Días que duró la convivencia",
    fin_por_cuenta_eliminada: "true si terminó porque se eliminó la cuenta de uno de los dos",
    respuesta_a: "Respuesta del buscador a la propuesta",
    "respuesta_a.estado": "Respuesta: pendiente, aceptado o rechazado",
    "respuesta_a.fecha_respuesta": "Fecha de la respuesta",
    "respuesta_a.motivo_rechazo": "Motivo del rechazo: baja_compatibilidad, alojamiento_no_conviene, ya_encontro_alojamiento u otro",
    respuesta_b: "Respuesta del oferente a la propuesta",
    "respuesta_b.estado": "Respuesta: pendiente, aceptado o rechazado",
    "respuesta_b.fecha_respuesta": "Fecha de la respuesta",
    "respuesta_b.motivo_rechazo": "Motivo del rechazo: baja_compatibilidad, alojamiento_no_conviene, ya_encontro_alojamiento u otro",
    evaluacion: "Evaluaciones de la convivencia que hace cada estudiante",
    "evaluacion.evaluador_id": "Estudiante que evalúa (referencia a usuarios._id)",
    "evaluacion.evaluado_id": "Estudiante evaluado (referencia a usuarios._id)",
    "evaluacion.momento": "Momento de la evaluación: mes_1 (al mes) o cierre (al terminar)",
    "evaluacion.funciona": "Indica si la convivencia funciona",
    "evaluacion.calificacion": "Calificación de 1 a 5 (la evaluación de cierre no lleva)",
    "evaluacion.comentario": "Comentario opcional",
    "evaluacion.razones": "Razones de los problemas de convivencia",
    "evaluacion.razones.razon": "Razón: " + CATEGORIAS + ", gastos, comunicacion u otra",
    "evaluacion.razones.gravedad": "Gravedad: leve, moderada o grave",
    "evaluacion.razon_otra_detalle": "Detalle cuando la razón es «otra»",
    "evaluacion.fecha_eval": "Fecha de la evaluación",
    seguimiento: "Avisos para evaluar la convivencia, uno por estudiante y momento",
    "seguimiento.usuario_id": "Estudiante avisado (referencia a usuarios._id)",
    "seguimiento.momento": "Momento: mes_1 o cierre",
    "seguimiento.fecha_aviso": "Fecha del aviso",
    "seguimiento.fecha_recordatorio": "Fecha del recordatorio si no evaluó",
    "seguimiento.evaluado": "Indica si ya evaluó",
  },
  reportes: {
    "": "Reportes de estudiantes sobre perfiles o publicaciones, que revisa un administrador",
    tipo_elemento: "Qué se reporta: usuario o publicacion",
    elemento_reportado_id: "Perfil o publicación reportada (referencia a usuarios._id o publicaciones._id)",
    usuario_reportado: "Dueño del elemento reportado (referencia a usuarios._id)",
    reportante_id: "Estudiante que reporta (referencia a usuarios._id)",
    descripcion: "Detalle escrito por quien reporta",
    estado: "Estado: pendiente, en_revision o resuelto",
    fecha_reporte: "Fecha del reporte",
    admin_revisor_id: "Administrador que revisa (referencia a usuarios._id)",
    fecha_toma_revision: "Fecha en que el administrador tomó el reporte",
    fecha_resolucion: "Fecha de resolución",
    resolucion: "Resultado: sin_accion, advertencia, cuenta_suspendida, verificacion_revocada, publicacion_suspendida o publicacion_eliminada",
    accion_moderacion_id: "Acción de moderación aplicada (referencia a acciones_moderacion._id)",
    reportante_notificado: "Indica si se avisó al reportante del resultado",
    motivo: "Motivo: perfil_falso, comportamiento_inapropiado, informacion_falsa, publicacion_enganosa, estafa, contenido_inapropiado, fotos_no_corresponden u otro",
  },
  acciones_moderacion: {
    "": "Registro de las acciones de moderación y administración sobre perfiles y publicaciones",
    admin_id: "Administrador que realizó la acción (referencia a usuarios._id)",
    objetivo_tipo: "Sobre qué se actúa: usuario o publicacion",
    objetivo_id: "Perfil o publicación afectada (referencia a usuarios._id o publicaciones._id)",
    accion: "Acción realizada (advertir, suspender, reactivar, eliminar, revocar verificación, cambiar rol, desestimar reporte, etc.)",
    motivo: "Motivo: informacion_falsa, contenido_inapropiado, precio_distinto, publicacion_duplicada u otro",
    justificacion: "Explicación escrita por el administrador",
    reportes_ids: "Reportes que originaron la acción (referencias a reportes._id)",
    estado_anterior: "Estado del perfil o publicación antes de la acción",
    estado_nuevo: "Estado después de la acción",
    revierte_accion_id: "Acción anterior que esta deja sin efecto (referencia a acciones_moderacion._id)",
    afectado_notificado: "Indica si se avisó al afectado",
    fecha_accion: "Fecha de la acción",
  },
  notificaciones: {
    "": "Avisos que reciben los usuarios dentro de la plataforma y por correo",
    usuario_id: "Destinatario (referencia a usuarios._id)",
    tipo: "Tipo de aviso (nuevo_match, match_confirmado, evaluacion_disponible, accion_moderacion, etc.)",
    titulo: "Título del aviso",
    mensaje: "Texto del aviso",
    leido: "Indica si el usuario ya lo leyó",
    fecha_lectura: "Fecha de lectura",
    estado_envio: "Estado del envío por correo: pendiente, enviado o fallido",
    fecha_programada: "Fecha programada de envío",
    fecha_notificacion: "Fecha de creación del aviso",
    referencia: "Elemento al que lleva el aviso al abrirlo",
    "referencia.tipo_entidad": "Tipo de elemento: usuario, publicacion o match; null si no lleva a nada",
    "referencia.entidad_id": "Identificador del elemento",
  },
  parametros_algoritmo: {
    "": "Versiones de los parámetros del algoritmo de compatibilidad; solo una está activa",
    version: "Nombre de la versión (por ejemplo, v1), único",
    estado: "Estado: borrador, en_validacion, activa o retirada",
    version_anterior: "Versión que reemplaza",
    ajuste_id: "Revisión que originó esta versión (referencia a ajustes_algoritmo._id)",
    pesos_base: "Peso de cada nivel de importancia (flexible, importante)",
    pesos_categoria: "Multiplicador del peso de cada categoría de hábito",
    multiplicador_imprescindible: "Cuántas veces pesa una categoría imprescindible respecto de una importante",
    incremento_por_razon: "Cuánto sube el peso personal por cada problema de convivencia indicado",
    minimo_casos_ajuste: "Casos evaluados mínimos para proponer un ajuste de pesos",
    minimo_decisiones_personal: "Decisiones mínimas de un estudiante para aplicar su ajuste personal",
    ajuste_personal_max: "Multiplicador personal máximo permitido",
    creado_por: "Administrador que creó la versión (referencia a usuarios._id); null si la creó el sistema",
    notas: "Notas sobre la versión",
    fecha_vigencia_desde: "Fecha desde la que rige",
    fecha_vigencia_hasta: "Fecha hasta la que rigió",
    umbrales: "Porcentajes mínimos de cada nivel de compatibilidad",
    "umbrales.alta": "Porcentaje mínimo para compatibilidad alta",
    "umbrales.media": "Porcentaje mínimo para compatibilidad media",
    metas: "Metas de calidad del matching",
    "metas.match_exitoso": "Meta de tasa de matches exitosos",
    "metas.tasa_respuesta": "Meta de tasa de respuesta a las evaluaciones",
    "metas.tasa_reportes_max": "Tasa máxima aceptable de publicaciones reportadas",
  },
  estadisticas_match: {
    "": "Resumen periódico de los resultados del matching (diseño para una fase futura; el sistema aún no la usa)",
    periodo: "Período del resumen (por ejemplo, 2026-11)",
    matches_generados: "Matches propuestos en el período",
    matches_confirmados: "Matches aceptados por ambos",
    matches_con_convivencia: "Matches que llegaron a convivir",
    evaluaciones_esperadas: "Evaluaciones que se debían responder",
    evaluaciones_respondidas: "Evaluaciones respondidas",
    exitosos: "Convivencias evaluadas como exitosas",
    no_exitosos: "Convivencias evaluadas como no exitosas",
    publicaciones_activas: "Publicaciones activas en el período",
    publicaciones_reportadas: "Publicaciones con al menos un reporte",
    reportes_publicaciones: "Total de reportes a publicaciones",
    tasa_convivencia: "Matches con convivencia / matches confirmados",
    tasa_respuesta: "Evaluaciones respondidas / esperadas",
    tasa_reportes: "Publicaciones reportadas / activas",
    tasa_exito: "Exitosos / evaluados",
    fecha_generacion: "Fecha en que se generó el resumen",
    razones_frecuencia: "Frecuencia de cada razón de problemas de convivencia",
    "razones_frecuencia.razon": "Razón: " + CATEGORIAS + ", gastos, comunicacion u otra",
    "razones_frecuencia.cantidad": "Veces que se indicó",
    analisis_categorias: "Relación entre las diferencias en cada categoría y el fracaso de la convivencia",
    "analisis_categorias.casos_con_diferencia": "Convivencias con respuestas distintas en la categoría",
    "analisis_categorias.fracasos_con_diferencia": "De esas, cuántas no fueron exitosas",
    "analisis_categorias.casos_sin_diferencia": "Convivencias con la misma respuesta en la categoría",
    "analisis_categorias.fracasos_sin_diferencia": "De esas, cuántas no fueron exitosas",
    "analisis_categorias.tasa_fracaso_con_diferencia": "Fracasos / casos con diferencia",
    "analisis_categorias.tasa_fracaso_sin_diferencia": "Fracasos / casos sin diferencia",
  },
  interacciones: {
    "": "Acciones de los estudiantes frente a sugerencias y matches (diseño para una fase futura; el sistema aún no la usa)",
    usuario_id: "Estudiante que realiza la acción (referencia a usuarios._id)",
    otro_usuario_id: "Otro estudiante involucrado (referencia a usuarios._id)",
    match_id: "Match relacionado (referencia a matches._id)",
    compatibilidad_id: "Cálculo de compatibilidad relacionado (referencia a compatibilidades._id)",
    publicacion_id: "Publicación relacionada (referencia a publicaciones._id)",
    tipo: "Acción: sugerencia_vista, perfil_visto, match_aceptado, match_rechazado o match_expirado",
    pctj_compatibilidad: "Porcentaje de compatibilidad en ese momento",
    categorias_conflicto: "Categorías en que los estudiantes diferían",
    categorias_cedidas: "Categorías en conflicto que el estudiante aceptó igual",
    motivo_rechazo: "Motivo del rechazo: baja_compatibilidad, alojamiento_no_conviene, ya_encontro_alojamiento u otro",
    fecha: "Fecha de la acción",
  },
  historial_cuestionario: {
    "": "Historial de cambios en las respuestas del cuestionario de hábitos",
    usuario_id: "Estudiante que cambió su respuesta (referencia a usuarios._id)",
    campo: "Qué cambió: respuesta o importancia",
    valor_anterior: "Valor antes del cambio; null si no había respuesta",
    valor_nuevo: "Valor después del cambio",
    origen: "Origen del cambio: usuario (lo editó) o confirmacion_sugerencia (aceptó una sugerencia del sistema)",
    interacciones_ids: "Interacciones que motivaron la sugerencia (referencias a interacciones._id)",
    fecha: "Fecha del cambio",
  },
  ajustes_algoritmo: {
    "": "Revisiones de los pesos del algoritmo a partir de los resultados de las convivencias",
    version_base: "Versión de parámetros que se revisa",
    version_propuesta: "Versión nueva que se propone, si hay cambios",
    estado: "Estado: propuesto, en_validacion, aprobado o rechazado",
    periodo_desde: "Inicio del período analizado",
    periodo_hasta: "Fin del período analizado",
    casos_analizados: "Convivencias evaluadas que se analizaron",
    estadistica_id: "Resumen estadístico usado (referencia a estadisticas_match._id)",
    cambios: "Cambios de peso propuestos por categoría",
    "cambios.peso_actual": "Peso actual de la categoría",
    "cambios.peso_propuesto": "Peso propuesto",
    "cambios.tasa_fracaso_con_diferencia": "Tasa de fracaso cuando las respuestas difieren",
    "cambios.tasa_fracaso_sin_diferencia": "Tasa de fracaso cuando las respuestas coinciden",
    "cambios.justificacion": "Explicación del cambio",
    validacion: "Comparación de la versión actual y la propuesta sobre los mismos casos; null si no hubo cambios",
    "validacion.matches_base": "Matches considerados con la versión actual",
    "validacion.exitosos_base": "Exitosos con la versión actual",
    "validacion.tasa_exito_base": "Tasa de éxito con la versión actual",
    "validacion.matches_propuesta": "Matches considerados con la versión propuesta",
    "validacion.exitosos_propuesta": "Exitosos con la versión propuesta",
    "validacion.tasa_exito_propuesta": "Tasa de éxito con la versión propuesta",
    "validacion.mejora": "Diferencia entre la tasa propuesta y la actual",
    "validacion.fecha_validacion": "Fecha de la validación",
    creado_por: "Quién creó la revisión (referencia a usuarios._id); null si fue automática",
    revisado_por: "Administrador que la aprobó o rechazó (referencia a usuarios._id)",
    fecha_creacion: "Fecha de creación",
    fecha_decision: "Fecha de aprobación o rechazo",
    observaciones: "Observaciones del administrador",
  },
  conversaciones: {
    "": "Conversaciones del chat entre dos estudiantes (una por par)",
    clave: "Los dos ids de los participantes ordenados; evita conversaciones repetidas",
    participantes: "Los dos estudiantes de la conversación (referencias a usuarios._id)",
    creada_por: "Estudiante que inició la conversación (referencia a usuarios._id)",
    fecha_creacion: "Fecha de creación",
    fecha_actividad: "Fecha del último mensaje; ordena la bandeja",
    ultimo_mensaje: "Copia del último mensaje para mostrar la bandeja sin leer mensajes",
    "ultimo_mensaje.texto": "Texto del último mensaje",
    "ultimo_mensaje.autor_id": "Autor del último mensaje (referencia a usuarios._id)",
    "ultimo_mensaje.fecha": "Fecha del último mensaje",
    no_leidos: "Mensajes no leídos por participante (clave: id del usuario; valor: cantidad)",
  },
  mensajes: {
    "": "Mensajes del chat entre estudiantes",
    conversacion_id: "Conversación a la que pertenece (referencia a conversaciones._id)",
    autor_id: "Estudiante que lo escribió (referencia a usuarios._id)",
    texto: "Texto del mensaje (máximo 1000 caracteres)",
    publicacion_id: "Publicación sobre la que se consulta, si aplica (referencia a publicaciones._id)",
    fecha_envio: "Fecha de envío",
  },
  contadores: {
    "": "Secuencias para los códigos correlativos de cada colección",
    _id: "Nombre de la colección a la que pertenece la secuencia",
    secuencia: "Último código asignado",
  },
};

// Copia las descripciones al esquema, recorriendo objetos y elementos de arreglos
function describir(esquema, textos, ruta) {
  const props = esquema.properties || (esquema.items && esquema.items.properties);
  if (!props) return;
  for (const campo in props) {
    const actual = ruta ? ruta + "." + campo : campo;
    const texto = textos[actual] || COMUNES[campo];
    if (texto) props[campo].description = texto;
    describir(props[campo], textos, actual);
  }
}

function aplicar(nombre, opciones) {
  const esquema = opciones.validator.$jsonSchema;
  const textos = DESCRIPCIONES[nombre] || {};
  if (textos[""]) esquema.description = textos[""];
  describir(esquema, textos, "");
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
        // Revocaciones que un administrador dejó sin efecto (al restablecer la verificación)
        revocaciones_anteriores: {
          bsonType: "array",
          items: {
            bsonType: "object",
            properties: {
              fecha: {"bsonType":["date","null"]},
              motivo: {"bsonType":["string","null"]},
              admin_id: {"bsonType":["objectId","null"]},
              fecha_restauracion: {"bsonType":"date"},
              restaurada_por: {"bsonType":"objectId"}
            }
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
            },
            // Punto marcado por el oferente en el mapa; null si no marcó ninguno (se usa el centro de la comuna)
            punto_exacto: {
              bsonType: ["object","null"],
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
