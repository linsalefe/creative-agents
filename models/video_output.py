from pydantic import BaseModel
from typing import Optional, Literal


class VideoRequest(BaseModel):
    produto: str
    publico: str
    contexto: str
    tipo: Literal["ken_burns", "slideshow", "motion_graphics"] = "ken_burns"
    plataforma: Literal["feed", "stories", "reels"] = "stories"
    duracao_segundos: int = 10
    imagem_url: Optional[str] = None


class VideoTextOverlay(BaseModel):
    texto: str
    tempo_inicio: float
    tempo_fim: float
    animacao: Literal["fade_in", "slide_up", "typewriter", "scale_in", "word_reveal"] = "fade_in"
    posicao: Literal["top", "center", "bottom"] = "center"
    tamanho: Literal["grande", "medio", "pequeno"] = "grande"


class VideoSlide(BaseModel):
    imagem_url: str
    duracao: float
    transicao: Literal["fade", "slide_left", "slide_right", "zoom_in"] = "fade"


class VideoScript(BaseModel):
    tipo: str
    duracao_segundos: int
    fps: int = 30
    width: int = 1080
    height: int = 1920
    cor_primaria: str
    cor_secundaria: str
    cor_texto: str = "#FFFFFF"
    fonte: str = "Inter"
    textos: list[VideoTextOverlay]
    slides: list[VideoSlide] = []
    zoom_inicio: float = 1.0
    zoom_fim: float = 1.3
    direcao_pan: Literal["left", "right", "up", "down"] = "right"
    background_tipo: Literal["gradiente", "solido", "imagem"] = "gradiente"
    elementos_decorativos: bool = True
    social_proof: Optional[str] = None


class VideoOutput(BaseModel):
    id: str
    video_url: str
    thumbnail_url: Optional[str] = None
    duracao_segundos: int
    tipo: str
    formato: str
    dimensoes: str
    script: VideoScript
    copy_legenda: Optional[str] = None
