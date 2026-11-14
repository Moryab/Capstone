"""Datos de demostración de RoomMatch: estudiantes, alojamientos, convivencias, chats y reportes.

Uso (con la plataforma levantada, desde esta carpeta; en el servidor, con sudo):
    python datos_demo.py crear     -> carga los datos (solo si aún no están)
    python datos_demo.py borrar    -> quita todo lo que cargó y deja la base como antes

Simula unos cuatro meses de uso real en el Gran Concepción. Las fechas se calculan desde el día en que
se ejecuta. Incluye una convivencia activa de la cuenta no.goler@duocuc.cl (oferente, con su
publicación) que ya cumplió el mes, para mostrar el formulario de evaluación de la convivencia.

Corre dentro del contenedor de la API para usar el mismo cálculo de compatibilidad y de propuestas
que la plataforma. Todo lo que crea queda marcado con «demo: true»; de la cuenta de no.goler y de su
publicación solo corre las fechas hacia atrás (para que la convivencia sea coherente) y «borrar» las
devuelve a como estaban. Las cuentas de demostración usan la clave CLAVE_DEMO.
"""

import os
import subprocess
import sys
from pathlib import Path

CLAVE_DEMO = "RoomMatch2026"
CORREO_CONVIVENCIA = "no.goler@duocuc.cl"

# ---------- Fuera del contenedor: se vuelve a ejecutar dentro de la API ----------
if __name__ == "__main__" and not os.environ.get("ROOMMATCH_DENTRO_API"):
    if len(sys.argv) != 2 or sys.argv[1] not in ("crear", "borrar"):
        sys.exit(__doc__)
    compose = Path(__file__).resolve().parent.parent / "Aplicación" / "docker-compose.yml"
    with open(__file__, "rb") as script:
        resultado = subprocess.run(
            ["docker", "compose", "-f", str(compose), "exec", "-T", "-e", "ROOMMATCH_DENTRO_API=1",
             "api", "python", "-", sys.argv[1]],
            stdin=script,
        )
    sys.exit(resultado.returncode)

# ---------- Dentro del contenedor de la API ----------
import asyncio  # noqa: E402
import random  # noqa: E402
from datetime import datetime, timedelta, timezone  # noqa: E402

from bson import ObjectId  # noqa: E402

from app.compatibilidad import recalcular_todos  # noqa: E402
from app.db import db, siguiente_codigo  # noqa: E402
from app.matching import generar_propuestas  # noqa: E402
from app.security import cifrar_password  # noqa: E402

AHORA = datetime.now(timezone.utc)
random.seed(2026)

# Colecciones donde se crean documentos (se marcan con demo: true para poder borrarlos)
COLECCIONES = ("usuarios", "publicaciones", "compatibilidades", "matches", "conversaciones", "mensajes",
               "reportes", "acciones_moderacion", "notificaciones", "historial_cuestionario")


def hace(dias: float = 0, horas: float = 0, minutos: float = 0) -> datetime:
    return AHORA - timedelta(days=dias, hours=horas, minutes=minutos)


def rut_con_dv(numero: int) -> str:
    suma, factor = 0, 2
    for digito in reversed(str(numero)):
        suma += int(digito) * factor
        factor = 2 if factor == 7 else factor + 1
    dv = 11 - suma % 11
    return f"{numero}-{'0' if dv == 11 else 'K' if dv == 10 else dv}"


def nacimiento(anio: int, mes: int, dia: int) -> datetime:
    return datetime(anio, mes, dia, tzinfo=timezone.utc)


F, I, X = "flexible", "importante", "imprescindible"
CATEGORIAS = ("horario_sueno", "horario_estudio", "orden_limpieza", "ruido", "visitas", "fumar", "mascotas")

