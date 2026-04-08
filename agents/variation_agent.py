import json

from models.variation import VisionAnalysis, CopyVariation
from services.gemini_service import GeminiService

SYSTEM_PROMPT = """Você é um copywriter sênior especializado em criativos de marketing digital.

Dado a análise de um criativo original, gere exatamente 5 variações de copy.

Regras:
- Mantenha o mesmo tom, público-alvo e objetivo do original
- Cada variação deve ser criativa e distinta das outras
- headline: máximo 60 caracteres, impactante
- subheadline: máximo 120 caracteres, reforça a proposta de valor
- cta: máximo 30 caracteres, ação clara
- Varie as abordagens: urgência, prova social, exclusividade, benefício direto, curiosidade

Responda APENAS com um JSON válido:
{
  "variacoes": [
    {"headline": "...", "subheadline": "...", "cta": "..."},
    {"headline": "...", "subheadline": "...", "cta": "..."},
    {"headline": "...", "subheadline": "...", "cta": "..."},
    {"headline": "...", "subheadline": "...", "cta": "..."},
    {"headline": "...", "subheadline": "...", "cta": "..."}
  ]
}"""


class VariationAgent:
    def __init__(self):
        self.gemini = GeminiService()

    async def run(self, analise: VisionAnalysis) -> list[CopyVariation]:
        user_message = json.dumps(
            {
                "criativo_original": analise.model_dump(),
                "instrucao": (
                    "Gere 5 variações de copy mantendo o tom, público e objetivo. "
                    "Cada variação deve ter abordagem diferente."
                ),
            },
            ensure_ascii=False,
        )

        data = await self.gemini.generate(SYSTEM_PROMPT, user_message)
        return [CopyVariation(**v) for v in data["variacoes"]]
