"""Pruebas de integración (PI-01 a PI-10): flujos completos a través de la API, con la base de prueba."""

from bson import ObjectId

from .conftest import CLAVE, CUESTIONARIO, PDF_MINIMO, datos_registro, publicacion


# PI-01 · HU-01: el registro crea la cuenta como estudiante, sin verificar y con el correo por confirmar
def test_pi01_registro(cliente, bd):
    datos = datos_registro()
    r = cliente.post("/api/auth/registro", json=datos)
    assert r.status_code == 201
    usuario = r.json()["usuario"]
    assert usuario["rol"] == "estudiante"
    assert usuario["verificacion_estado"] == "no_verificado"
    assert usuario["correo_verificado"] is False
    assert bd.usuarios.find_one({"_id": ObjectId(usuario["id"])})["perfil"]["telefono"].startswith("+569")


# PI-02 · CA-01.3: datos inválidos responden 422 con el error de cada campo
def test_pi02_registro_invalido(cliente):
    r = cliente.post("/api/auth/registro", json=datos_registro(
        rut="12.345.678-9", telefono="123", password="corta", confirmacion="corta"))
    assert r.status_code == 422
    errores = r.json()["errores"]
    assert {"rut", "telefono", "password"} <= errores.keys()


# PI-03 · CA-01.2: correo y RUT ya usados responden 409 indicando cuáles
def test_pi03_registro_duplicado(cliente):
    primero = datos_registro()
    assert cliente.post("/api/auth/registro", json=primero).status_code == 201
    repetido = datos_registro(correo=primero["correo"], rut=primero["rut"])
    r = cliente.post("/api/auth/registro", json=repetido)
    assert r.status_code == 409
    assert {"correo", "rut"} <= r.json()["errores"].keys()


# PI-04 · HU-02: con sesión se accede a los datos propios; al cerrar sesión el token deja de servir
def test_pi04_sesion_y_cierre(cliente, estudiante):
    yo = estudiante()
    r = cliente.get("/api/auth/me", headers=yo["headers"])
    assert r.status_code == 200 and r.json()["correo"] == yo["correo"]
    assert cliente.post("/api/auth/logout", headers=yo["headers"]).status_code == 200
    assert cliente.get("/api/auth/me", headers=yo["headers"]).status_code == 401


# PI-05 · CA-02.2: clave incorrecta y correo inexistente dan el mismo mensaje (401)
def test_pi05_mensaje_generico(cliente, estudiante):
    yo = estudiante()
    clave_mala = cliente.post("/api/auth/login", json={"correo": yo["correo"], "password": "Otra12345"})
    no_existe = cliente.post("/api/auth/login", json={"correo": "nadie.existe@pruebas.cl", "password": CLAVE})
    assert clave_mala.status_code == no_existe.status_code == 401
    assert clave_mala.json()["detail"] == no_existe.json()["detail"]


# PI-06 · HU-13 y HU-14: guardar el cuestionario calcula la compatibilidad con los demás
def test_pi06_cuestionario_calcula_compatibilidad(cliente, bd, estudiante):
    otros = [estudiante(verificado=True, cuestionario=CUESTIONARIO) for _ in range(2)]
    yo = estudiante(verificado=True)
    r = cliente.put("/api/cuestionario", json=CUESTIONARIO, headers=yo["headers"])
    assert r.status_code == 200
    assert r.json()["compatibilidades_calculadas"] >= 2
    mio = ObjectId(yo["id"])
    for otro in otros:
        par = sorted([mio, ObjectId(otro["id"])])
        calculo = bd.compatibilidades.find_one({"usuario_a_id": par[0], "usuario_b_id": par[1], "vigente": True})
        assert calculo and calculo["porcentaje"] == 100.0


# PI-07 · HU-15: un estudiante verificado recibe la lista paginada de posibles roomies
def test_pi07_lista_de_posibles_roomies(cliente, estudiante):
    buscador = estudiante(verificado=True, modo="buscador", buscando=True, cuestionario=CUESTIONARIO)
    oferente = estudiante(verificado=True, modo="oferente", cuestionario=CUESTIONARIO)
    r = cliente.get("/api/compatibilidades", headers=oferente["headers"])
    assert r.status_code == 200
    datos = r.json()
    assert {"total", "pagina", "paginas", "resultados"} <= datos.keys()
    assert len(datos["resultados"]) <= 10
    assert buscador["id"] in [res["usuario"]["id"] for res in datos["resultados"]] or datos["total"] > 10


# PI-08 · HU-21: subir un comprobante deja la solicitud pendiente y no permite enviar otra
def test_pi08_solicitud_pendiente(cliente, estudiante, institucion_id):
    yo = estudiante()
    formulario = {"institucion_id": institucion_id, "tipo_comprobante": "certificado_alumno_regular"}
    archivo = {"comprobante": ("certificado.pdf", PDF_MINIMO, "application/pdf")}
    r = cliente.post("/api/verificacion", data=formulario, files=archivo, headers=yo["headers"])
    assert r.status_code == 201
    assert cliente.get("/api/auth/me", headers=yo["headers"]).json()["verificacion_estado"] == "pendiente"
    otra = cliente.post("/api/verificacion", data=formulario, files=archivo, headers=yo["headers"])
    assert otra.status_code == 409


# PI-09 · HU-22: cuando el administrador aprueba, el estudiante obtiene acceso completo
def test_pi09_aprobacion_da_acceso(cliente, bd, estudiante, admin, institucion_id):
    yo = estudiante()
    assert cliente.get("/api/compatibilidades", headers=yo["headers"]).status_code == 403
    cliente.post("/api/verificacion", headers=yo["headers"],
                 data={"institucion_id": institucion_id, "tipo_comprobante": "certificado_alumno_regular"},
                 files={"comprobante": ("certificado.pdf", PDF_MINIMO, "application/pdf")})
    solicitud = bd.solicitudes_verificacion.find_one({"usuario_id": ObjectId(yo["id"])})
    r = cliente.post(f"/api/verificacion/solicitudes/{solicitud['_id']}/aprobar", headers=admin)
    assert r.status_code == 200
    assert cliente.get("/api/auth/me", headers=yo["headers"]).json()["verificacion_estado"] == "verificado"
    assert cliente.get("/api/compatibilidades", headers=yo["headers"]).status_code == 200


# PI-10 · HU-09 y HU-10: la búsqueda de alojamientos responde con el filtro de costo
def test_pi10_busqueda_con_filtro_de_costo(cliente, estudiante, comuna_id):
    oferente = estudiante(verificado=True, modo="oferente")
    barata = cliente.post("/api/publicaciones", json=publicacion(comuna_id, 150_000), headers=oferente["headers"])
    cara = cliente.post("/api/publicaciones", json=publicacion(comuna_id, 400_000), headers=oferente["headers"])
    assert barata.status_code == cara.status_code == 201, (barata.text, cara.text)

    buscador = estudiante(verificado=True, modo="buscador")
    r = cliente.get("/api/publicaciones", params={"costo_min": 100_000, "costo_max": 200_000},
                    headers=buscador["headers"])
    assert r.status_code == 200
    costos = [p["costo_mensual"] for p in r.json()["resultados"]]
    assert costos and all(100_000 <= c <= 200_000 for c in costos)

    # CA-10.3: el mínimo no puede superar al máximo
    r = cliente.get("/api/publicaciones", params={"costo_min": 300_000, "costo_max": 100_000},
                    headers=buscador["headers"])
    assert r.status_code == 422
