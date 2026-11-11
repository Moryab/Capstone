"""Ubicación de los alojamientos en el mapa.

El oferente puede marcar el punto exacto, pero a los demás solo se les muestra una zona: un círculo
de RADIO_ZONA_M metros que contiene el punto, sin que este quede en el centro. El centro de esa zona
se sortea una sola vez y se guarda, para que no cambie con cada consulta (si cambiara, promediando
varias se podría adivinar el punto). Sin punto marcado se usa el centro de la comuna.
"""
import math
import random

RADIO_ZONA_M = 300
# El centro de la zona queda a esta distancia del punto exacto, siempre dentro del círculo
DESPLAZAMIENTO_M = (100, 250)
# El punto debe estar dentro de la comuna elegida; con este margen caben las comunas más extensas
MAX_KM_DESDE_LA_COMUNA = 20

_azar = random.SystemRandom()


def distancia_km(a: list[float], b: list[float]) -> float:
    """Distancia en línea recta entre dos puntos [longitud, latitud] (fórmula del haversine)."""
    lon1, lat1, lon2, lat2 = map(math.radians, (*a, *b))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))


def centro_de_zona(exacto: list[float]) -> list[float]:
    """Un punto al azar a entre 100 y 250 m del exacto: el centro del círculo que ven los demás."""
    lng, lat = exacto
    km = _azar.uniform(*DESPLAZAMIENTO_M) / 1000
    rumbo = _azar.uniform(0, 2 * math.pi)
    return [
        round(lng + km * math.sin(rumbo) / (111.32 * math.cos(math.radians(lat))), 6),
        round(lat + km * math.cos(rumbo) / 111.32, 6),
    ]


def geojson(coordenadas: list[float]) -> dict:
    return {"type": "Point", "coordinates": coordenadas}
