import json

from models.video_output import VideoRequest, VideoScript, VideoTextOverlay
from models.creative_output import CopyOutput
from services.claude_service import ClaudeService

SYSTEM_PROMPT = """Você é um diretor de vídeo especializado em criativos curtos para Meta Ads (Stories, Reels, Feed).

Dado um briefing com produto, público, contexto, tipo de vídeo e plataforma, você deve gerar o roteiro técnico do vídeo no formato JSON.

Regras OBRIGATÓRIAS:
- Hook forte nos primeiros 2 segundos (texto grande, animação rápida como scale_in ou slide_up)
- Proposta de valor no meio do vídeo
- CTA claro e urgente nos últimos 3 segundos
- Textos CURTOS: máximo 8 palavras por overlay
- Cores que combinem com o produto e público
- Timings devem cobrir toda a duração sem sobreposição excessiva

Para tipo "ken_burns":
- Definir zoom_inicio (1.0-1.1) e zoom_fim (1.2-1.4) para efeito suave
- direcao_pan: left, right, up ou down
- background_tipo: "imagem"

Para tipo "slideshow":
- Definir 3-4 slides com transições variadas (fade, slide_left, slide_right, zoom_in)
- Cada slide com duração proporcional ao total
- Usar imagem_url placeholder que será substituída

Para tipo "motion_graphics":
- background_tipo: "gradiente" ou "solido"
- elementos_decorativos: true para adicionar shapes animados
- Textos mais impactantes e maiores

Responda APENAS com um JSON válido no formato:
{
  "tipo": "ken_burns | slideshow | motion_graphics",
  "duracao_segundos": 10,
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "cor_primaria": "#hex",
  "cor_secundaria": "#hex",
  "cor_texto": "#FFFFFF",
  "fonte": "Inter",
  "textos": [
    {
      "texto": "Texto curto",
      "tempo_inicio": 0.0,
      "tempo_fim": 2.5,
      "animacao": "fade_in | slide_up | typewriter | scale_in",
      "posicao": "top | center | bottom",
      "tamanho": "grande | medio | pequeno"
    }
  ],
  "slides": [],
  "zoom_inicio": 1.0,
  "zoom_fim": 1.3,
  "direcao_pan": "right",
  "background_tipo": "gradiente | solido | imagem",
  "elementos_decorativos": true
}"""


class VideoScriptAgent:
    def __init__(self):
        self.claude = ClaudeService()

    async def run(self, request: VideoRequest, copy: CopyOutput) -> VideoScript:
        dims = {
            "stories": (1080, 1920),
            "reels": (1080, 1920),
            "feed": (1080, 1080),
        }
        w, h = dims.get(request.plataforma, (1080, 1920))

        user_message = json.dumps(
            {
                "produto": request.produto,
                "publico": request.publico,
                "contexto": request.contexto,
                "tipo": request.tipo,
                "plataforma": request.plataforma,
                "duracao_segundos": request.duracao_segundos,
                "width": w,
                "height": h,
                "copy": {
                    "headline": copy.headline,
                    "subheadline": copy.subheadline,
                    "cta": copy.cta,
                },
            },
            ensure_ascii=False,
        )

        data = await self.claude.generate(SYSTEM_PROMPT, user_message)
        return VideoScript(**data)
