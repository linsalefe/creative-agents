import os

import httpx
from dotenv import load_dotenv

load_dotenv()

IDEOGRAM_API_URL = "https://api.ideogram.ai/generate"


class IdeogramService:
    def __init__(self):
        self.api_key = os.getenv("IDEOGRAM_API_KEY")

    async def generate_image(
        self, prompt: str, aspect_ratio: str = "ASPECT_1_1"
    ) -> str:
        """Gera imagem via Ideogram API e retorna a URL."""
        headers = {
            "Api-Key": self.api_key,
            "Content-Type": "application/json",
        }

        payload = {
            "image_request": {
                "prompt": prompt,
                "aspect_ratio": aspect_ratio,
                "model": "V_2",
                "magic_prompt_option": "AUTO",
            }
        }

        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                IDEOGRAM_API_URL, headers=headers, json=payload
            )
            response.raise_for_status()
            data = response.json()

        return data["data"][0]["url"]

    @staticmethod
    def dimensoes_to_aspect_ratio(dimensoes: str) -> str:
        """Converte dimensões (ex: '1080x1080') para aspect ratio da API."""
        mapping = {
            "1080x1080": "ASPECT_1_1",
            "1080x1920": "ASPECT_9_16",
            "1920x1080": "ASPECT_16_9",
            "1200x628": "ASPECT_16_9",
            "1080x1350": "ASPECT_4_5",
        }
        return mapping.get(dimensoes, "ASPECT_1_1")
