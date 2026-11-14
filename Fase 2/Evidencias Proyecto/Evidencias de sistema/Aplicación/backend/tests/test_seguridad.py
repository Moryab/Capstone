"""Pruebas de seguridad (PS-01 a PS-10): controles de los requisitos no funcionales RNF-01 a RNF-08."""

from datetime import datetime, timedelta, timezone

import jwt
from bson import ObjectId

from app.config import settings

from .conftest import CLAVE, PDF_MINIMO


# PS-01 · RNF-01: la contraseña se guarda como hash bcrypt, nunca en texto plano
def test_ps01_contrasena_con_bcrypt(estudiante, bd):
    yo = estudiante()
    guardada = bd.usuarios.find_one({"_id": ObjectId(yo["id"])})["password"]
    assert guardada != CLAVE
    assert guardada.startswith("$2b$")


# PS-02 · RNF-03: tras 5 intentos fallidos, el sexto responde 429 aunque la clave sea correcta
def test_ps02_bloqueo_por_fuerza_bruta(cliente, estudiante):
    yo = estudiante()
    for _ in range(settings.max_intentos_login):
        r = cliente.post("/api/auth/login", json={"correo": yo["correo"], "password": "Incorrecta1"})
        assert r.status_code == 401
    r = cliente.post("/api/auth/login", json={"correo": yo["correo"], "password": CLAVE})
    assert r.status_code == 429


# PS-03 · RNF-02 y RNF-04: sin token o con un token firmado con otra clave, 401
def test_ps03_token_ausente_o_falso(cliente, estudiante):
    yo = estudiante()
    assert cliente.get("/api/auth/me").status_code == 401
    falso = jwt.encode(
        {"sub": yo["id"], "rol": "administrador", "ver": 0,
         "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
        "otra-clave-que-no-es-la-del-servidor", algorithm="HS256",
    )
    assert cliente.get("/api/auth/me", headers={"Authorization": f"Bearer {falso}"}).status_code == 401


# PS-04 · RNF-04: un estudiante sin verificar no accede a roomies, propuestas ni chat (403)
def test_ps04_sin_verificar_no_accede(cliente, estudiante):
    yo = estudiante(modo="buscador")
    otro = estudiante(verificado=True)
    assert cliente.get("/api/compatibilidades", headers=yo["headers"]).status_code == 403
    assert cliente.get("/api/matches", headers=yo["headers"]).status_code == 403
    assert cliente.get("/api/conversaciones", headers=yo["headers"]).status_code == 403
    r = cliente.post("/api/conversaciones", json={"usuario_id": otro["id"]}, headers=yo["headers"])
    assert r.status_code == 403


# PS-05 · RNF-04: un estudiante no accede a las rutas del administrador (403)
def test_ps05_estudiante_sin_rutas_de_admin(cliente, estudiante):
    yo = estudiante(verificado=True)
    for ruta in ("/api/admin/usuarios", "/api/admin/resumen", "/api/verificacion/solicitudes"):
        assert cliente.get(ruta, headers=yo["headers"]).status_code == 403, ruta


# PS-06 · RNF-05: un texto renombrado a .pdf se rechaza; el tipo se valida por el contenido (422)
def test_ps06_tipo_por_contenido(cliente, estudiante, institucion_id):
    yo = estudiante()
    r = cliente.post("/api/verificacion", headers=yo["headers"],
                     data={"institucion_id": institucion_id, "tipo_comprobante": "certificado_alumno_regular"},
                     files={"comprobante": ("certificado.pdf", b"esto es solo texto", "application/pdf")})
    assert r.status_code == 422
    assert "comprobante" in r.json()["errores"]


# PS-07 · RNF-05: un comprobante de más de 5 MB se rechaza (422)
def test_ps07_tamano_maximo(cliente, estudiante, institucion_id):
    yo = estudiante()
    grande = PDF_MINIMO + b"0" * (settings.max_comprobante_mb * 1024 * 1024)
    r = cliente.post("/api/verificacion", headers=yo["headers"],
                     data={"institucion_id": institucion_id, "tipo_comprobante": "certificado_alumno_regular"},
                     files={"comprobante": ("certificado.pdf", grande, "application/pdf")})
    assert r.status_code == 422
    assert "comprobante" in r.json()["errores"]


# PS-08 · RNF-05: un estudiante no puede abrir el comprobante de otro (403); su dueño sí (200)
def test_ps08_comprobante_privado(cliente, bd, estudiante, institucion_id):
    duenio, otro = estudiante(), estudiante()
    cliente.post("/api/verificacion", headers=duenio["headers"],
                 data={"institucion_id": institucion_id, "tipo_comprobante": "certificado_alumno_regular"},
                 files={"comprobante": ("certificado.pdf", PDF_MINIMO, "application/pdf")})
    solicitud = bd.solicitudes_verificacion.find_one({"usuario_id": ObjectId(duenio["id"])})
    ruta = f"/api/verificacion/solicitudes/{solicitud['_id']}/comprobante"
    assert cliente.get(ruta, headers=otro["headers"]).status_code == 403
    assert cliente.get(ruta, headers=duenio["headers"]).status_code == 200


# PS-09 · RNF-04: un intento de inyección NoSQL en el inicio de sesión se rechaza (422)
def test_ps09_inyeccion_nosql(cliente):
    r = cliente.post("/api/auth/login", json={"correo": {"$ne": None}, "password": {"$ne": None}})
    assert r.status_code == 422


# PS-10 · RNF-02: al suspender una cuenta se cierra su sesión abierta (401) y no puede volver a entrar (403)
def test_ps10_suspension_corta_la_sesion(cliente, estudiante, admin):
    yo = estudiante(verificado=True)
    assert cliente.get("/api/auth/me", headers=yo["headers"]).status_code == 200
    r = cliente.post(f"/api/moderacion/usuarios/{yo['id']}/suspender",
                     json={"justificacion": "Prueba automatizada de suspensión"}, headers=admin)
    assert r.status_code == 200, r.text
    assert cliente.get("/api/auth/me", headers=yo["headers"]).status_code == 401
    r = cliente.post("/api/auth/login", json={"correo": yo["correo"], "password": CLAVE})
    assert r.status_code == 403
    assert r.json()["detail"] == "Tu cuenta está suspendida"
