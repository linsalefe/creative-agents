from pydantic import BaseModel


class VariationRequest(BaseModel):
    imagem_url: str
    template_uid: str | None = None


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
    prompt_ideogram: str


class VariationItem(BaseModel):
    copy: CopyVariation
    fundo_url: str | None = None
    imagem_url: str | None = None


class VariationOutput(BaseModel):
    original_url: str
    analise: VisionAnalysis
    variacoes: list[VariationItem]
