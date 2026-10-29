from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.compatibilidad import CANDIDATOS
from app.db import db
from app.deps import usuario_actual
from app.schemas.busqueda import TAMANO_PAGINA

router = APIRouter(prefix="/api/compatibilidades", tags=["Compatibilidad"])

SIN_COMPATIBILIDAD = HTTPException(status.HTTP_404_NOT_FOUND, "No hay compatibilidad calculada con este estudiante")


def de_usuario(usuario_id: ObjectId) -> dict:
    """Cálculos vigentes donde participa el usuario, esté como usuario_a o usuario_b."""
    return {"$or": [{"usuario_a_id": usuario_id}, {"usuario_b_id": usuario_id}], "vigente": True}


def el_otro(compatibilidad: dict, yo: ObjectId) -> ObjectId:
    return compatibilidad["usuario_b_id"] if compatibilidad["usuario_a_id"] == yo else compatibilidad["usuario_a_id"]


@router.get("")
async def posibles_roomies(pagina: int = Query(default=1, ge=1), usuario: dict = Depends(usuario_actual)):
    """HU-14: estudiantes compatibles, del más al menos compatible, de a 10.

    CA-14.4: no aparecen quienes no completaron el cuestionario, uno mismo ni las cuentas
    suspendidas. Tampoco los pares descartados por un conflicto en algo imprescindible.
    """
    yo = usuario["_id"]
    if not (usuario.get("cuestionario") or {}).get("completo"):
        return {"cuestionario_completo": False, "total": 0, "pagina": 1, "paginas": 1, "resultados": []}

    calculos = [c async for c in db.compatibilidades.find({**de_usuario(yo), "descartado": False})]
    otros = {
        u["_id"]: u
        async for u in db.usuarios.find({**CANDIDATOS, "_id": {"$in": [el_otro(c, yo) for c in calculos]}})
    }
    calculos = sorted(
        (c for c in calculos if el_otro(c, yo) in otros), key=lambda c: c["porcentaje"], reverse=True
    )
    pagina_actual = calculos[(pagina - 1) * TAMANO_PAGINA : pagina * TAMANO_PAGINA]

    ids_instituciones = {otros[el_otro(c, yo)].get("perfil", {}).get("institucion_id") for c in pagina_actual}
    siglas = {
        i["_id"]: i["sigla"]
        async for i in db.instituciones.find({"_id": {"$in": [i for i in ids_instituciones if i]}}, {"sigla": 1})
    }

    def resumen(c: dict) -> dict:
        otro = otros[el_otro(c, yo)]
        perfil = otro.get("perfil", {})
        return {
            "usuario": {
                "id": str(otro["_id"]),
                "nombre": otro["nombre"],
                "ap_paterno": otro.get("ap_paterno"),
                "foto_url": perfil.get("foto_url"),
                "carrera": perfil.get("carrera"),
                "institucion_sigla": siglas.get(perfil.get("institucion_id")),
                "verificado": otro.get("verificacion", {}).get("estado") == "verificado",
            },
            "porcentaje": c["porcentaje"],
            "nivel": c["nivel"],
            "categorias_coincidentes": c["categorias_coincidentes"],
            "categorias_diferentes": c["categorias_diferentes"],
        }

    return {
        "cuestionario_completo": True,
        "total": len(calculos),
        "pagina": pagina,
        "paginas": max(1, -(-len(calculos) // TAMANO_PAGINA)),
        "resultados": [resumen(c) for c in pagina_actual],
    }


@router.get("/{usuario_id}")
async def compatibilidad_con(usuario_id: str, usuario: dict = Depends(usuario_actual)):
    """Compatibilidad con un estudiante, categoría por categoría, vista desde quien consulta
    (CA-16.2: en qué coinciden y en qué no). El porcentaje es el mismo para ambos (CA-14.2)."""
    try:
        otro_id = ObjectId(usuario_id)
    except InvalidId:
        raise SIN_COMPATIBILIDAD
    yo = usuario["_id"]
    a, b = sorted([yo, otro_id])
    c = await db.compatibilidades.find_one({"usuario_a_id": a, "usuario_b_id": b, "vigente": True})
    if not c or not await db.usuarios.count_documents({**CANDIDATOS, "_id": otro_id}):
        raise SIN_COMPATIBILIDAD

    soy_a = c["usuario_a_id"] == yo
    return {
        "porcentaje": c["porcentaje"],
        "nivel": c["nivel"],
        "descartado": c["descartado"],
        "categoria_descarte": c["categoria_descarte"],
        "categorias_coincidentes": c["categorias_coincidentes"],
        "categorias_diferentes": c["categorias_diferentes"],
        "detalle": [
            {
                "categoria": d["categoria"],
                "mi_respuesta": d["respuesta_a" if soy_a else "respuesta_b"],
                "su_respuesta": d["respuesta_b" if soy_a else "respuesta_a"],
                "mi_importancia": d["importancia_a" if soy_a else "importancia_b"],
                "su_importancia": d["importancia_b" if soy_a else "importancia_a"],
                "coincide": d["coincide"],
                "puntaje": d["puntaje"],
                "conflicto_imprescindible": d["conflicto_imprescindible"],
            }
            for d in c["detalle"]
        ],
        "fecha_calculo": c["fecha_calculo"],
    }
