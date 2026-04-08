from models.variation import VisionAnalysis
from services.gemini_service import GeminiService

SYSTEM_PROMPT = """Você é um analista de marketing visual especializado em criativos digitais.

Analise a imagem do criativo fornecido e extraia as seguintes informações:

- headline: o texto principal/título do criativo
- subheadline: o texto secundário/subtítulo
- cta: o call-to-action (botão ou texto de ação)
- tom: o tom de comunicação usado (ex: "urgência + autoridade", "inspiracional + acolhedor")
- publico: o público-alvo inferido a partir do criativo
- contexto: o contexto/campanha inferido (ex: "lançamento de turma", "black friday")
- objetivo: o objetivo de marketing (ex: "conversao", "awareness", "engajamento")
- estilo_visual: o estilo visual geral (ex: "fotorrealista, clean, cores quentes", "flat design, minimalista")
- descricao_fundo: descrição detalhada da imagem de fundo/cena usada no criativo, em inglês, sem mencionar textos

Se algum elemento de texto não estiver visível na imagem, faça sua melhor inferência com base nos elementos visuais.

Responda APENAS com um JSON válido:
{
  "headline": "...",
  "subheadline": "...",
  "cta": "...",
  "tom": "...",
  "publico": "...",
  "contexto": "...",
  "objetivo": "...",
  "estilo_visual": "...",
  "descricao_fundo": "..."
}"""


class VisionAgent:
    def __init__(self):
        self.gemini = GeminiService()

    async def run(self, image_data: bytes, mime_type: str) -> VisionAnalysis:
        data = await self.gemini.generate_with_image(
            system_prompt=SYSTEM_PROMPT,
            text="Analise este criativo de marketing e extraia todas as informações solicitadas.",
            image_data=image_data,
            mime_type=mime_type,
        )
        return VisionAnalysis(**data)
