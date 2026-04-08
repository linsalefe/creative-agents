from pydantic import BaseModel
from typing import Optional


class StrategyOutput(BaseModel):
    objetivo: str
    etapa_funil: str
    cta: str
    tom: str
    plataforma: str


class CopyOutput(BaseModel):
    headline: str
    subheadline: str
    cta: str
    copy_legenda: str


class CreativeDirectorOutput(BaseModel):
    conceito: str
    cores_dominantes: list[str]
    estilo_visual: str
    elementos_visuais: str
    prompt_ideogram: str


class FormatOutput(BaseModel):
    formato: str
    dimensoes: str
    template_bannerbear: str
    variantes: list[str]
    especificacoes: dict


class ImageOutput(BaseModel):
    imagem_url: str
    criativo_final_url: Optional[str] = None
    variantes_urls: list[str] = []


class CreativeOutput(BaseModel):
    id: Optional[str] = None
    estrategia: StrategyOutput
    copy: CopyOutput
    direcao_criativa: CreativeDirectorOutput
    formato: FormatOutput
    imagem: ImageOutput
