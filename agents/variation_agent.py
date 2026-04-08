import json

from models.variation import VisionAnalysis, CopyVariation
from services.claude_service import ClaudeService

SYSTEM_PROMPT = """Você é um diretor criativo sênior especializado em criativos de marketing digital.

Dado a análise de um criativo original, gere exatamente 5 variações completas.
Cada variação tem copy diferente E um prompt de imagem de fundo diferente.

Regras para copy:
- Mantenha o mesmo tom, público-alvo e objetivo do original
- Cada variação deve ser criativa e distinta das outras
- headline: máximo 60 caracteres, impactante
- subheadline: máximo 120 caracteres, reforça a proposta de valor
- cta: máximo 30 caracteres, ação clara
- Varie as abordagens: urgência, prova social, exclusividade, benefício direto, curiosidade

Regras para prompt_ideogram:
- Cada prompt deve gerar uma cena/fundo DIFERENTE das outras, mas mantendo o mesmo estilo visual geral
- O prompt deve ser em inglês, descritivo e fotorrealista
- SEMPRE inclua "no text, no letters, no words, no writing" no prompt
- Mantenha coerência com o tom e público do criativo
- Varie os cenários: ambientes, iluminação, perspectivas, elementos de cena
- Use a descrição do fundo original como referência de estilo, mas crie cenas distintas

Responda APENAS com um JSON válido:
{
  "variacoes": [
    {"headline": "...", "subheadline": "...", "cta": "...", "prompt_ideogram": "..."},
    {"headline": "...", "subheadline": "...", "cta": "...", "prompt_ideogram": "..."},
    {"headline": "...", "subheadline": "...", "cta": "...", "prompt_ideogram": "..."},
    {"headline": "...", "subheadline": "...", "cta": "...", "prompt_ideogram": "..."},
    {"headline": "...", "subheadline": "...", "cta": "...", "prompt_ideogram": "..."}
  ]
}"""


class VariationAgent:
    def __init__(self):
        self.claude = ClaudeService()

    async def run(self, analise: VisionAnalysis) -> list[CopyVariation]:
        user_message = json.dumps(
            {
                "criativo_original": analise.model_dump(),
                "instrucao": (
                    "Gere 5 variações completas (copy + prompt de fundo). "
                    "Cada variação deve ter abordagem de copy diferente E uma cena de fundo distinta. "
                    f"Estilo visual de referência: {analise.estilo_visual}. "
                    f"Fundo original: {analise.descricao_fundo}"
                ),
            },
            ensure_ascii=False,
        )

        data = await self.claude.generate(SYSTEM_PROMPT, user_message)
        return [CopyVariation(**v) for v in data["variacoes"]]
