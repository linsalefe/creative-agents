from pydantic import BaseModel
from typing import Optional


class MapVideoRequest(BaseModel):
    produto: str
    publico: str
    contexto: str
    plataforma: Optional[str] = "instagram_feed"
    # Localização do mapa
    latitude: float
    longitude: float
    zoom_inicio: Optional[float] = 4.0
    zoom_fim: Optional[float] = 14.0
    # Estilo
    estilo_mapa: Optional[str] = "dark"
    duracao_segundos: Optional[int] = 12


class MapKeyframe(BaseModel):
    tempo: float
    latitude: float
    longitude: float
    zoom: float
    pitch: float
    bearing: float
    duracao_transicao: float


class MapOverlay(BaseModel):
    texto: str
    tempo_inicio: float
    tempo_fim: float
    posicao: str
    estilo: str


class MapHighlight(BaseModel):
    tipo: str
    geojson: Optional[dict] = None
    cor: str
    tempo_inicio: float


class MapScript(BaseModel):
    duracao_segundos: int
    estilo_mapa: str
    keyframes: list[MapKeyframe]
    overlays: list[MapOverlay]
    highlights: list[MapHighlight]
    fps: int = 30


class MapVideoOutput(BaseModel):
    id: str
    video_url: str
    thumbnail_url: Optional[str] = None
    duracao_segundos: int
    formato: str
    dimensoes: str
    script: MapScript
    copy_legenda: Optional[str] = None
