"""Ubicación de los alojamientos en el mapa.

La calle y el número son públicos, así que el punto que marca el oferente se muestra tal cual: es el que
ven todos en el mapa y desde el que se mide la distancia a la sede. Sin punto marcado se usa el centro
de la comuna.
"""
import math

# El punto debe estar dentro de la comuna elegida; con este margen caben las comunas más extensas
MAX_KM_DESDE_LA_COMUNA = 20


def distancia_km(a: list[float], b: list[float]) -> float:
    """Distancia en línea recta entre dos puntos [longitud, latitud] (fórmula del haversine)."""
    lon1, lat1, lon2, lat2 = map(math.radians, (*a, *b))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))


def geojson(coordenadas: list[float]) -> dict:
    return {"type": "Point", "coordinates": coordenadas}