# ---------------------------------------------------------------------------------------------
# Estudiantes. clave: (nombre, ap_paterno, ap_materno, género, nacimiento, correo, rut, teléfono,
#   institución (sigla), sede, carrera, año de ingreso, ciudad y región de origen, dirección allá,
#   descripción, rol, días desde el registro, respuestas del cuestionario, importancia)
# ---------------------------------------------------------------------------------------------
ESTUDIANTES = {
    # --- Ofrecen un espacio ---
    "javiera": dict(nombre="Javiera", ap_paterno="Muñoz", ap_materno="Contreras", genero="femenino",
                    nac=nacimiento(2003, 5, 14), correo="javiera.munoz@udec.cl", rut=20981437, fono="+56974512836",
                    inst="UdeC", sede="Campus Concepción", carrera="Enfermería", ingreso=2022,
                    ciudad="Los Ángeles", region="Biobío", dir="Pasaje Los Aromos 1145",
                    desc="Estudiante de Enfermería en 4.º año. Me gusta el orden y estudiar tranquila; los fines de semana viajo seguido a Los Ángeles.",
                    modo="oferente", registro=104,
                    resp=("intermedio", "tarde", "alto", "bajo", "ocasional", "no_fuma_no_tolera", "no_tiene_tolera"),
                    imp={"orden_limpieza": X, "fumar": X, "mascotas": F}),
    "matias": dict(nombre="Matías", ap_paterno="Fuentes", ap_materno="Sepúlveda", genero="masculino",
                   nac=nacimiento(2002, 9, 3), correo="matias.fuentes@alumnos.ubiobio.cl", rut=20734618, fono="+56983267415",
                   inst="UBB", sede="Sede Concepción", carrera="Ingeniería en Construcción", ingreso=2021,
                   ciudad="Chillán", region="Ñuble", dir="Avenida Collín 892",
                   desc="Vivo en una casa a pasos de la UBB con mi perro Toby. Soy tranquilo, me gusta cocinar y ver fútbol.",
                   modo="oferente", registro=96,
                   resp=("intermedio", "noche", "medio", "moderado", "frecuente", "no_fuma_tolera", "tiene"),
                   imp={"horario_sueno": F, "fumar": F}),
    "constanza": dict(nombre="Constanza", ap_paterno="Rivas", ap_materno="Pérez", genero="femenino",
                      nac=nacimiento(2002, 2, 21), correo="constanza.rivas@alu.ucsc.cl", rut=20815264, fono="+56956138247",
                      inst="UCSC", sede="Campus San Andrés", carrera="Psicología", ingreso=2021,
                      ciudad="Talca", region="Maule", dir="Calle 3 Sur 1720",
                      desc="Estudio Psicología y estoy en práctica. Me levanto temprano y valoro mucho un ambiente silencioso.",
                      modo="oferente", registro=88,
                      resp=("temprano", "tarde", "alto", "bajo", "nunca", "no_fuma_no_tolera", "no_tiene_no_tolera"),
                      imp={"ruido": X, "horario_estudio": F}),
    "diego": dict(nombre="Diego", ap_paterno="Navarrete", ap_materno="Soto", genero="masculino",
                  nac=nacimiento(2002, 11, 30), correo="diego.navarrete@inacapmail.cl", rut=21047392, fono="+56961847253",
                  inst="INACAP", sede="Sede Concepción-Talcahuano", carrera="Ingeniería en Informática", ingreso=2022,
                  ciudad="Cañete", region="Biobío", dir="Villarrica 455",
                  desc="Arriendo dos piezas que administro con mi familia. Soy relajado, trabajo part-time y me gustan los videojuegos.",
                  modo="oferente", registro=72,
                  resp=("tarde", "noche", "bajo", "alto", "frecuente", "fuma", "no_tiene_tolera"),
                  imp={c: F for c in CATEGORIAS}),
    "fernanda": dict(nombre="Fernanda", ap_paterno="Aguilera", ap_materno="Vidal", genero="femenino",
                     nac=nacimiento(2001, 7, 8), correo="fernanda.aguilera@correo.uss.cl", rut=20512873, fono="+56947326159",
                     inst="USS", sede="Sede Concepción", carrera="Nutrición y Dietética", ingreso=2020,
                     ciudad="Osorno", region="Los Lagos", dir="Los Carrera 1388",
                     desc="Último año de Nutrición. Vivo con mi gata Luna en un depto en el centro; busco a alguien ordenado y que quiera a los animales.",
                     modo="oferente", registro=31,
                     resp=("intermedio", "manana", "alto", "bajo", "ocasional", "no_fuma_no_tolera", "tiene"),
                     imp={"mascotas": X, "horario_sueno": F}),
    "sebastian": dict(nombre="Sebastián", ap_paterno="Morales", ap_materno="Castillo", genero="masculino",
                      nac=nacimiento(2001, 4, 17), correo="sebastian.morales@udec.cl", rut=20498156, fono="+56932618475",
                      inst="UdeC", sede="Campus Concepción", carrera="Ingeniería Civil Informática", ingreso=2020,
                      ciudad="Temuco", region="La Araucanía", dir="Avenida Pablo Neruda 0870",
                      desc="Estudio Informática y trabajo medio día desde la casa. Arriendo la pieza con baño de mi depto en Chiguayante.",
                      modo="oferente", registro=118,
                      resp=("intermedio", "tarde", "medio", "moderado", "ocasional", "no_fuma_tolera", "no_tiene_tolera"),
                      imp={"visitas": F, "fumar": F, "mascotas": F}),
    "valentina": dict(nombre="Valentina", ap_paterno="Herrera", ap_materno="Bustos", genero="femenino",
                      nac=nacimiento(2002, 12, 2), correo="valentina.herrera@alumnos.santotomas.cl", rut=20867341, fono="+56978451362",
                      inst="UST", sede="Sede Concepción", carrera="Kinesiología", ingreso=2021,
                      ciudad="Concepción", region="Biobío", dir="General Novoa 1460",
                      desc="Vivo con mi familia en Lorenzo Arenas y arrendamos una pieza. Somos tranquilos, aunque los fines de semana vienen visitas.",
                      modo="oferente", registro=110,
                      resp=("temprano", "manana", "alto", "moderado", "ocasional", "no_fuma_tolera", "no_tiene_tolera"),
                      imp={"horario_estudio": F, "fumar": F}),
    "rodrigo": dict(nombre="Rodrigo", ap_paterno="Saavedra", ap_materno="Inostroza", genero="masculino",
                    nac=nacimiento(2001, 10, 25), correo="rodrigo.saavedra@alu.ucsc.cl", rut=20623587, fono="+56914753826",
                    inst="UCSC", sede="Campus San Andrés", carrera="Ingeniería Civil Informática", ingreso=2021,
                    ciudad="Victoria", region="La Araucanía", dir="Lagos 612",
                    desc="Arrendamos un depto de 3 dormitorios entre amigos y quedaron dos piezas libres. Ambiente tranquilo y de estudio.",
                    modo="oferente", registro=64,
                    resp=("tarde", "noche", "medio", "moderado", "ocasional", "no_fuma_tolera", "no_tiene_tolera"),
                    imp={"orden_limpieza": F, "fumar": F, "mascotas": F}),
    # --- Buscan dónde vivir ---
    "camila": dict(nombre="Camila", ap_paterno="Soto", ap_materno="Ramírez", genero="femenino",
                   nac=nacimiento(2005, 1, 19), correo="ca.sotor@duocuc.cl", rut=21794263, fono="+56925631748",
                   inst="Duoc UC", sede="Sede San Andrés de Concepción", carrera="Diseño Gráfico", ingreso=2024,
                   ciudad="Cauquenes", region="Maule", dir="Victoria 534",
                   desc="Estudio Diseño Gráfico. Soy nocturna, dibujo hasta tarde con audífonos y me gusta mantener la casa ordenada.",
                   modo="buscador", registro=45,
                   resp=("tarde", "variable", "medio", "moderado", "ocasional", "no_fuma_tolera", "no_tiene_tolera"),
                   imp={"horario_estudio": F, "fumar": F}),
    "ignacio": dict(nombre="Ignacio", ap_paterno="Pino", ap_materno="Lagos", genero="masculino",
                    nac=nacimiento(2006, 8, 11), correo="ignacio.pino@udec.cl", rut=22148753, fono="+56936284517",
                    inst="UdeC", sede="Campus Concepción", carrera="Ingeniería Comercial", ingreso=2025,
                    ciudad="Curicó", region="Maule", dir="Merced 1043",
                    desc="Primer año de Ingeniería Comercial. Busco una pieza cerca de la U para dejar de viajar todos los días.",
                    modo="buscador", registro=25,
                    resp=("intermedio", "tarde", "medio", "moderado", "ocasional", "no_fuma_tolera", "no_tiene_tolera"),
                    imp={"fumar": F, "mascotas": F}),
    "antonia": dict(nombre="Antonia", ap_paterno="Vergara", ap_materno="Jara", genero="femenino",
                    nac=nacimiento(2005, 3, 6), correo="antonia.vergara@alu.ucsc.cl", rut=21683472, fono="+56958173624",
                    inst="UCSC", sede="Campus San Andrés", carrera="Enfermería", ingreso=2024,
                    ciudad="Angol", region="La Araucanía", dir="Pasaje El Roble 77",
                    desc="Estudio Enfermería y tengo turnos de práctica temprano. Necesito un lugar tranquilo para descansar.",
                    modo="buscador", registro=100,
                    resp=("temprano", "manana", "alto", "bajo", "nunca", "no_fuma_no_tolera", "no_tiene_tolera"),
                    imp={"ruido": X, "visitas": F, "horario_estudio": F}),
    "benjamin": dict(nombre="Benjamín", ap_paterno="Salazar", ap_materno="Ortiz", genero="masculino",
                     nac=nacimiento(2006, 6, 28), correo="benjamin.salazar@inacapmail.cl", rut=22093418, fono="+56987426135",
                     inst="INACAP", sede="Sede Concepción-Talcahuano", carrera="Analista Programador", ingreso=2025,
                     ciudad="Lebu", region="Biobío", dir="Saavedra 218",
                     desc="Estudio Analista Programador. Me gusta jugar en red con amigos y salir a trotar por la costanera.",
                     modo="buscador", registro=30,
                     resp=("tarde", "noche", "medio", "alto", "frecuente", "no_fuma_tolera", "no_tiene_tolera"),
                     imp={"orden_limpieza": F, "fumar": F}),
    "martina": dict(nombre="Martina", ap_paterno="Cifuentes", ap_materno="Rojas", genero="femenino",
                    nac=nacimiento(2006, 10, 9), correo="martina.cifuentes@alumnos.ubiobio.cl", rut=22217634, fono="+56943752618",
                    inst="UBB", sede="Sede Concepción", carrera="Trabajo Social", ingreso=2025,
                    ciudad="San Carlos", region="Ñuble", dir="Independencia 640",
                    desc="Primer año de Trabajo Social. Soy ordenada, no fumo y prefiero vivir cerca de la U.",
                    modo="buscador", registro=20,
                    resp=("intermedio", "noche", "alto", "bajo", "ocasional", "no_fuma_no_tolera", "no_tiene_tolera"),
                    imp={"fumar": X, "mascotas": F}),
    "tomas": dict(nombre="Tomás", ap_paterno="Riquelme", ap_materno="Bravo", genero="masculino",
                  nac=nacimiento(2005, 12, 13), correo="t.riquelme@uandresbello.edu", rut=21857246, fono="+56962518374",
                  inst="UNAB", sede="Sede Concepción", carrera="Kinesiología", ingreso=2024,
                  ciudad="Puerto Montt", region="Los Lagos", dir="Avenida Presidente Ibáñez 2210",
                  desc="Me vine de Puerto Montt con mi perrita Kira. Busco un lugar donde acepten mascotas.",
                  modo="buscador", registro=15,
                  resp=("tarde", "noche", "bajo", "moderado", "frecuente", "no_fuma_tolera", "tiene"),
                  imp={"mascotas": X, "orden_limpieza": F}),
    "florencia": dict(nombre="Florencia", ap_paterno="Paredes", ap_materno="Muñoz", genero="femenino",
                      nac=nacimiento(2006, 4, 2), correo="florencia.paredes@correo.uss.cl", rut=22186357, fono="+56915846273",
                      inst="USS", sede="Sede Concepción", carrera="Psicología", ingreso=2025,
                      ciudad="Linares", region="Maule", dir="Kurt Möller 381",
                      desc="Estudio Psicología. Por ahora vivo en una residencial, pero quiero cambiarme a un depto compartido.",
                      modo="buscador", registro=12,
                      resp=("intermedio", "manana", "alto", "bajo", "ocasional", "no_fuma_tolera", "no_tiene_tolera"),
                      imp={"orden_limpieza": X, "visitas": F}),
    "vicente": dict(nombre="Vicente", ap_paterno="Araya", ap_materno="Molina", genero="masculino",
                    nac=nacimiento(2005, 8, 22), correo="vi.arayam@duocuc.cl", rut=21912584, fono="+56928374615",
                    inst="Duoc UC", sede="Sede San Andrés de Concepción", carrera="Ingeniería en Informática", ingreso=2024,
                    ciudad="Mulchén", region="Biobío", dir="Villagrán 1125",
                    desc="Estudio Informática en Duoc. Fumo, así que busco un lugar donde se pueda fumar al menos en el patio.",
                    modo="buscador", registro=18,
                    resp=("tarde", "noche", "bajo", "alto", "frecuente", "fuma", "no_tiene_tolera"),
                    imp={"fumar": X}),
    "josefa": dict(nombre="Josefa", ap_paterno="Castro", ap_materno="Sanhueza", genero="femenino",
                   nac=nacimiento(2004, 11, 27), correo="josefa.castro@udec.cl", rut=21385746, fono="+56951673482",
                   inst="UdeC", sede="Campus Concepción", carrera="Medicina Veterinaria", ingreso=2023,
                   ciudad="Valdivia", region="Los Ríos", dir="General Lagos 1530",
                   desc="Estudio Medicina Veterinaria y vivo con mi gato Simón, que es muy tranquilo. Busco un lugar que acepte mascotas.",
                   modo="buscador", registro=9,
                   resp=("intermedio", "variable", "medio", "moderado", "ocasional", "no_fuma_tolera", "tiene"),
                   imp={"mascotas": X}),
    "joaquin": dict(nombre="Joaquín", ap_paterno="Espinoza", ap_materno="Reyes", genero="masculino",
                    nac=nacimiento(2003, 1, 31), correo="joaquin.espinoza@alumnos.santotomas.cl", rut=21136825, fono="+56984263157",
                    inst="UST", sede="Sede Concepción", carrera="Ingeniería Comercial", ingreso=2022,
                    ciudad="Coyhaique", region="Aysén del General Carlos Ibáñez del Campo", dir="Baquedano 674",
                    desc="Estudio Ingeniería Comercial. Estoy haciendo mi práctica en Santiago y vuelvo a Concepción en marzo.",
                    modo="buscador", registro=112,
                    resp=("tarde", "tarde", "medio", "moderado", "ocasional", "no_fuma_tolera", "no_tiene_tolera"),
                    imp={"visitas": F, "fumar": F}),
    # Recién registrada: aún no termina el cuestionario ni elige su rol
    "isidora": dict(nombre="Isidora", ap_paterno="Lagos", ap_materno="Figueroa", genero="femenino",
                    nac=nacimiento(2007, 2, 15), correo="isidora.lagos@virginiogomez.cl", rut=22436815, fono="+56967142835",
                    inst="IPVG", sede="Sede Concepción", carrera="Diseño Gráfico", ingreso=2026,
                    ciudad="Parral", region="Maule", dir="Aníbal Pinto 420",
                    desc=None, modo=None, registro=2,
                    resp=("tarde", "noche", "medio", None, None, None, None), imp={}),
}

