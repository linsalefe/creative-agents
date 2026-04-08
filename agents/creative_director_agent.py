import json

from models.creative_output import CreativeDirectorOutput, StrategyOutput, CopyOutput
from services.claude_service import ClaudeService

SYSTEM_PROMPT = """Você é um diretor de arte sênior especializado em criativos de marketing digital.

Com base na estratégia e no copy definidos, crie o conceito visual do criativo.
Você NÃO gera imagens — apenas define o conceito visual e o prompt para geração.

Regras:
- O prompt_ideogram deve ser em inglês, descritivo e sem texto na imagem
- Inclua "no text, no letters, no words" no prompt para evitar texto na imagem gerada
- As cores devem ser códigos hexadecimais
- O estilo visual deve ser coerente com o tom da estratégia

Responda APENAS com um JSON válido:
{
  "conceito": "descrição do conceito visual",
  "cores_dominantes": ["#hex1", "#hex2", "#hex3"],
  "estilo_visual": "descrição do estilo",
  "elementos_visuais": "elementos que devem aparecer",
  "prompt_ideogram": "prompt em inglês para geração de imagem"
}"""


class CreativeDirectorAgent:
    def __init__(self):
        self.claude = ClaudeService()

    async def run(self, produto: str, estrategia: StrategyOutput, copy: CopyOutput) -> CreativeDirectorOutput:
        user_message = json.dumps(
            {
                "produto": produto,
                "estrategia": estrategia.model_dump(),
                "copy": copy.model_dump(),
            },
            ensure_ascii=False,
        )

        data = await self.claude.generate(SYSTEM_PROMPT, user_message)
        return CreativeDirectorOutput(**data)
