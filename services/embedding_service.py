import json
import os

from dotenv import load_dotenv
from google import genai

load_dotenv()


class EmbeddingService:
    def __init__(self):
        self.client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
        self.model = "text-embedding-004"

    async def generate_embedding(self, text: str) -> list[float]:
        """Gera embedding de 768 dimensoes usando Gemini text-embedding-004."""
        result = self.client.models.embed_content(
            model=self.model,
            contents=text,
        )
        return list(result.embeddings[0].values)

    async def embed_analysis(self, analise: dict) -> list[float]:
        """Gera embedding a partir do JSON de analise de uma arte."""
        parts = []
        for key in [
            "headline",
            "subheadline",
            "estilo_visual",
            "descricao_fundo",
            "tom",
            "publico",
            "contexto",
            "objetivo",
        ]:
            value = analise.get(key, "")
            if value:
                parts.append(f"{key}: {value}")
        text = " | ".join(parts)
        return await self.generate_embedding(text)