# Preferencias de búsqueda guardadas: (costo máximo, comunas, tipo, mascotas, cerca de la sede)
PREFERENCIAS = {
    "camila": (260_000, ["Concepción"], None, None, False),
    "ignacio": (250_000, ["Concepción", "Talcahuano"], "habitacion", None, False),
    "antonia": (280_000, ["Concepción", "San Pedro de la Paz"], None, None, False),
    "benjamin": (230_000, ["Concepción", "Talcahuano", "Hualpén"], None, None, False),
    "martina": (250_000, [], None, None, True),
    "tomas": (260_000, [], None, True, False),
    "florencia": (320_000, ["Concepción"], "departamento", None, False),
    "vicente": (220_000, ["Talcahuano", "Hualpén", "Concepción"], None, None, False),
    "josefa": (310_000, ["Concepción"], None, True, False),
    "joaquin": (230_000, ["Concepción", "Chiguayante"], "habitacion", None, False),
}
# Con la búsqueda activa (reciben propuestas de RoomMatch)
BUSCANDO = {"ignacio", "antonia", "benjamin", "martina", "tomas", "josefa"}


def gasto(monto: int | None) -> dict:
    return {"incluido": monto is None, "monto_estimado": monto}


def silencio(desde: str | None = None, hasta: str | None = None) -> dict:
    return {"aplica": desde is not None, "desde": desde, "hasta": hasta}


