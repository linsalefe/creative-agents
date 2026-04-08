import json

from models.variation import VisionAnalysis, CopyVariation
from services.gemini_service import GeminiService

SYSTEM_PROMPT = """Voce e um copywriter senior especializado em criativos de marketing digital.

Dado a analise de um criativo original, gere exatamente 5 variacoes de copy.

Regras:
- Mantenha o mesmo tom, publico-alvo e objetivo do original
- Cada variacao deve ser criativa e distinta das outras
- headline: maximo 60 caracteres, impactante
- subheadline: maximo 120 caracteres, reforca a proposta de valor
- cta: maximo 30 caracteres, acao clara
- legenda: sugestao de legenda para post nas redes sociais (maximo 300 caracteres), inclua emojis relevantes e hashtags no final
- Varie as abordagens: urgencia, prova social, exclusividade, beneficio direto, curiosidade

Responda APENAS com um JSON valido:
{
  "variacoes": [
    {"headline": "...", "subheadline": "...", "cta": "...", "legenda": "..."},
    {"headline": "...", "subheadline": "...", "cta": "...", "legenda": "..."},
    {"headline": "...", "subheadline": "...", "cta": "...", "legenda": "..."},
    {"headline": "...", "subheadline": "...", "cta": "...", "legenda": "..."},
    {"headline": "...", "subheadline": "...", "cta": "...", "legenda": "..."}
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
                    "Gere 5 variacoes de copy mantendo o tom, publico e objetivo. "
                    "Cada variacao deve ter abordagem diferente e uma legenda para redes sociais."
                ),
            },
            ensure_ascii=False,
        )

        data = await self.gemini.generate(SYSTEM_PROMPT, user_message)
        return [CopyVariation(**v) for v in data["variacoes"]]
