import json

from models.map_video_output import MapVideoRequest, MapScript
from models.creative_output import CopyOutput
from services.claude_service import ClaudeService

SYSTEM_PROMPT = """Você é um diretor de cinematografia cartográfica especializado em criar vídeos de mapas animados para Meta Ads (Instagram/Facebook).

Dado um briefing com produto, público, contexto, coordenadas geográficas e estilo, você deve gerar um roteiro de animação de mapa com keyframes de câmera.

Regras:
- O vídeo deve ter entre 6 e 15 segundos
- A câmera deve fazer zoom progressivo: começar em visão ampla (zoom baixo) e terminar em close (zoom alto)
- Movimentos suaves: evitar saltos bruscos de câmera
- Pitch máximo de 60 graus para efeito 3D dramático
- Bearing deve rotacionar suavemente para dar sensação de movimento
- Incluir overlays de texto:
  - Headline impactante nos primeiros 3 segundos
  - Subheadline no meio do vídeo
  - CTA nos últimos 3 segundos
- Highlights opcionais: áreas ou pontos a destacar no mapa
- FPS fixo em 30
- duracao_transicao em milissegundos (tempo que a transição leva para chegar ao keyframe)

Estilos de mapa disponíveis: dark, satellite, light, streets

Responda APENAS com um JSON válido no formato:
{
  "duracao_segundos": 12,
  "estilo_mapa": "dark",
  "keyframes": [
    {
      "tempo": 0.0,
      "latitude": -7.23,
      "longitude": -35.88,
      "zoom": 4.0,
      "pitch": 0,
      "bearing": 0,
      "duracao_transicao": 0
    },
    {
      "tempo": 4.0,
      "latitude": -7.23,
      "longitude": -35.88,
      "zoom": 8.0,
      "pitch": 30,
      "bearing": 20,
      "duracao_transicao": 4000
    },
    {
      "tempo": 8.0,
      "latitude": -7.23,
      "longitude": -35.88,
      "zoom": 12.0,
      "pitch": 50,
      "bearing": -15,
      "duracao_transicao": 4000
    },
    {
      "tempo": 12.0,
      "latitude": -7.23,
      "longitude": -35.88,
      "zoom": 14.0,
      "pitch": 60,
      "bearing": 0,
      "duracao_transicao": 4000
    }
  ],
  "overlays": [
    {
      "texto": "Headline aqui",
      "tempo_inicio": 0.5,
      "tempo_fim": 3.5,
      "posicao": "center",
      "estilo": "headline"
    },
    {
      "texto": "Subheadline aqui",
      "tempo_inicio": 4.0,
      "tempo_fim": 8.0,
      "posicao": "bottom",
      "estilo": "subheadline"
    },
    {
      "texto": "CTA aqui",
      "tempo_inicio": 9.0,
      "tempo_fim": 12.0,
      "posicao": "center",
      "estilo": "cta"
    }
  ],
  "highlights": [],
  "fps": 30
}

Dicas para vídeos Meta Ads eficazes:
- Capture atenção nos primeiros 2 segundos com headline forte
- Use o zoom dramático para criar sensação de "revelação" do local
- O pitch 3D cria profundidade e impacto visual
- CTA final deve ser claro e visível"""


class MapScriptAgent:
    def __init__(self):
        self.claude = ClaudeService()

    async def run(self, request: MapVideoRequest, copy: CopyOutput) -> MapScript:
        user_message = json.dumps(
            {
                "produto": request.produto,
                "publico": request.publico,
                "contexto": request.contexto,
                "latitude": request.latitude,
                "longitude": request.longitude,
                "zoom_inicio": request.zoom_inicio,
                "zoom_fim": request.zoom_fim,
                "estilo_mapa": request.estilo_mapa,
                "duracao_segundos": request.duracao_segundos,
                "copy": {
                    "headline": copy.headline,
                    "subheadline": copy.subheadline,
                    "cta": copy.cta,
                },
            },
            ensure_ascii=False,
        )

        data = await self.claude.generate(SYSTEM_PROMPT, user_message)
        return MapScript(**data)
