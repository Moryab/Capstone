// Carreras de pregrado de cada institución, para elegirlas de una lista en el perfil (servicio inicializar-bd).
// Fuente: Oferta Académica 2026 del SIES (Mineduc, mifuturo.cl), sedes de la Región del Biobío. Los nombres
// vienen en mayúsculas y sin tildes: aquí van ya escritos como se leen. Las versiones vespertinas («PEV»)
// y las distintas jornadas o mallas se unen en una sola carrera. «area» es el área del conocimiento
// (CINE-F 2013) con que el SIES agrupa las carreras de nombre distinto.
// Se insertan solo si no existen (por institución y nombre): no se pisa lo agregado después.

db = db.getSiblingDB(process.env.MONGO_DB || "roommatch");

// 1000 carreras en total
const CARRERAS = {
 "UNAB": [
  [
   "Administración de Ecoturismo",
   "Servicios"
  ],
  [
   "Arquitectura",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Bachillerato en Ciencias",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Bachillerato en Ciencias de la Salud",
   "Salud y Bienestar"
  ],
  [
   "Derecho",
   "Administración de Empresas y Derecho"
  ],
  [
   "Diseño de Juegos Digitales",
   "Artes y Humanidades"
  ],
  [
   "Educación Física para la Educación General Básica",
   "Educación"
  ],
  [
   "Educación General Básica",
   "Educación"
  ],
  [
   "Enfermería",
   "Salud y Bienestar"
  ],
  [
   "Entrenador Deportivo",
   "Servicios"
  ],
  [
   "Fonoaudiología",
   "Salud y Bienestar"
  ],
  [
   "Geología",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Ingeniero en Marina Mercante",
   "Servicios"
  ],
  [
   "Ingeniería Civil",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil en Metalurgia",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil en Minas",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil Informática",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Ingeniería Comercial",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Administración de Empresas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Automatización y Robótica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Negocios Internacionales",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Kinesiología",
   "Salud y Bienestar"
  ],
  [
   "Licenciatura en Astronomía",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Medicina",
   "Salud y Bienestar"
  ],
  [
   "Medicina Veterinaria",
   "Agricultura, Silvicultura, Pesca y Veterinaria"
  ],
  [
   "Nutrición y Dietética",
   "Salud y Bienestar"
  ],
  [
   "Obstetricia",
   "Salud y Bienestar"
  ],
  [
   "Odontología",
   "Salud y Bienestar"
  ],
  [
   "Pedagogía en Educación Física",
   "Educación"
  ],
  [
   "Pedagogía en Inglés",
   "Educación"
  ],
  [
   "Pedagogía en Inglés para la Enseñanza Básica y Media",
   "Educación"
  ],
  [
   "Programa de Pedagogía en Educación Media para Licenciados (plan especial)",
   "Educación"
  ],
  [
   "Programa de Pedagogía en Educación Media para Licenciados y Titulados",
   "Educación"
  ],
  [
   "Programa de Pedagogía en Educación Media para Titulados",
   "Educación"
  ],
  [
   "Programa de Prosecución de Estudios de Pedagogía en Educación Básica",
   "Educación"
  ],
  [
   "Programa de Prosecución de Estudios en Educación Diferencial con mención en Discapacidad Intelectual",
   "Educación"
  ],
  [
   "Programa de Prosecución de Estudios en Educación Parvularia con mención en Inclusión en Contextos de Infancia",
   "Educación"
  ],
  [
   "Programa Especial de Licenciatura en Trabajo Social",
   "Salud y Bienestar"
  ],
  [
   "Psicología",
   "Ciencias Sociales, Periodismo e Información"
  ],
  [
   "Psicopedagogía",
   "Educación"
  ],
  [
   "Publicidad",
   "Administración de Empresas y Derecho"
  ],
  [
   "Química y Farmacia",
   "Salud y Bienestar"
  ],
  [
   "Tecnología Médica",
   "Salud y Bienestar"
  ],
  [
   "Terapia Ocupacional",
   "Salud y Bienestar"
  ],
  [
   "Trabajo Social",
   "Salud y Bienestar"
  ]
 ],
 "U. Bolivariana": [
  [
   "Derecho",
   "Administración de Empresas y Derecho"
  ],
  [
   "Enfermería",
   "Salud y Bienestar"
  ],
  [
   "Odontología",
   "Salud y Bienestar"
  ],
  [
   "Pedagogía en Educación Diferencial con mención Discapacidad Intelectual y Trastornos del Lenguaje",
   "Educación"
  ],
  [
   "Psicología",
   "Ciencias Sociales, Periodismo e Información"
  ]
 ],
 "UCSC": [
  [
   "Administrador de Programas Sociales",
   "Administración de Empresas y Derecho"
  ],
  [
   "Arquitectura",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Bachillerato en Ciencias y Humanidades",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Biblioteconomía y Documentación",
   "Ciencias Sociales, Periodismo e Información"
  ],
  [
   "Biología Marina",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Contador Auditor",
   "Administración de Empresas y Derecho"
  ],
  [
   "Dirección Audiovisual y Multimedia",
   "Artes y Humanidades"
  ],
  [
   "Educación de Párvulos",
   "Educación"
  ],
  [
   "Enfermería",
   "Salud y Bienestar"
  ],
  [
   "Ingeniería Civil",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil Eléctrica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil en Biotecnología Acuícola",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil Geológica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil Informática",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Ingeniería Civil Logística",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Comercial",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería de Ejecución en Administración de Empresas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería de Ejecución en Administración de Empresas mención Finanzas y Comercio Internacional",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería de Ejecución en Informática",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Ingeniería de Ejecución en Prevención de Riesgos y Medio Ambiente",
   "Servicios"
  ],
  [
   "Ingeniería de Ejecución Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería de Ejecución Industrial mención Mantenimiento y Logística",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Información y Control de Gestión",
   "Administración de Empresas y Derecho"
  ],
  [
   "Kinesiología",
   "Salud y Bienestar"
  ],
  [
   "Licenciatura en Ciencias Religiosas y Estudios Eclesiásticos",
   "Artes y Humanidades"
  ],
  [
   "Licenciatura en Ciencias Religiosas y Estudios Teológicos",
   "Artes y Humanidades"
  ],
  [
   "Licenciatura en Derecho",
   "Administración de Empresas y Derecho"
  ],
  [
   "Licenciatura en Filosofía",
   "Artes y Humanidades"
  ],
  [
   "Licenciatura en Historia",
   "Artes y Humanidades"
  ],
  [
   "Medicina",
   "Salud y Bienestar"
  ],
  [
   "Nutrición y Dietética",
   "Salud y Bienestar"
  ],
  [
   "Odontología",
   "Salud y Bienestar"
  ],
  [
   "Pedagogía en Educación Básica",
   "Educación"
  ],
  [
   "Pedagogía en Educación Diferencial",
   "Educación"
  ],
  [
   "Pedagogía en Educación Física",
   "Educación"
  ],
  [
   "Pedagogía en Educación Media en Biología y Ciencias Naturales",
   "Educación"
  ],
  [
   "Pedagogía en Educación Media en Inglés",
   "Educación"
  ],
  [
   "Pedagogía en Educación Media en Lenguaje y Comunicación",
   "Educación"
  ],
  [
   "Pedagogía en Educación Media en Matemática",
   "Educación"
  ],
  [
   "Pedagogía Media en Religión y Moral",
   "Educación"
  ],
  [
   "Periodismo",
   "Ciencias Sociales, Periodismo e Información"
  ],
  [
   "Programa de Continuidad de Estudios en Construcción Civil",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Programa de Continuidad de Estudios en Ingeniería de Ejecución en Administración de Empresas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Programa de Continuidad de Estudios en Ingeniería de Ejecución en Prevención de Riesgos",
   "Servicios"
  ],
  [
   "Programa de Continuidad de Estudios en Ingeniería de Ejecución Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Programa de Formación Pedagógica",
   "Educación"
  ],
  [
   "Programa de Formación Pedagógica para Licenciados en Ciencias Religiosas y Eclesiásticos",
   "Educación"
  ],
  [
   "Programa de Formación Pedagógica para Licenciados en Filosofía",
   "Educación"
  ],
  [
   "Programa de Formación Pedagógica para Licenciados en Historia",
   "Educación"
  ],
  [
   "Psicología",
   "Ciencias Sociales, Periodismo e Información"
  ],
  [
   "Química Ambiental",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Química Marina",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Química y Farmacia",
   "Salud y Bienestar"
  ],
  [
   "Tecnología Médica",
   "Salud y Bienestar"
  ],
  [
   "Trabajo Social",
   "Salud y Bienestar"
  ],
  [
   "Técnico Universitario Agropecuario",
   "Agricultura, Silvicultura, Pesca y Veterinaria"
  ],
  [
   "Técnico Universitario en Actividad Física y Salud",
   "Servicios"
  ],
  [
   "Técnico Universitario en Administración",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico Universitario en Administración Pública",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico Universitario en Alimentos",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico Universitario en Automatización Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico Universitario en Construcción",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico Universitario en Educación de Párvulos",
   "Educación"
  ],
  [
   "Técnico Universitario en Electricidad Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico Universitario en Electromecánica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico Universitario en Enfermería",
   "Salud y Bienestar"
  ],
  [
   "Técnico Universitario en Gastronomía Intercultural",
   "Servicios"
  ],
  [
   "Técnico Universitario en Logística",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico Universitario en Mantenimiento Predictivo",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico Universitario en Prevención de Riesgos",
   "Servicios"
  ],
  [
   "Técnico Universitario en Refrigeración y Climatización Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico Universitario en Topografía",
   "Ingeniería, Industria y Construcción"
  ]
 ],
 "UdeC": [
  [
   "Administración Pública y Ciencia Política",
   "Administración de Empresas y Derecho"
  ],
  [
   "Agronomía",
   "Agricultura, Silvicultura, Pesca y Veterinaria"
  ],
  [
   "Antropología",
   "Ciencias Sociales, Periodismo e Información"
  ],
  [
   "Arquitectura",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Artes Visuales",
   "Artes y Humanidades"
  ],
  [
   "Astronomía",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Auditoría",
   "Administración de Empresas y Derecho"
  ],
  [
   "Bachillerato en Ciencias e Innovación",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Bachillerato en Humanidades",
   "Artes y Humanidades"
  ],
  [
   "Bioingeniería",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Biología",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Biología Marina",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Bioquímica",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Ciencias Físicas",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Ciencias Físicas y Astronómicas",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Ciencias Políticas y Administrativas",
   "Ciencias Sociales, Periodismo e Información"
  ],
  [
   "Derecho",
   "Administración de Empresas y Derecho"
  ],
  [
   "Educación Diferencial",
   "Educación"
  ],
  [
   "Educación Diferencial mención Deficiencia Mental",
   "Educación"
  ],
  [
   "Educación General Básica",
   "Educación"
  ],
  [
   "Educación Parvularia",
   "Educación"
  ],
  [
   "Enfermería",
   "Salud y Bienestar"
  ],
  [
   "Fonoaudiología",
   "Salud y Bienestar"
  ],
  [
   "Geofísica",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Geografía",
   "Ciencias Sociales, Periodismo e Información"
  ],
  [
   "Geología",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Ingeniería Agroindustrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Ambiental",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil - Plan Común",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil Aeroespacial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil Biomédica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil de Materiales",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil de Minas",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil Electrónica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil Eléctrica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil en Telecomunicaciones",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil Informática",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Ingeniería Civil Matemática",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Ingeniería Civil Mecánica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil Metalúrgica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil Química",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Comercial",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería de Ejecución en Agroindustrias",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería de Ejecución en Geomensura",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Ingeniería de Ejecución Forestal",
   "Agricultura, Silvicultura, Pesca y Veterinaria"
  ],
  [
   "Ingeniería en Biotecnología Marina y Acuicultura",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Biotecnología Vegetal",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Conservación de Recursos Naturales",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Ingeniería en Prevención de Riesgos",
   "Servicios"
  ],
  [
   "Ingeniería Estadística",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Ingeniería Forestal",
   "Agricultura, Silvicultura, Pesca y Veterinaria"
  ],
  [
   "Ingeniería Geomática",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Ingeniería Matemática",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Kinesiología",
   "Salud y Bienestar"
  ],
  [
   "Licenciatura en Antropología",
   "Ciencias Sociales, Periodismo e Información"
  ],
  [
   "Licenciatura en Artes Plásticas",
   "Artes y Humanidades"
  ],
  [
   "Licenciatura en Artes Plásticas Escultura Gráfica y Pintura",
   "Artes y Humanidades"
  ],
  [
   "Licenciatura en Artes Plásticas mención Escultura",
   "Artes y Humanidades"
  ],
  [
   "Licenciatura en Artes Plásticas mención Grabado",
   "Artes y Humanidades"
  ],
  [
   "Licenciatura en Artes Plásticas mención Pintura",
   "Artes y Humanidades"
  ],
  [
   "Licenciatura en Ciencias Físicas",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Licenciatura en Física",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Licenciatura en Historia",
   "Artes y Humanidades"
  ],
  [
   "Licenciatura en Humanidades mención Español",
   "Artes y Humanidades"
  ],
  [
   "Licenciatura en Humanidades mención Filosofía",
   "Artes y Humanidades"
  ],
  [
   "Licenciatura en Humanidades mención Historia",
   "Artes y Humanidades"
  ],
  [
   "Licenciatura en Matemática",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Licenciatura en Música",
   "Artes y Humanidades"
  ],
  [
   "Licenciatura en Química - Químico",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Medicina",
   "Salud y Bienestar"
  ],
  [
   "Medicina Veterinaria",
   "Agricultura, Silvicultura, Pesca y Veterinaria"
  ],
  [
   "Nutrición y Dietética",
   "Salud y Bienestar"
  ],
  [
   "Obstetricia y Puericultura",
   "Salud y Bienestar"
  ],
  [
   "Odontología",
   "Salud y Bienestar"
  ],
  [
   "Pedagogía en Artes Plásticas",
   "Educación"
  ],
  [
   "Pedagogía en Artes Visuales",
   "Educación"
  ],
  [
   "Pedagogía en Biología",
   "Educación"
  ],
  [
   "Pedagogía en Biología y Química",
   "Educación"
  ],
  [
   "Pedagogía en Ciencias Naturales y Biología",
   "Educación"
  ],
  [
   "Pedagogía en Ciencias Naturales y Física",
   "Educación"
  ],
  [
   "Pedagogía en Ciencias Naturales y Química",
   "Educación"
  ],
  [
   "Pedagogía en Educación Diferencial Programa Especial de Titulación",
   "Educación"
  ],
  [
   "Pedagogía en Educación Física",
   "Educación"
  ],
  [
   "Pedagogía en Educación Física - Damas",
   "Educación"
  ],
  [
   "Pedagogía en Educación Física - Varones",
   "Educación"
  ],
  [
   "Pedagogía en Educación Musical",
   "Educación"
  ],
  [
   "Pedagogía en Español",
   "Educación"
  ],
  [
   "Pedagogía en Filosofía",
   "Educación"
  ],
  [
   "Pedagogía en Historia y Geografía",
   "Educación"
  ],
  [
   "Pedagogía en Idioma Extranjero",
   "Educación"
  ],
  [
   "Pedagogía en Inglés",
   "Educación"
  ],
  [
   "Pedagogía en Matemática y Computación",
   "Educación"
  ],
  [
   "Pedagogía en Matemática y Física",
   "Educación"
  ],
  [
   "Pedagogía en Matemáticas",
   "Educación"
  ],
  [
   "Pedagogía en Matemáticas y Educación Tecnológica",
   "Educación"
  ],
  [
   "Periodismo",
   "Ciencias Sociales, Periodismo e Información"
  ],
  [
   "Programa de Continuidad de Estudios en Ingeniería Comercial mención Control de Gestión",
   "Administración de Empresas y Derecho"
  ],
  [
   "Psicología",
   "Ciencias Sociales, Periodismo e Información"
  ],
  [
   "Química y Farmacia",
   "Salud y Bienestar"
  ],
  [
   "Químico Analista",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Servicio Social",
   "Salud y Bienestar"
  ],
  [
   "Sociología",
   "Ciencias Sociales, Periodismo e Información"
  ],
  [
   "Teatro",
   "Artes y Humanidades"
  ],
  [
   "Tecnología Médica",
   "Salud y Bienestar"
  ],
  [
   "Trabajo Social",
   "Salud y Bienestar"
  ],
  [
   "Traducción / Interpretación en Idiomas Extranjeros",
   "Artes y Humanidades"
  ]
 ],
 "UDLA": [
  [
   "Arquitectura",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Derecho",
   "Administración de Empresas y Derecho"
  ],
  [
   "Educación Parvularia",
   "Educación"
  ],
  [
   "Enfermería",
   "Salud y Bienestar"
  ],
  [
   "Fonoaudiología",
   "Salud y Bienestar"
  ],
  [
   "Ingeniería Civil Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Comercial",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería de Ejecución en Administración de Empresas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería de Ejecución Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Minas",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Kinesiología",
   "Salud y Bienestar"
  ],
  [
   "Licenciatura en Ciencias de la Actividad Física",
   "Servicios"
  ],
  [
   "Medicina Veterinaria",
   "Agricultura, Silvicultura, Pesca y Veterinaria"
  ],
  [
   "Nutrición y Dietética",
   "Salud y Bienestar"
  ],
  [
   "Pedagogía en Educación Básica",
   "Educación"
  ],
  [
   "Pedagogía en Educación Diferencial",
   "Educación"
  ],
  [
   "Pedagogía en Educación Física",
   "Educación"
  ],
  [
   "Pedagogía en Inglés",
   "Educación"
  ],
  [
   "Psicología",
   "Ciencias Sociales, Periodismo e Información"
  ],
  [
   "Terapia Ocupacional",
   "Salud y Bienestar"
  ],
  [
   "Trabajo Social",
   "Salud y Bienestar"
  ],
  [
   "Traducción e Interpretación en Inglés",
   "Artes y Humanidades"
  ],
  [
   "Técnico de Nivel Superior en Administración de Empresas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico de Nivel Superior Veterinario",
   "Agricultura, Silvicultura, Pesca y Veterinaria"
  ]
 ],
 "UBB": [
  [
   "Arquitectura",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Bachillerato en Ciencias",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Bachillerato en Ciencias Naturales y Exactas",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Contador Público y Auditor",
   "Administración de Empresas y Derecho"
  ],
  [
   "Contador Público y Auditor mención Control de Gestión",
   "Administración de Empresas y Derecho"
  ],
  [
   "Contador Público y Auditor mención Gestión Tributaria",
   "Administración de Empresas y Derecho"
  ],
  [
   "Contador Público y Auditor mención Tecnología de la Información, Control de Gestión, Gestión Tributaria",
   "Administración de Empresas y Derecho"
  ],
  [
   "Contador Público y Auditor mención Tecnologías de la Información",
   "Administración de Empresas y Derecho"
  ],
  [
   "Derecho",
   "Administración de Empresas y Derecho"
  ],
  [
   "Diseño Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil Eléctrica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil en Automatización",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil en Industrias de la Madera",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil en Informática",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Ingeniería Civil Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil Mecánica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil Química",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Comercial",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería de Ejecución en Administración de Empresas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería de Ejecución en Computación e Informática",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Ingeniería de Ejecución en Electricidad",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería de Ejecución en Electrónica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería de Ejecución en Mecánica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Electrónica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Eléctrica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Construcción",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Estadística",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Ingeniería Mecánica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Trabajo Social",
   "Salud y Bienestar"
  ],
  [
   "Técnico de Nivel Superior en Contabilidad",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico Universitario en Administración",
   "Administración de Empresas y Derecho"
  ]
 ],
 "UDD": [
  [
   "Arquitectura",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Derecho",
   "Administración de Empresas y Derecho"
  ],
  [
   "Diseño",
   "Artes y Humanidades"
  ],
  [
   "Enfermería",
   "Salud y Bienestar"
  ],
  [
   "Ingeniería Civil en Informática e Innovación Tecnológica",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Ingeniería Civil en Minería",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Comercial",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Ejecución en Administración",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Ejecución en Administración mención Marketing y Finanzas Aplicadas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Kinesiología",
   "Salud y Bienestar"
  ],
  [
   "Nutrición y Dietética",
   "Salud y Bienestar"
  ],
  [
   "Odontología",
   "Salud y Bienestar"
  ],
  [
   "Periodismo",
   "Ciencias Sociales, Periodismo e Información"
  ],
  [
   "Periodismo y Comunicación",
   "Ciencias Sociales, Periodismo e Información"
  ],
  [
   "Psicología",
   "Ciencias Sociales, Periodismo e Información"
  ]
 ],
 "USS": [
  [
   "Administración Pública",
   "Administración de Empresas y Derecho"
  ],
  [
   "Animación Digital",
   "Artes y Humanidades"
  ],
  [
   "Arquitectura",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Bachillerato en Ciencias de la Salud",
   "Salud y Bienestar"
  ],
  [
   "Bachillerato en Humanidades y Ciencias Sociales",
   "Artes y Humanidades"
  ],
  [
   "Derecho",
   "Administración de Empresas y Derecho"
  ],
  [
   "Educación Parvularia, Plan Prosecución de Estudios",
   "Educación"
  ],
  [
   "Enfermería",
   "Salud y Bienestar"
  ],
  [
   "Fonoaudiología",
   "Salud y Bienestar"
  ],
  [
   "Geología",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Ingeniería Civil",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil en Minas",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil Informática",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Ingeniería Comercial",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Administración de Empresas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Energía y Sustentabilidad Ambiental",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Logística y Transporte",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Kinesiología",
   "Salud y Bienestar"
  ],
  [
   "Licenciatura en Filosofía",
   "Artes y Humanidades"
  ],
  [
   "Licenciatura en Historia",
   "Artes y Humanidades"
  ],
  [
   "Licenciatura en Literatura",
   "Artes y Humanidades"
  ],
  [
   "Licenciatura en Trabajo Social",
   "Salud y Bienestar"
  ],
  [
   "Medicina",
   "Salud y Bienestar"
  ],
  [
   "Medicina Veterinaria",
   "Agricultura, Silvicultura, Pesca y Veterinaria"
  ],
  [
   "Nutrición y Dietética",
   "Salud y Bienestar"
  ],
  [
   "Obstetricia",
   "Salud y Bienestar"
  ],
  [
   "Odontología",
   "Salud y Bienestar"
  ],
  [
   "Pedagogía de Educación Media en Historia y Geografía",
   "Educación"
  ],
  [
   "Pedagogía de Educación Media en Inglés",
   "Educación"
  ],
  [
   "Pedagogía en Educación Diferencial",
   "Educación"
  ],
  [
   "Pedagogía en Educación Diferencial - Plan de Prosecución de Estudios",
   "Educación"
  ],
  [
   "Pedagogía en Educación Física",
   "Educación"
  ],
  [
   "Pedagogía en Inglés",
   "Educación"
  ],
  [
   "Programa de Formación Pedagógica para Licenciados y / o Profesionales",
   "Educación"
  ],
  [
   "Programa de Formación Pedagógica para Licenciados y / o Profesionales en el Área de Lenguaje y Comunicación",
   "Educación"
  ],
  [
   "Programa de Formación Pedagógica para Licenciados y / o Profesionales en el Área de Matemática",
   "Educación"
  ],
  [
   "Psicología",
   "Ciencias Sociales, Periodismo e Información"
  ],
  [
   "Química y Farmacia",
   "Salud y Bienestar"
  ],
  [
   "Tecnología Médica",
   "Salud y Bienestar"
  ],
  [
   "Terapia Ocupacional",
   "Salud y Bienestar"
  ],
  [
   "Trabajo Social",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Enfermería",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Enfermería e Instrumentación Quirúrgica",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Farmacia",
   "Salud y Bienestar"
  ]
 ],
 "UST": [
  [
   "Agronomía, Plan Continuidad de Estudios",
   "Agricultura, Silvicultura, Pesca y Veterinaria"
  ],
  [
   "Analista Programador",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Bachillerato en Ciencias",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Cocina Internacional y Tradicional Chilena",
   "Servicios"
  ],
  [
   "Comunicación Audiovisual Digital",
   "Artes y Humanidades"
  ],
  [
   "Construcción Civil",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Contador Auditor",
   "Administración de Empresas y Derecho"
  ],
  [
   "Derecho",
   "Administración de Empresas y Derecho"
  ],
  [
   "Diseño Gráfico",
   "Artes y Humanidades"
  ],
  [
   "Educación Básica",
   "Educación"
  ],
  [
   "Educación Diferencial",
   "Educación"
  ],
  [
   "Enfermería",
   "Salud y Bienestar"
  ],
  [
   "Fonoaudiología",
   "Salud y Bienestar"
  ],
  [
   "Gastronomía Internacional y Tradicional Chilena",
   "Servicios"
  ],
  [
   "Ingeniería Agrícola",
   "Agricultura, Silvicultura, Pesca y Veterinaria"
  ],
  [
   "Ingeniería Civil Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil Industrial, Programa Continuidad de Estudios",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Civil Informática y Sistemas Inteligentes",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Ingeniería Comercial",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería Comercial, Continuidad de Estudios",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería de Ejecución Agropecuaria",
   "Agricultura, Silvicultura, Pesca y Veterinaria"
  ],
  [
   "Ingeniería de Ejecución en Administración",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería de Ejecución en Administración de Recursos Humanos",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería de Ejecución en Prevención de Riesgos",
   "Servicios"
  ],
  [
   "Ingeniería en Administración de Empresas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Administración de Recursos Humanos",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Administración de RRHH",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Administración mención Gestión Pública",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Administración Pública y Municipal",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Geomensura",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Ingeniería en Informática",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Ingeniería en Logística",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Prevención de Riesgos",
   "Servicios"
  ],
  [
   "Ingeniería en Sonido",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Kinesiología",
   "Salud y Bienestar"
  ],
  [
   "Licenciatura en Educación, Continuidad de Estudios",
   "Educación"
  ],
  [
   "Licenciatura en Educación, Programa Cerrado Continuidad de Estudios",
   "Educación"
  ],
  [
   "Licenciatura en Trabajo Social",
   "Salud y Bienestar"
  ],
  [
   "Medicina Veterinaria",
   "Agricultura, Silvicultura, Pesca y Veterinaria"
  ],
  [
   "Nutrición y Dietética",
   "Salud y Bienestar"
  ],
  [
   "Pedagogía en Educación Física",
   "Educación"
  ],
  [
   "Pedagogía en Inglés",
   "Educación"
  ],
  [
   "Periodismo (plan especial)",
   "Ciencias Sociales, Periodismo e Información"
  ],
  [
   "Plan Especial de Licenciatura en Educación",
   "Educación"
  ],
  [
   "Preparador Físico",
   "Servicios"
  ],
  [
   "Prevención de Riesgos",
   "Servicios"
  ],
  [
   "Programa de Licenciatura de Trabajo Social",
   "Salud y Bienestar"
  ],
  [
   "Programa Licenciatura en Trabajo Social",
   "Salud y Bienestar"
  ],
  [
   "Psicología",
   "Ciencias Sociales, Periodismo e Información"
  ],
  [
   "Psicopedagogía",
   "Educación"
  ],
  [
   "Servicio Social",
   "Salud y Bienestar"
  ],
  [
   "Terapia Ocupacional",
   "Salud y Bienestar"
  ],
  [
   "Topografía",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Trabajo Social",
   "Salud y Bienestar"
  ],
  [
   "Técnico Agrícola y Ganadero",
   "Agricultura, Silvicultura, Pesca y Veterinaria"
  ],
  [
   "Técnico en Administración",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Administración de Recursos Humanos",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Administración Logística",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Comunicación Audiovisual Digital",
   "Artes y Humanidades"
  ],
  [
   "Técnico en Construcciones Civiles",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Deportes",
   "Servicios"
  ],
  [
   "Técnico en Diseño de Videojuegos",
   "Artes y Humanidades"
  ],
  [
   "Técnico en Diseño Publicitario Multimedial",
   "Artes y Humanidades"
  ],
  [
   "Técnico en Educación Especial",
   "Educación"
  ],
  [
   "Técnico en Educación Parvularia",
   "Educación"
  ],
  [
   "Técnico en Educación Parvularia 1° y 2° Básico",
   "Educación"
  ],
  [
   "Técnico en Enfermería",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Enfermería mención Terapias Complementarias",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Enfermería y Procedimientos de Apoyo a la Rehabilitación",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Farmacia",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Gestión Turística",
   "Servicios"
  ],
  [
   "Técnico en Odontología mención Higienista Dental",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Plataformas Informáticas",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Técnico en Podología Clínica",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Registros e Información Biomédica",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Sonido",
   "Artes y Humanidades"
  ],
  [
   "Técnico en Trabajo Social",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Turismo",
   "Servicios"
  ],
  [
   "Técnico en Veterinaria y Producción Pecuaria",
   "Agricultura, Silvicultura, Pesca y Veterinaria"
  ]
 ],
 "UTFSM": [
  [
   "Ingeniería Comercial",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería de Ejecución en Control e Instrumentación Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería de Ejecución en Gestión de la Calidad",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería de Ejecución en Gestión Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería de Ejecución en Gestión y Control Ambiental",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería de Ejecución en Mantenimiento Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería de Ejecución en Proyectos Estructurales",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería de Ejecución Mecánica de Procesos y Mantenimiento Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería de Ejecución Químico mención Control",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Biotecnología",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Construcción",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Informática",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Ingeniería en Mantenimiento Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Prevención de Riesgos Laborales y Ambientales",
   "Servicios"
  ],
  [
   "Técnico Universitario Dibujante Proyectista",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico Universitario en Administración de Empresas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico Universitario en Automatización y Control",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico Universitario en Biotecnología",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico Universitario en Ciencia de Datos",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Técnico Universitario en Construcción",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico Universitario en Control Medio Ambiente",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico Universitario en Electricidad",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico Universitario en Electrónica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico Universitario en Informática",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Técnico Universitario en Mantenimiento Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico Universitario en Mecánica Automotriz",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico Universitario en Mecánica Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico Universitario en Prevención de Riesgos",
   "Servicios"
  ],
  [
   "Técnico Universitario en Química con mención en Química Industrial",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Técnico Universitario en Robótica y Mecatrónica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico Universitario en Telecomunicaciones y Redes",
   "Ingeniería, Industria y Construcción"
  ]
 ],
 "INACAP": [
  [
   "Administración de Empresas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Administración Gastronómica",
   "Servicios"
  ],
  [
   "Administración Gastronómica Internacional",
   "Servicios"
  ],
  [
   "Administración Turística Internacional",
   "Servicios"
  ],
  [
   "Analista Programador",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Animación Digital y Videojuegos",
   "Artes y Humanidades"
  ],
  [
   "Automatización y Control Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Construcción Civil",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Contabilidad General",
   "Administración de Empresas y Derecho"
  ],
  [
   "Contador Auditor",
   "Administración de Empresas y Derecho"
  ],
  [
   "Contador Público",
   "Administración de Empresas y Derecho"
  ],
  [
   "Diseño Digital Profesional",
   "Artes y Humanidades"
  ],
  [
   "Diseño Digital y Web",
   "Artes y Humanidades"
  ],
  [
   "Diseño Gráfico Profesional",
   "Artes y Humanidades"
  ],
  [
   "Diseño y Producción Gráfica",
   "Artes y Humanidades"
  ],
  [
   "Edificación",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Electricidad Industrial mención Electromecánica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Electricidad Industrial mención Instalaciones Eléctricas",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Electromecánica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Electrónica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Electrónica Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Fabricación y Montaje Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Gastronomía",
   "Servicios"
  ],
  [
   "Gastronomía Internacional",
   "Servicios"
  ],
  [
   "Gestión Turística",
   "Servicios"
  ],
  [
   "Hotelería y Servicios",
   "Servicios"
  ],
  [
   "Ingeniería Agrícola",
   "Agricultura, Silvicultura, Pesca y Veterinaria"
  ],
  [
   "Ingeniería Comercial",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería Electrónica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Eléctrica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Administración de Empresas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Administración de Empresas Financieras",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Administración de Empresas mención Finanzas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Administración de Empresas mención Marketing y Ventas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Automatización y Control Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Automatización y Robótica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Ciberseguridad",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Ingeniería en Construcción",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Electricidad mención Potencia",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Electricidad mención Proyectos de Instalaciones Eléctricas",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Electrónica y Sistemas Inteligentes",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Energía",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Geomensura",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Ingeniería en Geomensura y Geomática",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Ingeniería en Gestión Turística",
   "Servicios"
  ],
  [
   "Ingeniería en Informática",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Ingeniería en Logística",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Mantenimiento Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Maquinaria Pesada y Vehículos Automotrices",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Maquinaria, Vehículos Automotrices y Sistemas Electrónicos",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Mecatrónica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Mecánica y Electromovilidad Automotriz",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Prevención de Riesgos y Gestión del Riesgo de Desastres",
   "Servicios"
  ],
  [
   "Ingeniería en Prevención de Riesgos, Calidad y Ambiente",
   "Servicios"
  ],
  [
   "Ingeniería en Telecomunicaciones y Servicios Digitales",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Telecomunicaciones, Conectividad y Redes",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Financiera",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Mecánica en Mantenimiento Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería Mecánica en Producción Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Logística y Operaciones Industriales",
   "Administración de Empresas y Derecho"
  ],
  [
   "Mecánica Automotriz en Maquinaria Pesada",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Mecánica Automotriz en Sistemas Electrónicos",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Nutrición y Dietética",
   "Salud y Bienestar"
  ],
  [
   "Plan Especial Titulación Ingeniería en Informática",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Prevención de Riesgos",
   "Servicios"
  ],
  [
   "Psicopedagogía",
   "Educación"
  ],
  [
   "Sistema Especial de Titulación Licenciatura en Trabajo Social",
   "Salud y Bienestar"
  ],
  [
   "Telecomunicaciones, Conectividad y Redes",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Topografía",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Trabajo Social",
   "Salud y Bienestar"
  ],
  [
   "Traducción Inglés - Español mención Negocios Internacionales",
   "Artes y Humanidades"
  ],
  [
   "Turismo",
   "Servicios"
  ],
  [
   "Técnico Agrícola",
   "Agricultura, Silvicultura, Pesca y Veterinaria"
  ],
  [
   "Técnico en Administración de Empresas Financieras",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Administración Pública",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Automatización y Robótica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Construcción",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Diseño Digital",
   "Artes y Humanidades"
  ],
  [
   "Técnico en Electricidad Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Energías Renovables",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Enfermería",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Farmacia",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Logística",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Mantenimiento Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Mecatrónica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Mecánica y Electromovilidad Automotriz",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Prevención de Riesgos y Gestión de Emergencia",
   "Servicios"
  ],
  [
   "Técnico en Telecomunicaciones y Servicios Digitales",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Topografía y Geomática",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico Financiero",
   "Administración de Empresas y Derecho"
  ]
 ],
 "AIEP": [
  [
   "Administración de Empresas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Administración Pública",
   "Administración de Empresas y Derecho"
  ],
  [
   "Análisis de Datos",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Asistente de Párvulos",
   "Educación"
  ],
  [
   "Auditoría",
   "Administración de Empresas y Derecho"
  ],
  [
   "Construcción Civil",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Contabilidad General",
   "Administración de Empresas y Derecho"
  ],
  [
   "Diseño de Vestuario mención Alta Costura",
   "Artes y Humanidades"
  ],
  [
   "Diseño Gráfico",
   "Artes y Humanidades"
  ],
  [
   "Entrenador Personal",
   "Servicios"
  ],
  [
   "Estética Profesional",
   "Servicios"
  ],
  [
   "Gestión de Personas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería de Ejecución en Administración de Empresas mención Finanzas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería de Ejecución en Administración de Empresas mención Marketing",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería de Ejecución en Administración de Empresas mención Recursos Humanos",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería de Ejecución en Gestión de Empresas mención en Marketing",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería de Ejecución en Gestión de Empresas mención Recursos Humanos",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería de Ejecución en Informática",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Ingeniería de Ejecución en Informática mención Desarrollo de Sistemas",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Ingeniería en Administración de Empresas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Automatización y Control Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Ciberseguridad",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Ingeniería en Comercio Internacional",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Data Science",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Ingeniería en Electricidad y Energías Renovables",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Gestión de Personas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Gestión Financiera",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Informática",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Ingeniería en Mecánica Automotriz y Autotrónica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Operaciones Logísticas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Prevención de Riesgos",
   "Servicios"
  ],
  [
   "Ingeniería Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Operaciones Logísticas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Podología Clínica",
   "Salud y Bienestar"
  ],
  [
   "Programación Computacional",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Programación y Análisis de Sistemas",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Psicopedagogía",
   "Educación"
  ],
  [
   "Relaciones Públicas Corporativas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Teatro",
   "Artes y Humanidades"
  ],
  [
   "Trabajo Social",
   "Salud y Bienestar"
  ],
  [
   "Técnico de Nivel Superior en Gestión de Empresas mención Marketing",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico de Nivel Superior en Gestión de Empresas mención Recursos Humanos",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico Deportivo",
   "Servicios"
  ],
  [
   "Técnico en Administración de Empresas mención Finanzas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Administración de Empresas mención Logística",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Administración de Empresas mención Marketing",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Administración de Empresas mención Recursos Humanos",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Administración Pública",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Automatización y Control Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Ciberseguridad",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Técnico en Comercio Electrónico",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Comunicación y Relaciones Públicas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Construcción",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Cosmetología",
   "Servicios"
  ],
  [
   "Técnico en Desarrollo de Aplicaciones Móviles",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Técnico en Dibujo de Arquitectura y Obras Civiles",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Diseño de Vestuario",
   "Artes y Humanidades"
  ],
  [
   "Técnico en Diseño Gráfico",
   "Artes y Humanidades"
  ],
  [
   "Técnico en Educación Especial",
   "Educación"
  ],
  [
   "Técnico en Educación Parvularia 1 y 2 Básico",
   "Educación"
  ],
  [
   "Técnico en Electricidad y Electrónica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Electricidad y Energías Renovables",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Enfermería",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Enfermería e Instrumentación Quirúrgica",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Enfermería en Imagenología",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Enfermería mención Geriatría",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Enfermería mención Ginecobstetricia",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Enfermería mención Oncología",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Enfermería mención Pediatría",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Enfermería mención Salud Mental",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Enfermería mención Urgencia",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Farmacia",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Gestión de Empresas mención Finanzas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Gestión Financiera",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Gestión Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Imagenología",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Innovación Social Sustentable",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Instalación y Mantención de Redes",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Técnico en Mantenimiento Eléctrico Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Mantenimiento Mecánico",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Marketing Digital",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Masoterapia",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Mecánica Automotriz en Maquinaria Pesada",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Mecánica Automotriz y Autotrónica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Odontología",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Peluquería",
   "Servicios"
  ],
  [
   "Técnico en Prevención de Riesgos",
   "Servicios"
  ],
  [
   "Técnico en Topografía",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Trabajo Social",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Turismo",
   "Servicios"
  ],
  [
   "Técnico Jurídico",
   "Administración de Empresas y Derecho"
  ]
 ],
 "IPVC": [
  [
   "Ingeniería de Ejecución en Administración de Empresas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería de Ejecución en Administración de Empresas (continuidad)",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería de Ejecución en Administración de Empresas, Continuidad",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería de Ejecución en Administración Pública",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería de Ejecución en Administración Pública (continuidad)",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería de Ejecución en Administración Pública, Continuidad",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería de Ejecución en Gestión de Seguridad Privada",
   "Servicios"
  ],
  [
   "Ingeniería de Ejecución en Gestión de Seguridad Privada (continuidad)",
   "Servicios"
  ],
  [
   "Ingeniería en Ciberseguridad",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Ingeniería en Gestión Logística",
   "Administración de Empresas y Derecho"
  ],
  [
   "Pedagogía en Inglés",
   "Educación"
  ],
  [
   "Podología",
   "Salud y Bienestar"
  ],
  [
   "psicopedagogia(continuidad)",
   "Educación"
  ],
  [
   "Psicopedagogía",
   "Educación"
  ],
  [
   "Psicopedagogía (continuidad)",
   "Educación"
  ],
  [
   "Servicio Social",
   "Salud y Bienestar"
  ],
  [
   "Trabajo Social",
   "Salud y Bienestar"
  ],
  [
   "Trabajo Social (continuidad)",
   "Salud y Bienestar"
  ],
  [
   "Trabajo Social, Continuidad",
   "Salud y Bienestar"
  ],
  [
   "Técnico de Nivel Superior en Administración de Empresas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico de Nivel Superior en Administración de Empresas mención en Emprendimiento",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico de Nivel Superior en Administración de Empresas mención en Recursos Humanos",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico de Nivel Superior en Administración de Empresas mención Finanzas y Contabilidad",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico de Nivel Superior en Administración de Empresas mención Recursos Humanos",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico de Nivel Superior en Administración en Salud",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico de Nivel Superior en Administración mención Gestión Municipal",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico de Nivel Superior en Administración Pública",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico de Nivel Superior en Asistente de la Educación",
   "Educación"
  ],
  [
   "Técnico de Nivel Superior en Ciberseguridad",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Técnico de Nivel Superior en Construcción",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico de Nivel Superior en Contabilidad y Análisis de Cuentas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico de Nivel Superior en Educación Diferencial",
   "Educación"
  ],
  [
   "Técnico de Nivel Superior en Educación Parvularia",
   "Educación"
  ],
  [
   "Técnico de Nivel Superior en Educación Parvularia mención Trastornos Específicos del Lenguaje",
   "Educación"
  ],
  [
   "Técnico de Nivel Superior en Enfermería",
   "Salud y Bienestar"
  ],
  [
   "Técnico de Nivel Superior en Estética Corporal",
   "Servicios"
  ],
  [
   "Técnico de Nivel Superior en Gestión Agroindustrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico de Nivel Superior en Gestión de Recursos Humanos",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico de Nivel Superior en Gestión de Seguridad Privada",
   "Servicios"
  ],
  [
   "Técnico de Nivel Superior en Gestión Logística",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico de Nivel Superior en Logística y Operaciones Industriales",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico de Nivel Superior en Mantención Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico de Nivel Superior en Marketing y Ventas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico de Nivel Superior en Masoterapia",
   "Salud y Bienestar"
  ],
  [
   "Técnico de Nivel Superior en Minas",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico de Nivel Superior en Odontología",
   "Salud y Bienestar"
  ],
  [
   "Técnico de Nivel Superior en Podología",
   "Salud y Bienestar"
  ],
  [
   "Técnico de Nivel Superior en Prevención de Riesgos",
   "Servicios"
  ],
  [
   "Técnico de Nivel Superior en Relaciones Públicas y Comunicación",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico de Nivel Superior en Terapias Naturales",
   "Salud y Bienestar"
  ],
  [
   "Técnico de Nivel Superior en Trabajo Social",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Construcción",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Educación Diferencial",
   "Educación"
  ],
  [
   "Técnico en Enfermería",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Traducción Inglés - Español",
   "Artes y Humanidades"
  ],
  [
   "Técnico Veterinario",
   "Agricultura, Silvicultura, Pesca y Veterinaria"
  ]
 ],
 "IPDP": [
  [
   "Construcción Civil",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Contador Auditor",
   "Administración de Empresas y Derecho"
  ],
  [
   "Gastronomía",
   "Servicios"
  ],
  [
   "Ingeniería en Administración de Empresas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Administración Pública y Municipal",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Geomensura",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Ingeniería en Gestión Forestal",
   "Agricultura, Silvicultura, Pesca y Veterinaria"
  ],
  [
   "Ingeniería en Logística Operativa",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Prevención de Riesgos",
   "Servicios"
  ],
  [
   "Nutrición y Dietética",
   "Salud y Bienestar"
  ],
  [
   "Plan Especial de Técnico en Topografía",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Plan Especial de Técnico Nivel Superior en Enfermería",
   "Salud y Bienestar"
  ],
  [
   "Plan Especial Ingeniería en Construcción",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Plan Especial Podología Clínica",
   "Salud y Bienestar"
  ],
  [
   "Plan Especial Técnico en Administración Pública y Municipal",
   "Administración de Empresas y Derecho"
  ],
  [
   "Profesional Internacional Gastronómico en Artes Culinarias",
   "Servicios"
  ],
  [
   "Psicopedagogía",
   "Educación"
  ],
  [
   "Relaciones Públicas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Servicio Social",
   "Salud y Bienestar"
  ],
  [
   "Técnico de Nivel Superior en Educación Parvularia",
   "Educación"
  ],
  [
   "Técnico de Nivel Superior en Podología",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Bibliotecología",
   "Ciencias Sociales, Periodismo e Información"
  ],
  [
   "Técnico en Enfermería",
   "Salud y Bienestar"
  ],
  [
   "Técnico Forestal",
   "Agricultura, Silvicultura, Pesca y Veterinaria"
  ]
 ],
 "IPVG": [
  [
   "Auditoría",
   "Administración de Empresas y Derecho"
  ],
  [
   "Diseño Gráfico",
   "Artes y Humanidades"
  ],
  [
   "Ingeniería (e) en Medioambiente y Sustentabilidad",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería (e) en Medioambiente y Sustentabilidad - PE",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería de Ejecución Electrónica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería de Ejecución en Administración",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería de Ejecución en Administración - PE",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería de Ejecución en Automatización y Control - PE",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería de Ejecución en Computación e Informática",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Ingeniería de Ejecución en Computación e Informática - PE",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Ingeniería de Ejecución en Electricidad",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería de Ejecución en Electricidad - PE",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería de Ejecución en Energías Renovables y Sustentabilidad Ambiental",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería de Ejecución en Energías Renovables y Sustentabilidad Ambiental - PE",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería de Ejecución en Gestión Logística - PE",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería de Ejecución en Logística Marítima Portuaria",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería de Ejecución en Logística Marítima Portuaria - PE",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería de Ejecución en Mantenimiento Industrial - PE",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería de Ejecución en Mecánica Automotriz y Maquinaria Pesada - PE",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería de Ejecución en Minas",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería de Ejecución en Prevención de Riesgos",
   "Servicios"
  ],
  [
   "Ingeniería de Ejecución en Prevención de Riesgos - PE",
   "Servicios"
  ],
  [
   "Ingeniería de Ejecución en Química y Medio Ambiente - PE",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería de Ejecución Industrial - PE",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería de Ejecución Mecánica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería de Ejecución Mecánica - PE",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Administración",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Administración - PE",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Construcción",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Construcción - PE",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Data Science - PE",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Ingeniería en Informática",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Ingeniería en Informática - PE",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Psicopedagogía (pe)",
   "Educación"
  ],
  [
   "Técnico Analista Programador",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Técnico en Administración",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Administración Financiera",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Administración mención Marketing Digital",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Administración mención Recursos Humanos",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Administración Pública",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Automatización y Control",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Comercio Exterior",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Conectividad y Redes",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Técnico en Construcción",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Contabilidad y Legislación Tributaria",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Educación Básica",
   "Educación"
  ],
  [
   "Técnico en Educación de Párvulos",
   "Educación"
  ],
  [
   "Técnico en Educación Diferencial",
   "Educación"
  ],
  [
   "Técnico en Electricidad",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Electromecánica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Electrónica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Energías Renovables y Eficiencia Energética",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Enfermería",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Enfermería mención Atención a Personas Mayores",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Exploración Minera",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Geometalurgia",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Instrumentación y Control",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Logística",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Logística Marítima Portuaria",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Mantenimiento Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Mantenimiento y Operación de Equipos Mineros",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Mecánica Automotriz y Maquinaria Pesada",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Mecánica Automotriz y Sistemas Electrónicos",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Medioambiente",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Técnico en Minería",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Odontología e Higienista Dental",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Prevención de Riesgos",
   "Servicios"
  ],
  [
   "Técnico en Prevención y Rehabilitación en Drogodependencia",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Topografía",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Trabajo Social",
   "Salud y Bienestar"
  ],
  [
   "Técnico Entrenador Deportivo",
   "Servicios"
  ],
  [
   "Técnico Gestor Deportivo",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico Higienista Dental",
   "Salud y Bienestar"
  ],
  [
   "Técnico Laboratorista Clínico y Banco de Sangre",
   "Salud y Bienestar"
  ],
  [
   "Técnico Laboratorista Dental",
   "Salud y Bienestar"
  ],
  [
   "Técnico Químico Analista Industrial",
   "Ciencias naturales, matemáticas y estadística"
  ]
 ],
 "Duoc UC": [
  [
   "Administración de Empresas mención Marketing",
   "Administración de Empresas y Derecho"
  ],
  [
   "Administración de Recursos Humanos",
   "Administración de Empresas y Derecho"
  ],
  [
   "Administración de Redes Computacionales",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Administración en Turismo y Hospitalidad",
   "Servicios"
  ],
  [
   "Administración Financiera",
   "Administración de Empresas y Derecho"
  ],
  [
   "Administración Turística",
   "Servicios"
  ],
  [
   "Analista Programador Computacional",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Animación Digital",
   "Artes y Humanidades"
  ],
  [
   "Comercio Exterior",
   "Administración de Empresas y Derecho"
  ],
  [
   "Comunicación Audiovisual",
   "Artes y Humanidades"
  ],
  [
   "Contabilidad General mención Legislación Tributaria",
   "Administración de Empresas y Derecho"
  ],
  [
   "Desarrollo y Diseño Web",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Dibujo Arquitectónico y Estructural",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Dibujo y Modelamiento Arquitectónico y Estructural",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Diseño de Ambientes",
   "Artes y Humanidades"
  ],
  [
   "Diseño Gráfico",
   "Artes y Humanidades"
  ],
  [
   "Diseño Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Diseño Industrial e Innovación en Productos",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ecoturismo",
   "Servicios"
  ],
  [
   "Gastronomía",
   "Servicios"
  ],
  [
   "Gastronomía Internacional",
   "Servicios"
  ],
  [
   "Ilustración",
   "Artes y Humanidades"
  ],
  [
   "Ilustración para Contextos Globales",
   "Artes y Humanidades"
  ],
  [
   "Informática Biomédica",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Ingeniería en Administración",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Administración de Recursos Humanos",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Administración mención Finanzas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Administración mención Gestión de Personas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Administración mención Marketing",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Comercio Exterior",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Conectividad y Redes",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Ingeniería en Construcción",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Electricidad y Automatización Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Electricidad y Electrónica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Gestión Logística",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Informática",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Ingeniería en Mantenimiento Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Maquinaria y Vehículos Pesados",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Marketing",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Marketing Digital",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Mecánica Automotriz y Autotrónica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Prevención de Riesgos",
   "Servicios"
  ],
  [
   "Ingeniería en Redes y Telecomunicaciones",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Ingeniería en Sonido",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Producción Web",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Publicidad",
   "Administración de Empresas y Derecho"
  ],
  [
   "Relaciones Públicas mención Marketing",
   "Administración de Empresas y Derecho"
  ],
  [
   "Relaciones Públicas y Comunicación Organizacional",
   "Administración de Empresas y Derecho"
  ],
  [
   "Tecnología en Sonido",
   "Artes y Humanidades"
  ],
  [
   "Turismo de Aventura",
   "Servicios"
  ],
  [
   "Turismo Técnico mención Empresas Turísticas",
   "Servicios"
  ],
  [
   "Turismo y Hotelería",
   "Servicios"
  ],
  [
   "Técnico Audiovisual",
   "Artes y Humanidades"
  ],
  [
   "Técnico de Enfermería",
   "Salud y Bienestar"
  ],
  [
   "Técnico de Laboratorio Clínico y Banco de Sangre",
   "Salud y Bienestar"
  ],
  [
   "Técnico de Radiodiagnóstico y Radioterapia",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Administración",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Ambientación y Vitrinismo",
   "Artes y Humanidades"
  ],
  [
   "Técnico en Construcción",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Diseño Gráfico",
   "Artes y Humanidades"
  ],
  [
   "Técnico en Diseño Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Electricidad y Automatización Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Finanzas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Gestión de Eventos",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Gestión de Personas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Gestión Logística",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Mantenimiento Electromecánico",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Mantenimiento Electromecánico mención Industrias",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Mantenimiento Electromecánico mención Minería",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Mantenimiento Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Mantenimiento Predictivo mención Minería",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Maquinaria y Vehículos Pesados",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Marketing",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Mecánica Automotriz y Autotrónica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Odontología",
   "Salud y Bienestar"
  ],
  [
   "Técnico en Prevención de Riesgos",
   "Servicios"
  ],
  [
   "Técnico en Prevención de Riesgos Laborales",
   "Servicios"
  ],
  [
   "Técnico en Producción Gráfica",
   "Artes y Humanidades"
  ],
  [
   "Técnico en Redes y Telecomunicaciones",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico en Turismo y Hospitalidad",
   "Servicios"
  ],
  [
   "Técnico en Turismo y Hotelería",
   "Servicios"
  ]
 ],
 "IEB": [
  [
   "Contador Auditor con mención en Banca e Instituciones Financieras",
   "Administración de Empresas y Derecho"
  ],
  [
   "Contador de Empresas Financieras",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Administración de Empresas Financieras",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería Financiera",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico en Administración de Empresas Financieras",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico Financiero",
   "Administración de Empresas y Derecho"
  ]
 ],
 "IPG": [
  [
   "Construcción Civil (plan continuidad)",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Construcción Civil Nivel Profesional",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Construcción Civil Profesional",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería de Ejecución Industrial Plan Continuidad",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería de Ejecución Industrial Profesional",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Administración de Empresas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Administración de Empresas Nivel Profesional Plan Continuidad",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Administración de Empresas Profesional",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Administración General Nivel Profesional Plan Continuidad",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Electricidad",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Electricidad Plan Continuidad",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Ingeniería en Gestión de Recursos Humanos Plan Continuidad",
   "Administración de Empresas y Derecho"
  ],
  [
   "Ingeniería en Prevención de Riesgos, Calidad y Ambiente Plan Continuidad",
   "Servicios"
  ],
  [
   "Ingeniería Industrial Plan Continuidad",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Psicopedagogía Plan Continuidad",
   "Educación"
  ],
  [
   "Psicopedagogía Profesional",
   "Educación"
  ],
  [
   "Técnico de Nivel Superior Comercio Exterior mención Comercio Electrónico",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico de Nivel Superior en Administración de Empresas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico de Nivel Superior en Administración General",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico de Nivel Superior en Construcción Civil",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico de Nivel Superior en Contabilidad General",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico de Nivel Superior en Educación Básica",
   "Educación"
  ],
  [
   "Técnico de Nivel Superior en Educación Diferencial",
   "Educación"
  ],
  [
   "Técnico de Nivel Superior en Educación Parvularia",
   "Educación"
  ],
  [
   "Técnico de Nivel Superior en Electricidad, mención Automatización",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico de Nivel Superior en Estética Integral",
   "Servicios"
  ],
  [
   "Técnico de Nivel Superior en Farmacia",
   "Salud y Bienestar"
  ],
  [
   "Técnico de Nivel Superior en Gestión de Seguridad y Vigilancia Privada",
   "Servicios"
  ],
  [
   "Técnico de Nivel Superior en Gestión Documental y Archivística",
   "Ciencias Sociales, Periodismo e Información"
  ],
  [
   "Técnico de Nivel Superior en Gestión Logística",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico de Nivel Superior en Gestión Pública y Municipal",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico de Nivel Superior en Maquinaria Naval",
   "Servicios"
  ],
  [
   "Técnico de Nivel Superior en Masoterapia",
   "Salud y Bienestar"
  ],
  [
   "Técnico de Nivel Superior en Operaciones Portuarias",
   "Servicios"
  ],
  [
   "Técnico de Nivel Superior en Podología",
   "Salud y Bienestar"
  ],
  [
   "Técnico de Nivel Superior en Prevención de Riesgos",
   "Servicios"
  ],
  [
   "Técnico de Nivel Superior en Prevención y Rehabilitación de Adicciones",
   "Salud y Bienestar"
  ],
  [
   "Técnico de Nivel Superior en Procesos Industriales",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico de Nivel Superior en Programación y Análisis de Sistemas",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Técnico de Nivel Superior en Terapias Complementarias de Salud",
   "Salud y Bienestar"
  ],
  [
   "Técnico de Nivel Superior en Topografía",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico de Nivel Superior en Trabajo Social",
   "Salud y Bienestar"
  ],
  [
   "Técnico de Nivel Superior en Transporte Marítimo",
   "Servicios"
  ],
  [
   "Técnico en Enfermería de Nivel Superior",
   "Salud y Bienestar"
  ],
  [
   "Técnico Preparador Físico de Nivel Superior",
   "Servicios"
  ]
 ],
 "IPP": [
  [
   "Ingeniería en Control de Gestión",
   "Administración de Empresas y Derecho"
  ],
  [
   "Servicio Social",
   "Salud y Bienestar"
  ]
 ],
 "CEDUC UCN": [
  [
   "Administración Bilingüe",
   "Administración de Empresas y Derecho"
  ],
  [
   "Administración de Empresas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Administración de Empresas mención Logística",
   "Administración de Empresas y Derecho"
  ],
  [
   "Administración mención Gestión Pública",
   "Administración de Empresas y Derecho"
  ],
  [
   "Computación e Informática mención Ciberseguridad",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Computación e Informática mención Programación",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Construcción",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Educación de Párvulos",
   "Educación"
  ],
  [
   "Educación General",
   "Educación"
  ],
  [
   "Electricidad y Eficiencia Energética",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Electricidad y Electrónica Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Electromecánica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Enfermería y Telemedicina",
   "Salud y Bienestar"
  ],
  [
   "Gastronomía Territorial e Intercultural",
   "Servicios"
  ],
  [
   "Instrumentación y Control Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Intervención y Rehabilitación Psicosocial",
   "Salud y Bienestar"
  ],
  [
   "Mantenimiento Industrial y Mecatrónica",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Maquinaria Pesada",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Mecánica de Equipo Pesado",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Prevención de Riesgos",
   "Servicios"
  ]
 ],
 "CFT Biobío": [
  [
   "Técnico de Nivel Superior en Administración de Empresas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico de Nivel Superior en Administración Pública",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico de Nivel Superior en Educación Inicial",
   "Educación"
  ],
  [
   "Técnico de Nivel Superior en Enfermería",
   "Salud y Bienestar"
  ],
  [
   "Técnico de Nivel Superior en Gastronomía Intercultural",
   "Servicios"
  ],
  [
   "Técnico de Nivel Superior en Gestión de Calidad y Medioambiente",
   "Ciencias naturales, matemáticas y estadística"
  ],
  [
   "Técnico de Nivel Superior en Gestión de Recursos Naturales",
   "Agricultura, Silvicultura, Pesca y Veterinaria"
  ],
  [
   "Técnico de Nivel Superior en Informática mención Ciberseguridad",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Técnico de Nivel Superior en Logística y Abastecimiento",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico de Nivel Superior en Mantenimiento Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico de Nivel Superior en Marketing Digital mención Diseño",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico de Nivel Superior en Tecnologías Digitales y Ciberseguridad",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Técnico de Nivel Superior en Trabajo Social",
   "Salud y Bienestar"
  ]
 ],
 "CFT Lota-Arauco": [
  [
   "Administración de Empresas",
   "Administración de Empresas y Derecho"
  ],
  [
   "Administración de Redes y Soporte Computacional",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Administración Portuaria Pesquero Artesanal",
   "Servicios"
  ],
  [
   "Administración Pública",
   "Administración de Empresas y Derecho"
  ],
  [
   "Computación e Informática",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Construcción",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Construcción de Viviendas en Madera",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Construcción en Madera",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Dibujo y Proyecto Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Diseño y Programación Multimedia",
   "Artes y Humanidades"
  ],
  [
   "Diseño y Programación Web",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Educación de Párvulo",
   "Educación"
  ],
  [
   "Educación de Párvulos",
   "Educación"
  ],
  [
   "Educación Diferencial",
   "Educación"
  ],
  [
   "Electricidad Industrial y Sistemas Eléctricos",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Gestión Portuaria y Pesquera",
   "Servicios"
  ],
  [
   "Gestión Turística",
   "Servicios"
  ],
  [
   "Instrumentación y Automatización Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Logística",
   "Administración de Empresas y Derecho"
  ],
  [
   "Mecánica Industrial",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Prevención de Riesgos",
   "Servicios"
  ],
  [
   "Procesos Industriales Madereros",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Refrigeración Industrial y Aire Acondicionado",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Refrigeración Industrial y Climatización",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Trabajo Social",
   "Salud y Bienestar"
  ],
  [
   "Turismo y Gastronomía",
   "Servicios"
  ],
  [
   "Técnico de Nivel Superior en Administración Pública",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico de Nivel Superior en Analista Programador",
   "Tecnología de la Información y la Comunicación (TIC)"
  ],
  [
   "Técnico de Nivel Superior en Construcción",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico de Nivel Superior en Educación de Párvulos",
   "Educación"
  ],
  [
   "Técnico de Nivel Superior en Gestión de Recursos Humanos",
   "Administración de Empresas y Derecho"
  ],
  [
   "Técnico de Nivel Superior en Industrias de la Madera",
   "Ingeniería, Industria y Construcción"
  ],
  [
   "Técnico de Nivel Superior en Prevención de Riesgos y Gestión Sustentable",
   "Servicios"
  ],
  [
   "Técnico de Nivel Superior en Prevención de Riesgos y Sustentabilidad",
   "Servicios"
  ]
 ]
};

for (const [sigla, carreras] of Object.entries(CARRERAS)) {
  const institucion = db.instituciones.findOne({ sigla }, { _id: 1 });
  if (!institucion) continue;
  for (const [nombre, area] of carreras) {
    db.carreras.updateOne(
      { institucion_id: institucion._id, nombre },
      { $setOnInsert: { institucion_id: institucion._id, nombre, area, fuente: "SIES 2026", activa: true } },
      { upsert: true }
    );
  }
}

print("Carreras listas");
