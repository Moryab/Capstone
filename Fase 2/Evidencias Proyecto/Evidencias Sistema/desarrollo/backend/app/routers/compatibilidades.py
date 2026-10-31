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


async def resumenes(usuarios: list[dict]) -> dict[ObjectId, dict]:
    """Datos de tarjeta de cada estudiante (foto, carrera, institución), por id.

    Los usan «Posibles roomies» y las propuestas de match.
    """
    ids_instituciones = {u.get("perfil", {}).get("institucion_id") for u in usuarios}
    siglas = {
        i["_id"]: i["sigla"]
        async for i in db.instituciones.find({"_id": {"$in": [i for i in ids_instituciones if i]}}, {"sigla": 1})
    }
    return {
        u["_id"]: {
            "id": str(u["_id"]),
            "nombre": u["nombre"],
            "ap_paterno": u.get("ap_paterno"),
            "foto_url": u.get("perfil", {}).get("foto_url"),
            "carrera": u.get("perfil", {}).get("carrera"),
            "institucion_sigla": siglas.get(u.get("perfil", {}).get("institucion_id")),
            "verificado": u.get("verificacion", {}).get("estado") == "verificado",
        }
        for u in usuarios
    }


async def rol_complementario(usuario: dict) -> dict | None:
    """Condición de Mongo para los estudiantes con el rol opuesto, o None si aún no elige rol.

    Al buscador se le muestran oferentes con al menos un alojamiento activo con cupos; al oferente,
    buscadores con la búsqueda activada. La compatibilidad se sigue calculando con todos (EP-08).
    """
    modo = usuario.get("modo")
    if modo == "buscador":
        con_cupos = await db.publicaciones.distinct(
            "oferente_id", {"estado": "activa", "cupos_disponibles": {"$gt": 0}}
        )
        return {"modo": "oferente", "_id": {"$in": con_cupos}}
    if modo == "oferente":
        return {"modo": "buscador", "buscando_alojamiento": True}
    return None


@router.get("")
async def posibles_roomies(pagina: int = Query(default=1, ge=1), usuario: dict = Depends(usuario_actual)):
    """HU-14: estudiantes compatibles con el rol opuesto, del más al menos compatible, de a 10.

    CA-14.4: no aparecen quienes no completaron el cuestionario, uno mismo ni las cuentas
    suspendidas. Tampoco los pares descartados por un conflicto en algo imprescindible.
    """
    yo = usuario["_id"]
    modo = usuario.get("modo")
    if not (usuario.get("cuestionario") or {}).get("completo"):
        return {"cuestionario_completo": False, "modo": modo, "total": 0, "pagina": 1, "paginas": 1, "resultados": []}
    complementario = await rol_complementario(usuario)
    if complementario is None:
        return {"cuestionario_completo": True, "modo": None, "total": 0, "pagina": 1, "paginas": 1, "resultados": []}

    # CA-17.6: con quien ya se confirmó un match deja de aparecer como posible roomie
    con_match = [
        el_otro(m, yo)
        async for m in db.matches.find(
            {"$or": [{"usuario_a_id": yo}, {"usuario_b_id": yo}], "estado": {"$in": ["confirmado", "finalizado"]}},
            {"usuario_a_id": 1, "usuario_b_id": 1},
        )
    ]
    calculos = [c async for c in db.compatibilidades.find({**de_usuario(yo), "descartado": False})]
    calculos = [c for c in calculos if el_otro(c, yo) not in con_match]
    ids = [el_otro(c, yo) for c in calculos]
    if "_id" in complementario:  # buscador: solo oferentes con cupos
        permitidos = set(complementario.pop("_id")["$in"])
        ids = [i for i in ids if i in permitidos]
    otros = {
        u["_id"]: u
        async for u in db.usuarios.find({**CANDIDATOS, **complementario, "_id": {"$in": ids}})
    }
    calculos = sorted(
        (c for c in calculos if el_otro(c, yo) in otros), key=lambda c: c["porcentaje"], reverse=True
    )
    pagina_actual = calculos[(pagina - 1) * TAMANO_PAGINA : pagina * TAMANO_PAGINA]

    tarjetas = await resumenes([otros[el_otro(c, yo)] for c in pagina_actual])

    def resumen(c: dict) -> dict:
        return {
            "usuario": tarjetas[el_otro(c, yo)],
            "porcentaje": c["porcentaje"],
            "nivel": c["nivel"],
            "categorias_coincidentes": c["categorias_coincidentes"],
            "categorias_diferentes": c["categorias_diferentes"],
        }

    return {
        "cuestionario_completo": True,
        "modo": modo,
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
