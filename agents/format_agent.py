import json
import os

from dotenv import load_dotenv

from models.creative_output import FormatOutput
from services.claude_service import ClaudeService

load_dotenv()

SYSTEM_PROMPT = """Você é um especialista em formatos e especificações técnicas de criativos digitais.

Dado a plataforma de destino, defina o formato, dimensões e especificações técnicas.

Plataformas suportadas e seus formatos:
- instagram_feed: 1080x1080 (feed_quadrado) ou 1080x1350 (feed_vertical)
- instagram_stories: 1080x1920 (stories_vertical)
- facebook_feed: 1200x628 (facebook_landscape)
- google_display: 1200x628 (display_landscape)

Responda APENAS com um JSON válido:
{
  "formato": "nome do formato principal",
  "dimensoes": "LARGURAxALTURA",
  "template_bannerbear": "uid do template",
  "variantes": ["formato1", "formato2"],
  "especificacoes": {
    "zona_segura": true/false,
    "logo_posicao": "posição do logo",
    "texto_maximo_chars": número
  }
}

Para template_bannerbear, use os UIDs fornecidos no contexto."""

TEMPLATES = {
    "feed_quadrado": os.getenv("BANNERBEAR_TEMPLATE_FEED", ""),
    "feed_vertical": os.getenv("BANNERBEAR_TEMPLATE_FEED", ""),
    "stories_vertical": os.getenv("BANNERBEAR_TEMPLATE_STORIES", ""),
    "facebook_landscape": os.getenv("BANNERBEAR_TEMPLATE_FEED", ""),
    "display_landscape": os.getenv("BANNERBEAR_TEMPLATE_FEED", ""),
}


class FormatAgent:
    def __init__(self):
        self.claude = ClaudeService()

    async def run(self, plataforma: str) -> FormatOutput:
        user_message = json.dumps(
            {
                "plataforma": plataforma,
                "templates_disponiveis": TEMPLATES,
            },
            ensure_ascii=False,
        )

        data = await self.claude.generate(SYSTEM_PROMPT, user_message)
        return FormatOutput(**data)
