from pydantic import BaseModel


class VisionAnalysis(BaseModel):
    headline: str
    subheadline: str
    cta: str
    tom: str
    publico: str
    contexto: str
    objetivo: str
    estilo_visual: str
    descricao_fundo: str


class CopyVariation(BaseModel):
    headline: str
    subheadline: str
    cta: str
    legenda: str = ""          # sugestao de legenda para redes sociais
    prompt_ideogram: str = ""  # campo interno, nao exibido na UI


class VariationItem(BaseModel):
    copy: CopyVariation
    fundo_url: str | None = None
    imagem_url: str | None = None        # feed (1:1) ou unico formato
    imagem_story_url: str | None = None  # story (9:16) quando modo dual
    formato: str = "feed"


class VariationOutput(BaseModel):
    original_url: str
    analise: VisionAnalysis
    variacoes: list[VariationItem]
    formato: str = "feed"  # "feed" | "story" | "ambos"
