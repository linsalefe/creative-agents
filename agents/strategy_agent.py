import json

from models.creative_output import StrategyOutput
from services.claude_service import ClaudeService

SYSTEM_PROMPT = """Você é um estrategista de marketing digital especializado em campanhas de educação e infoprodutos.

Dado um briefing com produto, público-alvo e contexto, você deve definir a estratégia do criativo.

Responda APENAS com um JSON válido no seguinte formato:
{
  "objetivo": "conversao | awareness | engajamento | remarketing",
  "etapa_funil": "topo | meio | fundo",
  "cta": "texto do call-to-action principal",
  "tom": "descrição do tom de comunicação",
  "plataforma": "instagram_feed | instagram_stories | facebook_feed | google_display"
}

Se a plataforma não for especificada no briefing, escolha a mais adequada para o objetivo."""


class StrategyAgent:
    def __init__(self):
        self.claude = ClaudeService()

    async def run(self, produto: str, publico: str, contexto: str, plataforma: str | None = None) -> StrategyOutput:
        user_message = json.dumps(
            {
                "produto": produto,
                "publico": publico,
                "contexto": contexto,
                "plataforma": plataforma or "definir automaticamente",
            },
            ensure_ascii=False,
        )

        data = await self.claude.generate(SYSTEM_PROMPT, user_message)
        return StrategyOutput(**data)