# Alojamientos: (oferente, días desde la publicación, datos)
PUBLICACIONES = {
    "javiera": (40, dict(
        tipo="habitacion", titulo="Pieza en depto compartido a pasos del Campus UdeC",
        descripcion="Arriendo pieza amoblada en departamento que comparto con otra estudiante de Enfermería, a 4 cuadras del "
                    "Arco de la UdeC. La pieza tiene cama de 1,5 plazas, escritorio y closet. El edificio tiene conserje y "
                    "lavandería. Buscamos a una estudiante ordenada que ayude con el aseo de los espacios comunes.",
        cupos_totales=1, cupos_disponibles=1, costo_mensual=235_000, genero_preferido="femenino",
        comuna="Concepción", sector="Barrio Universitario", calle="Edmundo Larenas", numero="410",
        referencia="A cuatro cuadras del Arco de la UdeC", punto=(-73.0372, -36.8302),
        gastos=dict(agua=None, luz=12_000, gas=8_000, internet=None),
        reglas=dict(permite_fumar=False, permite_mascotas=False, permite_visitas=True, horario_silencio=silencio("23:00", "07:30"),
                    reglas_adicionales="Turno de aseo semanal de cocina y baño."),
        caracteristicas=dict(amoblado=True, banio_privado=False, estacionamiento=False))),
    "matias": (35, dict(
        tipo="habitacion", titulo="Habitación en casa compartida cerca de la UBB",
        descripcion="Casa de dos pisos a 5 minutos caminando de la UBB sede Collao. Quedan dos piezas libres en el segundo "
                    "piso. Hay patio, parrilla y estacionamiento. En la casa vive Toby, un perro tranquilo y muy sociable.",
        cupos_totales=2, cupos_disponibles=2, costo_mensual=210_000, genero_preferido="indiferente",
        comuna="Concepción", sector="Collao", calle="Avenida Collao", numero="1580",
        referencia="Frente a la plaza de Collao", punto=(-73.0155, -36.8245),
        gastos=dict(agua=None, luz=15_000, gas=10_000, internet=None),
        reglas=dict(permite_fumar=False, permite_mascotas=True, permite_visitas=True, horario_silencio=silencio(),
                    reglas_adicionales="Se puede traer mascota pequeña si se lleva bien con Toby."),
        caracteristicas=dict(amoblado=False, banio_privado=False, estacionamiento=True))),
    "constanza": (28, dict(
        tipo="departamento", titulo="Departamento de 3 dormitorios en Andalué para compartir",
        descripcion="Departamento de 3 dormitorios y 2 baños en Andalué. Quedan dos dormitorios libres, uno con baño "
                    "privado. Es un lugar muy tranquilo, ideal para estudiar, con locomoción directa a Concepción y al Biotrén.",
        cupos_totales=2, cupos_disponibles=2, costo_mensual=280_000, genero_preferido="femenino",
        comuna="San Pedro de la Paz", sector="Andalué", calle="Avenida Andalué", numero="2350",
        referencia="Condominio con portería, a dos cuadras del Jumbo", punto=(-73.1135, -36.858),
        gastos=dict(agua=9_000, luz=15_000, gas=12_000, internet=None),
        reglas=dict(permite_fumar=False, permite_mascotas=False, permite_visitas=True, horario_silencio=silencio("22:30", "07:00"),
                    reglas_adicionales="Visitas solo hasta las 22:00 de lunes a jueves."),
        caracteristicas=dict(amoblado=True, banio_privado=True, estacionamiento=True))),
    "diego": (30, dict(
        tipo="habitacion", titulo="Habitación en Las Higueras, cerca de INACAP y la UNAB",
        descripcion="Pieza amoblada en casa familiar en Las Higueras, a 10 minutos en micro de INACAP y de la UNAB. "
                    "Todos los gastos incluidos y WiFi de fibra. La cocina y el living son compartidos.",
        cupos_totales=1, cupos_disponibles=1, costo_mensual=180_000, genero_preferido="indiferente",
        comuna="Talcahuano", sector="Las Higueras", calle="Avenida Colón", numero="3240",
        referencia="A media cuadra del paradero de Colón con Los Lirios", punto=(-73.0905, -36.76),
        gastos=dict(agua=None, luz=None, gas=None, internet=None),
        reglas=dict(permite_fumar=True, permite_mascotas=False, permite_visitas=True, horario_silencio=silencio(),
                    reglas_adicionales="Se puede fumar solo en el patio."),
        caracteristicas=dict(amoblado=True, banio_privado=False, estacionamiento=False))),
    "diego_2": (16, dict(
        tipo="habitacion", titulo="Pieza amoblada en Hualpén, a 10 minutos de la Santa María",
        descripcion="Pieza amoblada en casa tranquila en Hualpencillo, cerca de la Universidad Santa María y de CEDUC. "
                    "Ideal para estudiante que busque algo económico. Comparte baño con una persona.",
        cupos_totales=1, cupos_disponibles=1, costo_mensual=170_000, genero_preferido="masculino",
        comuna="Hualpén", sector="Hualpencillo", calle="Avenida Grecia", numero="1250",
        referencia=None, punto=(-73.087, -36.793),
        gastos=dict(agua=None, luz=10_000, gas=8_000, internet=None),
        reglas=dict(permite_fumar=True, permite_mascotas=False, permite_visitas=True, horario_silencio=silencio(),
                    reglas_adicionales=None),
        caracteristicas=dict(amoblado=True, banio_privado=False, estacionamiento=False))),
    "fernanda": (10, dict(
        tipo="departamento", titulo="Depto amoblado en el centro, cerca de Plaza Perú",
        descripcion="Comparto mi departamento de 2 dormitorios en pleno centro, a pasos de Plaza Perú y de la locomoción "
                    "a todas las universidades. El dormitorio libre tiene baño privado. Vivo con mi gata Luna.",
        cupos_totales=1, cupos_disponibles=1, costo_mensual=300_000, genero_preferido="femenino",
        comuna="Concepción", sector="Centro", calle="Castellón", numero="1380",
        referencia="Edificio con conserje, a una cuadra de Plaza Perú", punto=(-73.044, -36.824),
        gastos=dict(agua=None, luz=None, gas=None, internet=None),
        reglas=dict(permite_fumar=False, permite_mascotas=True, permite_visitas=True, horario_silencio=silencio("23:00", "07:00"),
                    reglas_adicionales="Gastos comunes incluidos en el arriendo."),
        caracteristicas=dict(amoblado=True, banio_privado=True, estacionamiento=False))),
    "sebastian": (112, dict(
        tipo="habitacion", titulo="Habitación con baño privado en Chiguayante, cerca del Biotrén",
        descripcion="Arriendo la pieza con baño privado de mi departamento en Chiguayante, a 3 cuadras de la estación "
                    "Chiguayante del Biotrén (15 minutos a Concepción). Amoblada, con escritorio y buena conexión a internet.",
        cupos_totales=1, cupos_disponibles=1, costo_mensual=220_000, genero_preferido="indiferente",
        comuna="Chiguayante", sector="Chiguayante Centro", calle="Manuel Rodríguez", numero="850",
        referencia="A tres cuadras de la estación del Biotrén", punto=(-73.027, -36.918),
        gastos=dict(agua=None, luz=12_000, gas=None, internet=None),
        reglas=dict(permite_fumar=False, permite_mascotas=False, permite_visitas=True, horario_silencio=silencio("00:00", "08:00"),
                    reglas_adicionales=None),
        caracteristicas=dict(amoblado=True, banio_privado=True, estacionamiento=False))),
    "valentina": (100, dict(
        tipo="habitacion", titulo="Pieza en casa familiar en Lorenzo Arenas",
        descripcion="Arrendamos una pieza en nuestra casa en Lorenzo Arenas, a 10 minutos en micro del centro y de la "
                    "UdeC. Todos los gastos incluidos. Somos una familia tranquila; buscamos una estudiante responsable.",
        cupos_totales=1, cupos_disponibles=1, costo_mensual=190_000, genero_preferido="femenino",
        comuna="Concepción", sector="Lorenzo Arenas", calle="General Novoa", numero="1460",
        referencia=None, punto=(-73.0505, -36.808),
        gastos=dict(agua=None, luz=None, gas=None, internet=None),
        reglas=dict(permite_fumar=False, permite_mascotas=False, permite_visitas=True, horario_silencio=silencio("23:00", "07:00"),
                    reglas_adicionales="Uso de cocina hasta las 22:00."),
        caracteristicas=dict(amoblado=False, banio_privado=False, estacionamiento=False))),
    "rodrigo": (25, dict(
        tipo="departamento", titulo="Departamento de 3 dormitorios cerca de la UCSC San Andrés",
        descripcion="Somos un estudiante de Informática y uno de Ingeniería Comercial; nos quedaron dos dormitorios libres en "
                    "el depto, a 5 minutos caminando de la UCSC San Andrés y del Duoc. Ambiente tranquilo y de estudio.",
        cupos_totales=2, cupos_disponibles=2, costo_mensual=260_000, genero_preferido="indiferente",
        comuna="Concepción", sector="Lomas de San Andrés", calle="Alonso de Ribera", numero="2650",
        referencia="Frente al acceso del Campus San Andrés", punto=(-73.056, -36.8),
        gastos=dict(agua=8_000, luz=14_000, gas=10_000, internet=None),
        reglas=dict(permite_fumar=False, permite_mascotas=False, permite_visitas=True, horario_silencio=silencio("00:00", "08:00"),
                    reglas_adicionales=None),
        caracteristicas=dict(amoblado=False, banio_privado=False, estacionamiento=True))),
}


# ---------------------------------------------------------------------------------------------

async def marcar_nuevos(desde: ObjectId) -> None:
    """Todo lo creado durante la carga queda marcado (también lo que crean las funciones de la API)."""
    for nombre in COLECCIONES:
        await db[nombre].update_many({"_id": {"$gte": desde}}, {"$set": {"demo": True}})


async def notificar_en(usuario_id, tipo, titulo, mensaje, fecha, referencia=None, leido=True):
    tipo_entidad, entidad_id = referencia or (None, None)
    await db.notificaciones.insert_one({
        "codigo": await siguiente_codigo("notificaciones"), "usuario_id": usuario_id, "tipo": tipo,
        "titulo": titulo, "mensaje": mensaje, "leido": leido, "fecha_lectura": fecha + timedelta(hours=2) if leido else None,
        "estado_envio": "enviado", "fecha_programada": None, "fecha_notificacion": fecha,
        "referencia": {"tipo_entidad": tipo_entidad, "entidad_id": entidad_id},
    })


