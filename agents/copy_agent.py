import json

from models.creative_output import CopyOutput, StrategyOutput
from services.claude_service import ClaudeService

SYSTEM_PROMPT = """Você é um copywriter sênior especializado em criativos de marketing digital para educação e infoprodutos.

Com base na estratégia definida e nos dados do produto, escreva o texto do criativo.

Regras:
- Headline: máximo 60 caracteres, impactante e direto
- Subheadline: máximo 120 caracteres, reforça a proposta de valor
- CTA: máximo 30 caracteres, ação clara
- Copy legenda: texto completo para legenda do post (máx 300 palavras)
- Use o tom definido na estratégia
- Adapte para a etapa do funil

Responda APENAS com um JSON válido:
{
  "headline": "...",
  "subheadline": "...",
  "cta": "...",
  "copy_legenda": "..."
}"""


class CopyAgent:
    def __init__(self):
        self.claude = ClaudeService()

    async def run(self, produto: str, publico: str, estrategia: StrategyOutput) -> CopyOutput:
        user_message = json.dumps(
            {
                "produto": produto,
                "publico": publico,
                "estrategia": estrategia.model_dump(),
            },
            ensure_ascii=False,
        )

        data = await self.claude.generate(SYSTEM_PROMPT, user_message)
        return CopyOutput(**data)