async def crear() -> None:
    if await db.usuarios.find_one({"demo": True}):
        sys.exit("Los datos de demostración ya están cargados. Para volver a cargarlos, primero: borrar")
    noemi = await db.usuarios.find_one({"correo": CORREO_CONVIVENCIA})
    if not noemi or noemi.get("modo") != "oferente":
        sys.exit(f"No encontré la cuenta {CORREO_CONVIVENCIA} como oferente (debe existir con su publicación)")
    pub_noemi = await db.publicaciones.find_one({"oferente_id": noemi["_id"], "estado": "activa"}, sort=[("fecha_publicacion", 1)])
    if not pub_noemi or pub_noemi["cupos_disponibles"] < 1:
        sys.exit(f"La cuenta {CORREO_CONVIVENCIA} necesita una publicación activa con al menos un cupo libre")
    admin = await db.usuarios.find_one({"rol": "administrador"})

    inicio = ObjectId.from_datetime(AHORA - timedelta(seconds=5))
    comunas = {c["nombre"]: c async for c in db.comunas.find()}
    instituciones = {i["sigla"]: i async for i in db.instituciones.find()}
    clave = cifrar_password(CLAVE_DEMO)

    # ---------- Estudiantes ----------
    ids = {"noemi": noemi["_id"]}
    for clave_u, e in ESTUDIANTES.items():
        inst = instituciones[e["inst"]]
        if not any(s["nombre"] == e["sede"] for s in inst["sedes"]):
            sys.exit(f"{e['inst']} no tiene la sede «{e['sede']}»")
        if not await db.carreras.find_one({"institucion_id": inst["_id"], "nombre": e["carrera"]}):
            sys.exit(f"{e['inst']} no tiene la carrera «{e['carrera']}»")
        registro = hace(e["registro"], horas=random.randint(1, 10))
        respondio = registro + timedelta(minutes=random.randint(20, 90))
        respuestas = dict(zip(CATEGORIAS, e["resp"]))
        completo = all(respuestas.values())
        perfil = {
            "telefono": e["fono"], "institucion_id": inst["_id"], "sede": e["sede"], "carrera": e["carrera"],
            "carrera_otra": False, "anio_ingreso": e["ingreso"], "direccion": e["dir"], "ciudad_origen": e["ciudad"],
            "region_origen": e["region"], "descripcion": e["desc"], "foto_url": None,
            "perfil_completo": True, "campos_faltantes": [],
        }
        ultima = hace(random.uniform(0.2, 3) if e["registro"] > 3 else 0.5)
        doc = {
            "rut": rut_con_dv(e["rut"]), "nombre": e["nombre"], "ap_paterno": e["ap_paterno"], "ap_materno": e["ap_materno"],
            "fecha_nac": e["nac"], "genero": e["genero"], "correo": e["correo"], "password": clave,
            "fecha_registro": registro, "fecha_actualizacion": respondio, "rol": "estudiante", "estado_cuenta": "activa",
            "advertencias_recibidas": 0, "match_activo_id": None, "buscando_alojamiento": clave_u in BUSCANDO,
            "modo": e["modo"], "fecha_cambio_modo": respondio + timedelta(minutes=3) if e["modo"] else None,
            "correo_verificado": True,
            # Correo institucional: la cuenta queda verificada al confirmar el correo
            "verificacion": {"estado": "verificado", "metodo": "correo_institucional", "institucion_id": inst["_id"],
                             "fecha_verificacion": registro + timedelta(minutes=4), "fecha_revocacion": None,
                             "admin_id": None, "solicitud_id": None},
            "perfil": perfil,
            "cuestionario": {
                **respuestas,
                "importancia": [{"categoria": c, "nivel": e["imp"].get(c, "importante")} for c in CATEGORIAS],
                "completo": completo, "campos_faltantes": [c for c, v in respuestas.items() if v is None],
                "fecha_respuesta": respondio if completo else None, "fecha_actualizacion": respondio,
            },
            "seguridad": {"intentos_fallidos": 0, "bloqueado_hasta": None, "token_version": 0,
                          "ultimo_inicio_sesion": ultima, "ultima_actividad": ultima},
        }
        if clave_u in PREFERENCIAS:
            maximo, nombres, tipo, mascotas, cerca = PREFERENCIAS[clave_u]
            doc["preferencias_busqueda"] = {
                "costo_min": None, "costo_max": maximo, "tipo_alojamiento": tipo, "requiere_mascotas": mascotas,
                "requiere_fumar": None, "requiere_visitas": None, "gastos_incluidos": False, "amoblado": False,
                "estacionamiento": False, "cerca_institucion": cerca, "comunas_ids": [comunas[n]["_id"] for n in nombres],
            }
        ids[clave_u] = (await db.usuarios.insert_one(doc)).inserted_id
        if completo:
            # Lo que la API deja al responder el cuestionario por primera vez
            primero = await siguiente_codigo("historial_cuestionario", 14)
            await db.historial_cuestionario.insert_many([
                {"codigo": primero + i, "usuario_id": ids[clave_u], "categoria": c, "campo": campo, "valor_anterior": None,
                 "valor_nuevo": valor, "origen": "usuario", "interacciones_ids": [], "fecha": respondio}
                for i, (campo, c, valor) in enumerate(
                    [("respuesta", c, respuestas[c]) for c in CATEGORIAS]
                    + [("importancia", c, e["imp"].get(c, "importante")) for c in CATEGORIAS])
            ])

    # ---------- La cuenta real de la convivencia: sus fechas pasan a ser coherentes ----------
    # En milisegundos enteros (la precisión de Mongo), para que «borrar» las devuelva exactas
    delta_u = timedelta(milliseconds=round((hace(85) - noemi["fecha_registro"]).total_seconds() * 1000))
    delta_p = timedelta(milliseconds=round((hace(50) - pub_noemi["fecha_publicacion"]).total_seconds() * 1000))
    cambios = {"demo_original": {"delta_usuario_ms": delta_u // timedelta(milliseconds=1),
                                 "delta_publicacion_ms": delta_p // timedelta(milliseconds=1),
                                 "publicacion_id": pub_noemi["_id"],
                                 "publicacion_modificada": pub_noemi.get("fecha_ultima_modificacion")}}
    for campo in ("fecha_registro", "fecha_actualizacion", "fecha_cambio_modo", "verificacion.fecha_verificacion",
                  "cuestionario.fecha_respuesta", "cuestionario.fecha_actualizacion"):
        valor = noemi
        for parte in campo.split("."):
            valor = (valor or {}).get(parte)
        if isinstance(valor, datetime):
            cambios[campo] = valor + delta_u
    await db.usuarios.update_one({"_id": noemi["_id"]}, {"$set": cambios})
    async for h in db.historial_cuestionario.find({"usuario_id": noemi["_id"]}):
        await db.historial_cuestionario.update_one({"_id": h["_id"]}, {"$set": {"fecha": h["fecha"] + delta_u}})
    await db.publicaciones.update_one({"_id": pub_noemi["_id"]}, {"$set": {
        "fecha_publicacion": pub_noemi["fecha_publicacion"] + delta_p,
        **({"fecha_ultima_modificacion": pub_noemi["fecha_ultima_modificacion"] + delta_p}
           if pub_noemi.get("fecha_ultima_modificacion") else {}),
        "fotos": [{**f, "fecha_subida": f["fecha_subida"] + delta_p} for f in pub_noemi.get("fotos", [])],
    }})

    # ---------- Publicaciones ----------
    pubs = {"noemi": pub_noemi["_id"]}
    titulos = {"noemi": pub_noemi["titulo"]}
    for clave_p, (dias, p) in PUBLICACIONES.items():
        oferente = clave_p.split("_")[0]
        comuna = comunas[p["comuna"]]
        punto = {"type": "Point", "coordinates": list(p["punto"])}
        gastos = {k: gasto(v) for k, v in p["gastos"].items()}
        doc = {
            "codigo": await siguiente_codigo("publicaciones"), "oferente_id": ids[oferente],
            "tipo": p["tipo"], "titulo": p["titulo"], "descripcion": p["descripcion"],
            "cupos_totales": p["cupos_totales"], "cupos_disponibles": p["cupos_disponibles"],
            "costo_mensual": p["costo_mensual"], "genero_preferido": p["genero_preferido"], "estado": "activa",
            "ubicacion": {"comuna_id": comuna["_id"], "comuna_nombre": comuna["nombre"], "sector": p["sector"],
                          "calle": p["calle"], "numero": p["numero"], "direccion_referencia": p["referencia"],
                          "coordenadas": punto, "punto_exacto": punto},
            "gastos": {**gastos, "todos_incluidos": all(g["incluido"] for g in gastos.values())},
            "reglas": p["reglas"], "caracteristicas": p["caracteristicas"], "fotos": [],
            "fecha_publicacion": hace(dias, horas=random.randint(1, 8)), "fecha_ultima_modificacion": None,
            "fecha_eliminacion": None, "eliminada_por": None, "cantidad_reportes": 0, "cantidad_reportes_pendiente": 0,
        }
        pubs[clave_p] = (await db.publicaciones.insert_one(doc)).inserted_id
        titulos[clave_p] = p["titulo"]

    # ---------- Lo que la plataforma aprendió de la convivencia que no funcionó (Antonia) ----------
    fecha_aprendizaje = hace(61)
    await db.usuarios.update_one({"_id": ids["antonia"]}, {"$set": {"ajuste_recomendacion": {
        "categorias_problema": ["ruido", "visitas"],
        "aprendizaje": [
            {"categoria": "ruido", "peso_personal": 1.25, "veces_cedio": 0, "veces_rechazo": 0,
             "veces_problema_convivencia": 1, "tendencia": "menos_tolerante", "confianza": 0.33,
             "sugerir_actualizacion": False, "fecha_actualizacion": fecha_aprendizaje},
            {"categoria": "visitas", "peso_personal": 1.12, "veces_cedio": 0, "veces_rechazo": 0,
             "veces_problema_convivencia": 1, "tendencia": "menos_tolerante", "confianza": 0.33,
             "sugerir_actualizacion": False, "fecha_actualizacion": fecha_aprendizaje},
        ],
        "fecha_actualizacion": fecha_aprendizaje,
    }}})

    # ---------- Compatibilidades con el cálculo real de la plataforma ----------
    await recalcular_todos()

    async def compatibilidad(a, b) -> dict:
        x, y = sorted([ids[a], ids[b]])
        return await db.compatibilidades.find_one({"usuario_a_id": x, "usuario_b_id": y, "vigente": True})

    # ---------- Convivencias y propuestas pasadas ----------
    async def match(buscador, oferente, pub, sugerido, estado, resp_a, resp_b, extra=None) -> ObjectId:
        c = await compatibilidad(buscador, oferente)
        if c["porcentaje"] < 75 and estado != "rechazado":
            print(f"  Aviso: {buscador} y {oferente} tienen {c['porcentaje']} % (bajo 75 %)")
        doc = {
            "codigo": await siguiente_codigo("matches"), "usuario_a_id": ids[buscador], "usuario_b_id": ids[oferente],
            "compatibilidad_id": c["_id"], "pctj_compatibilidad": c["porcentaje"], "publicacion_id": pubs[pub],
            "estado": estado, "resultado": "pendiente", "fecha_sugerencia": sugerido, "fecha_respuesta": None,
            "fecha_confirmacion": None, "fecha_inicio_convivencia": None, "fecha_habilitacion_evaluacion": None,
            "fecha_fin_convivencia": None, "motivo_fin": None, "duracion_convivencia_dias": None,
            "parametros_version": c["parametros_version"], "respuesta_a": resp_a, "respuesta_b": resp_b,
            "evaluacion": [], "seguimiento": [], **(extra or {}),
        }
        return (await db.matches.insert_one(doc)).inserted_id

    def acepta(fecha):
        return {"estado": "aceptado", "fecha_respuesta": fecha, "motivo_rechazo": None}

    def sin_respuesta():
        return {"estado": "pendiente", "fecha_respuesta": None, "motivo_rechazo": None}

    def convivencia(sugerido, confirmado, fin=None, motivo=None):
        return {
            "fecha_respuesta": confirmado, "fecha_confirmacion": confirmado, "fecha_inicio_convivencia": confirmado,
            "fecha_habilitacion_evaluacion": confirmado + timedelta(days=30),
            **({"fecha_fin_convivencia": fin, "motivo_fin": motivo, "duracion_convivencia_dias": (fin - confirmado).days}
               if fin else {}),
        }

    def evaluacion(evaluador, evaluado, funciona, nota, comentario, fecha, razones=()):
        return {"evaluador_id": ids[evaluador], "evaluado_id": ids[evaluado], "momento": "mes_1", "funciona": funciona,
                "calificacion": nota, "comentario": comentario,
                "razones": [{"razon": r, "gravedad": g} for r, g in razones], "razon_otra_detalle": None, "fecha_eval": fecha}

    def seguimiento(usuario, aviso, evaluado, recordatorio=None):
        return {"usuario_id": ids[usuario], "momento": "mes_1", "fecha_aviso": aviso,
                "fecha_recordatorio": recordatorio, "evaluado": evaluado}

    # 1) La convivencia activa: Camila vive desde hace 36 días en la habitación de Noemí
    sug, conf = hace(38, horas=5), hace(36, horas=3)
    m_noemi = await match("camila", "noemi", "noemi", sug, "confirmado", acepta(hace(37, horas=20)), acepta(conf), {
        **convivencia(sug, conf),
        # Al mes, la plataforma les avisó a ambas que ya pueden evaluar (aún no lo hacen)
        "seguimiento": [seguimiento("camila", conf + timedelta(days=30, minutes=12), False),
                        seguimiento("noemi", conf + timedelta(days=30, minutes=12), False)],
    })
    await db.usuarios.update_one({"_id": ids["camila"]}, {"$set": {"match_activo_id": m_noemi, "buscando_alojamiento": False}})
    await db.publicaciones.update_one({"_id": pubs["noemi"]}, {"$set": {"fecha_ultima_modificacion": conf}})
    # Al confirmarse se tomó un cupo: antes de esta convivencia tenía uno más libre
    for quien in ("camila", "noemi"):
        await notificar_en(ids[quien], "match_confirmado", "¡Match confirmado!",
                           f"Ambos aceptaron la propuesta para «{titulos['noemi']}». Su convivencia comienza hoy.",
                           conf, ("publicacion", pubs["noemi"]))
        await notificar_en(ids[quien], "evaluacion_disponible", "Cuéntanos cómo va tu convivencia",
                           "Ya pasó un mes desde que confirmaron su match. Evalúa tu convivencia: nos ayuda a mejorar "
                           "tus próximas recomendaciones.", conf + timedelta(days=30, minutes=12), ("match", m_noemi),
                           leido=quien == "camila")

    # 2) Convivencia que funcionó y terminó porque Joaquín se fue a hacer su práctica a Santiago
    sug, conf, fin = hace(104), hace(102, horas=4), hace(22, horas=6)
    m_joaquin = await match("joaquin", "sebastian", "sebastian", sug, "finalizado", acepta(hace(103)), acepta(conf), {
        **convivencia(sug, conf, fin, "cambio_ciudad"), "resultado": "exitoso",
        "evaluacion": [
            evaluacion("sebastian", "joaquin", True, 5, "Joaquín es tranquilo, ordenado y siempre pagó a tiempo.", conf + timedelta(days=31)),
            evaluacion("joaquin", "sebastian", True, 5, "Muy buena convivencia. Sebastián respeta los horarios y el depto está siempre limpio.",
                       conf + timedelta(days=32, hours=3)),
        ],
        "seguimiento": [seguimiento("joaquin", conf + timedelta(days=30), True), seguimiento("sebastian", conf + timedelta(days=30), True)],
    })
    # 3) Convivencia que no funcionó: Antonia necesitaba silencio y en la casa había visitas los fines de semana
    sug, conf, fin = hace(95), hace(93, horas=2), hace(55, horas=5)
    m_antonia = await match("antonia", "valentina", "valentina", sug, "finalizado", acepta(hace(94)), acepta(conf), {
        **convivencia(sug, conf, fin, "incompatibilidad"), "resultado": "no_exitoso",
        "evaluacion": [
            evaluacion("antonia", "valentina", False, 2,
                       "Los fines de semana había visitas hasta tarde y con mis turnos temprano me costaba descansar.",
                       fecha_aprendizaje, [("ruido", "moderada"), ("visitas", "leve")]),
            evaluacion("valentina", "antonia", True, 4,
                       "Antonia es muy ordenada y respetuosa. Teníamos horarios distintos los fines de semana.",
                       conf + timedelta(days=33)),
        ],
        "seguimiento": [seguimiento("antonia", conf + timedelta(days=30), True), seguimiento("valentina", conf + timedelta(days=30), True)],
    })
    for quien, otro, m, pub, conf_, fin_ in (("joaquin", "sebastian", m_joaquin, "sebastian", hace(102, horas=4), hace(22, horas=6)),
                                             ("antonia", "valentina", m_antonia, "valentina", hace(93, horas=2), hace(55, horas=5))):
        for u in (quien, otro):
            await notificar_en(ids[u], "match_confirmado", "¡Match confirmado!",
                               f"Ambos aceptaron la propuesta para «{titulos[pub]}». Su convivencia comienza hoy.",
                               conf_, ("publicacion", pubs[pub]))
            await notificar_en(ids[u], "evaluacion_disponible", "Cuéntanos cómo va tu convivencia",
                               "Ya pasó un mes desde que confirmaron su match. Evalúa tu convivencia: nos ayuda a mejorar "
                               "tus próximas recomendaciones.", conf_ + timedelta(days=30), ("match", m))
        nombre = ESTUDIANTES[quien]["nombre"]
        await notificar_en(ids[otro], "respuesta_match", "Una convivencia terminó",
                           f"{nombre} terminó la convivencia en «{titulos[pub]}».", fin_, ("match", m))

    # 4) Propuestas que no siguieron adelante
    m_rechazo = await match("ignacio", "rodrigo", "rodrigo", hace(12, horas=3), "rechazado",
                            {"estado": "rechazado", "fecha_respuesta": hace(11, horas=22), "motivo_rechazo": "alojamiento_no_conviene"},
                            sin_respuesta(), {"fecha_respuesta": hace(11, horas=22)})
    await notificar_en(ids["rodrigo"], "respuesta_match", "Una propuesta de match no siguió adelante",
                       "Ignacio rechazó la propuesta. RoomMatch seguirá buscando opciones para ti.",
                       hace(11, horas=22), ("publicacion", pubs["rodrigo"]))
    await match("benjamin", "rodrigo", "rodrigo", hace(20, horas=2), "expirado", sin_respuesta(), acepta(hace(19, horas=8)),
                {"fecha_respuesta": hace(13, horas=2)})
    await notificar_en(ids["benjamin"], "respuesta_match", "Aceptaron tu propuesta de match",
                       "Rodrigo aceptó la propuesta. Falta tu respuesta.", hace(19, horas=8), ("publicacion", pubs["rodrigo"]))

    # ---------- Conversaciones ----------
    async def conversacion(a, b, mensajes, no_leidos_de=None, pub=None):
        """mensajes: [(autor, días atrás, horas atrás, texto)], del más antiguo al más reciente."""
        primero = hace(mensajes[0][1], horas=mensajes[0][2])
        ultimo = hace(mensajes[-1][1], horas=mensajes[-1][2])
        conv_id = (await db.conversaciones.insert_one({
            "clave": "_".join(sorted((str(ids[a]), str(ids[b])))), "participantes": [ids[a], ids[b]],
            "creada_por": ids[mensajes[0][0]], "fecha_creacion": primero, "fecha_actividad": ultimo,
            "ultimo_mensaje": {"texto": mensajes[-1][3], "autor_id": ids[mensajes[-1][0]], "fecha": ultimo},
            "no_leidos": {str(ids[a]): 0, str(ids[b]): 0, **({str(ids[no_leidos_de[0]]): no_leidos_de[1]} if no_leidos_de else {})},
        })).inserted_id
        await db.mensajes.insert_many([
            {"conversacion_id": conv_id, "autor_id": ids[autor], "texto": texto,
             "publicacion_id": pubs[pub] if pub and i == 0 else None, "fecha_envio": hace(d, horas=h)}
            for i, (autor, d, h, texto) in enumerate(mensajes)
        ])

    await conversacion("camila", "noemi", [
        ("camila", 40, 6, "Hola Noemí! Vi tu publicación de la pieza cerca de la UdeC. ¿Todavía está disponible?"),
        ("noemi", 40, 4, "Hola Camila! Sí, todavía queda una pieza. ¿Estudias por la zona?"),
        ("camila", 40, 3, "Sí, estudio Diseño Gráfico en el Duoc San Andrés. Me vengo de Cauquenes y estoy buscando para el resto del semestre."),
        ("noemi", 40, 2, "Perfecto, yo estoy en Informática en el mismo Duoc. Si quieres puedes venir a verla esta semana."),
        ("camila", 39, 20, "¿Te parece el jueves en la tarde, tipo 18:00?"),
        ("noemi", 39, 19, "Dale, el jueves a las 18:00. Te mando la dirección exacta por aquí."),
        ("camila", 36, 2, "Ya acepté la propuesta en RoomMatch, ¡muchas gracias! ¿El sábado puedo llevar mis cosas?"),
        ("noemi", 36, 1, "¡Bienvenida! Sí, el sábado en la mañana estoy en la casa."),
        ("noemi", 9, 5, "Cami, llegó la cuenta de la luz: $26.400. Serían $13.200 cada una."),
        ("camila", 9, 3, "Listo, te transferí recién 👍"),
        ("camila", 2, 7, "Oye, este fin de semana viajo a Cauquenes, vuelvo el lunes temprano."),
        ("camila", 2, 7, "¿Necesitas que deje algo listo antes de irme? Me toca el aseo del baño esta semana."),
    ], no_leidos_de=("noemi", 2), pub="noemi")
    await conversacion("joaquin", "sebastian", [
        ("joaquin", 106, 5, "Hola Sebastián, me interesa la pieza con baño privado en Chiguayante. ¿Se puede ir a verla?"),
        ("sebastian", 106, 2, "Hola Joaquín, sí. ¿Te acomoda mañana después de las 19:00?"),
        ("joaquin", 105, 22, "Perfecto, ahí estaré."),
        ("joaquin", 24, 4, "Sebastián, me confirmaron la práctica en Santiago desde noviembre. Voy a tener que dejar la pieza a fin de mes."),
        ("sebastian", 24, 2, "Qué buena noticia, felicitaciones! Te voy a echar de menos como roomie. Cualquier cosa avísame."),
        ("joaquin", 22, 8, "Gracias por todo. Dejé las llaves con el conserje. ¡Éxito!"),
    ], pub="sebastian")
    await conversacion("antonia", "javiera", [
        ("antonia", 3, 9, "Hola Javiera, vi tu pieza cerca de la UdeC. ¿Cómo es el ambiente en el depto? Necesito un lugar tranquilo por mis turnos."),
        ("javiera", 3, 6, "Hola Antonia! Es muy tranquilo, las dos estudiamos Enfermería y no hacemos fiestas. Igual tenemos horario de silencio desde las 23:00."),
        ("antonia", 2, 22, "Me encanta. ¿Los gastos de luz y gas cuánto suelen salir al mes?"),
        ("javiera", 1, 4, "Entre los dos, unos $20.000 por persona en invierno. ¿Quieres venir a verla el viernes?"),
    ], no_leidos_de=("antonia", 1), pub="javiera")
    await conversacion("tomas", "matias", [
        ("tomas", 2, 8, "Hola Matías, vi que en tu casa aceptan mascotas. Tengo una perrita mediana, Kira, muy tranquila. ¿Habría problema?"),
        ("matias", 2, 5, "Hola Tomás! Ningún problema, Toby se lleva bien con otros perros. Igual sería bueno que se conozcan antes."),
        ("tomas", 2, 4, "Buenísimo, ¿te parece el sábado en la mañana?"),
    ], no_leidos_de=("matias", 1), pub="matias")
    await conversacion("ignacio", "matias", [
        ("ignacio", 16, 7, "Hola, ¿el precio de la pieza es de $210.000? Un amigo me dijo que eran $240.000."),
        ("matias", 16, 4, "Hola Ignacio, el arriendo es $210.000. Aparte se paga la luz y el gas, que salen unos $25.000 en total."),
        ("ignacio", 15, 22, "Ah, ya entendí. Gracias, lo voy a pensar."),
    ], pub="matias")
    await conversacion("florencia", "fernanda", [
        ("florencia", 3, 10, "Hola Fernanda, me interesa tu depto. ¿Los gastos están todos incluidos en los $300.000?"),
        ("fernanda", 3, 7, "Hola Florencia! Están incluidos el agua, el internet y los gastos comunes. La luz y el gas se dividen aparte, salen unos $18.000."),
        ("florencia", 2, 23, "Ah, pero en la publicación dice que todos los gastos están incluidos..."),
        ("fernanda", 2, 20, "Uy, tienes razón, me equivoqué al marcarlo. Lo corrijo hoy."),
    ], pub="fernanda")
    await conversacion("martina", "vicente", [
        ("vicente", 8, 6, "Hola Martina, vi que también buscas por la UBB. ¿Te interesaría arrendar un depto entre los dos?"),
        ("martina", 8, 3, "Hola! Gracias, pero prefiero una pieza en una casa ya armada."),
        ("vicente", 7, 22, "Piénsalo, sale más barato. ¿Me pasas tu número para hablar mejor?"),
        ("vicente", 7, 9, "?"),
        ("vicente", 6, 23, "Hola, ¿lo pensaste?"),
        ("martina", 6, 20, "Te dije que no me interesa, por favor no me escribas más."),
        ("vicente", 6, 18, "Ok, pero pásame tu número igual por si cambias de opinión."),
    ])

    # ---------- Reportes y moderación ----------
    async def reporte(tipo, elemento, reportado, reportante, motivo, descripcion, fecha, extra=None):
        doc = {
            "codigo": await siguiente_codigo("reportes"), "tipo_elemento": tipo, "elemento_reportado_id": elemento,
            "usuario_reportado": ids[reportado], "reportante_id": ids[reportante], "motivo": motivo,
            "descripcion": descripcion, "estado": "pendiente", "fecha_reporte": fecha, "admin_revisor_id": None,
            "fecha_toma_revision": None, "fecha_resolucion": None, "resolucion": None, "accion_moderacion_id": None,
            "reportante_notificado": False, **(extra or {}),
        }
        return (await db.reportes.insert_one(doc)).inserted_id

    await reporte("publicacion", pubs["fernanda"], "fernanda", "florencia", "publicacion_enganosa",
                  "La publicación dice que todos los gastos están incluidos, pero por mensaje me dijeron que la luz y el gas se pagan aparte.",
                  hace(2, horas=5))
    await db.publicaciones.update_one({"_id": pubs["fernanda"]}, {"$set": {"cantidad_reportes": 1, "cantidad_reportes_pendiente": 1}})
    await reporte("usuario", ids["vicente"], "vicente", "martina", "comportamiento_inapropiado",
                  "Le dije que no me interesaba compartir departamento y que no me escribiera más, pero insiste en pedirme mi número.",
                  hace(6, horas=17))
    if admin:
        accion_id, resuelto = ObjectId(), hace(13, horas=1)
        r = await reporte("publicacion", pubs["matias"], "matias", "ignacio", "informacion_falsa",
                          "El precio publicado no coincide con lo que me dijeron.", hace(15, horas=20), {
                              "estado": "resuelto", "admin_revisor_id": admin["_id"], "fecha_toma_revision": hace(13, horas=3),
                              "fecha_resolucion": resuelto, "resolucion": "sin_accion", "accion_moderacion_id": accion_id,
                              "reportante_notificado": True})
        await db.acciones_moderacion.insert_one({
            "_id": accion_id, "codigo": await siguiente_codigo("acciones_moderacion"), "admin_id": admin["_id"],
            "objetivo_tipo": "publicacion", "objetivo_id": pubs["matias"], "accion": "desestimar_reporte", "motivo": None,
            "justificacion": "El arriendo publicado ($210.000) es el correcto. La diferencia corresponde a la luz y el gas, "
                             "que están detallados aparte en la publicación.",
            "reportes_ids": [r], "estado_anterior": "en_revision", "estado_nuevo": "resuelto", "revierte_accion_id": None,
            "afectado_notificado": False, "fecha_accion": resuelto,
        })
        await db.publicaciones.update_one({"_id": pubs["matias"]}, {"$set": {"cantidad_reportes": 1}})
        await notificar_en(ids["ignacio"], "reporte_resuelto", "Revisamos tu reporte",
                           "Un administrador revisó tu reporte. Gracias por ayudar a cuidar la comunidad.", resuelto)

    # ---------- Propuestas abiertas: las genera RoomMatch con su lógica real ----------
    await generar_propuestas()
    abiertas = [m async for m in db.matches.find({"_id": {"$gte": inicio}, "estado": "sugerido", "fecha_sugerencia": {"$gte": inicio.generation_time}})]
    for i, m in enumerate(abiertas):
        fecha = hace(random.uniform(0.1, 4.5))
        cambios = {"fecha_sugerencia": fecha}
        # Algunas ya tienen la respuesta de uno de los dos
        if i % 4 == 1:
            cambios |= {"estado": "pendiente", "respuesta_b": acepta(fecha + timedelta(hours=5))}
            await notificar_en(m["usuario_a_id"], "respuesta_match", "Aceptaron tu propuesta de match",
                               "Tu propuesta fue aceptada. Falta tu respuesta.", fecha + timedelta(hours=5),
                               ("publicacion", m["publicacion_id"]), leido=False)
        elif i % 4 == 2:
            cambios |= {"estado": "pendiente", "respuesta_a": acepta(fecha + timedelta(hours=3))}
        await db.matches.update_one({"_id": m["_id"]}, {"$set": cambios})
        # Los avisos de la propuesta, con su misma fecha
        await db.notificaciones.update_many(
            {"_id": {"$gte": inicio}, "tipo": "nuevo_match", "referencia.entidad_id": m["publicacion_id"],
             "usuario_id": {"$in": [m["usuario_a_id"], m["usuario_b_id"]]}},
            {"$set": {"fecha_notificacion": fecha}},
        )
    # El aviso de «aceptaron tu propuesta» con el nombre de quien aceptó
    async for n in db.notificaciones.find({"_id": {"$gte": inicio}, "titulo": "Aceptaron tu propuesta de match",
                                           "mensaje": "Tu propuesta fue aceptada. Falta tu respuesta."}):
        m = await db.matches.find_one({"usuario_a_id": n["usuario_id"], "publicacion_id": n["referencia"]["entidad_id"],
                                       "estado": "pendiente"})
        if m:
            oferente = await db.usuarios.find_one({"_id": m["usuario_b_id"]}, {"nombre": 1})
            await db.notificaciones.update_one({"_id": n["_id"]}, {"$set": {
                "mensaje": f"{oferente['nombre']} aceptó la propuesta. Falta tu respuesta."}})

    # ---------- El inicio de la plataforma, coherente con las fechas de uso ----------
    lanzamiento = hace(125)
    await db.parametros_algoritmo.update_one(
        {"estado": "activa", "fecha_vigencia_desde": {"$gt": lanzamiento}, "version": "v1"},
        {"$set": {"fecha_vigencia_desde": lanzamiento}},
    )

    await marcar_nuevos(inicio)
    resumen = {c: await db[c].count_documents({"demo": True}) for c in COLECCIONES}
    print("Datos de demostración cargados:")
    for c, n in resumen.items():
        print(f"  {c}: {n}")
    print(f"\nCuentas de demostración: cualquier correo de la lista, con la clave {CLAVE_DEMO}")
    print(f"Convivencia activa con evaluación disponible: {CORREO_CONVIVENCIA} y {ESTUDIANTES['camila']['correo']}")


async def borrar() -> None:
    demo_ids = [u["_id"] async for u in db.usuarios.find({"demo": True}, {"_id": 1})]
    if not demo_ids:
        sys.exit("No hay datos de demostración cargados")
    # También lo que la plataforma creó después a partir de ellos (propuestas, avisos, mensajes)
    pubs_demo = [p["_id"] async for p in db.publicaciones.find({"demo": True}, {"_id": 1})]
    alguno = {"$in": demo_ids}
    await db.matches.delete_many({"$or": [{"demo": True}, {"usuario_a_id": alguno}, {"usuario_b_id": alguno}]})
    convs = [c["_id"] async for c in db.conversaciones.find({"$or": [{"demo": True}, {"participantes": alguno}]}, {"_id": 1})]
    await db.mensajes.delete_many({"$or": [{"demo": True}, {"conversacion_id": {"$in": convs}}]})
    await db.conversaciones.delete_many({"_id": {"$in": convs}})
    await db.notificaciones.delete_many({"$or": [{"demo": True}, {"usuario_id": alguno},
                                                 {"referencia.entidad_id": {"$in": pubs_demo}}]})
    await db.reportes.delete_many({"$or": [{"demo": True}, {"reportante_id": alguno}, {"usuario_reportado": alguno}]})
    await db.acciones_moderacion.delete_many({"$or": [{"demo": True}, {"objetivo_id": {"$in": demo_ids + pubs_demo}}]})
    await db.historial_cuestionario.delete_many({"$or": [{"demo": True}, {"usuario_id": alguno}]})
    await db.compatibilidades.delete_many({"$or": [{"demo": True}, {"usuario_a_id": alguno}, {"usuario_b_id": alguno}]})
    await db.publicaciones.delete_many({"demo": True})
    await db.usuarios.delete_many({"demo": True})

    # La cuenta real vuelve a sus fechas
    noemi = await db.usuarios.find_one({"demo_original": {"$exists": True}})
    if noemi:
        original = noemi["demo_original"]
        du = timedelta(milliseconds=original["delta_usuario_ms"])
        dp = timedelta(milliseconds=original["delta_publicacion_ms"])
        cambios = {}
        for campo in ("fecha_registro", "fecha_actualizacion", "fecha_cambio_modo", "verificacion.fecha_verificacion",
                      "cuestionario.fecha_respuesta", "cuestionario.fecha_actualizacion"):
            valor = noemi
            for parte in campo.split("."):
                valor = (valor or {}).get(parte)
            if isinstance(valor, datetime):
                cambios[campo] = valor - du
        await db.usuarios.update_one({"_id": noemi["_id"]}, {"$set": cambios, "$unset": {"demo_original": ""}})
        async for h in db.historial_cuestionario.find({"usuario_id": noemi["_id"]}):
            await db.historial_cuestionario.update_one({"_id": h["_id"]}, {"$set": {"fecha": h["fecha"] - du}})
        pub = await db.publicaciones.find_one({"_id": original["publicacion_id"]})
        if pub:
            await db.publicaciones.update_one({"_id": pub["_id"]}, {"$set": {
                "fecha_publicacion": pub["fecha_publicacion"] - dp,
                "fecha_ultima_modificacion": original.get("publicacion_modificada"),
                "fotos": [{**f, "fecha_subida": f["fecha_subida"] - dp} for f in pub.get("fotos", [])],
            }})

    await recalcular_todos()
    await generar_propuestas()
    print("Datos de demostración borrados")


if __name__ == "__main__":
    accion = sys.argv[1] if len(sys.argv) > 1 else ""
    if accion == "crear":
        asyncio.run(crear())
    elif accion == "borrar":
        asyncio.run(borrar())
    else:
        sys.exit(__doc__)
