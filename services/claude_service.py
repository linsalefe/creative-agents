import json
import os

from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()


class ClaudeService:
    """Serviço LLM usando OpenAI GPT-4o. Mantém o nome ClaudeService para compatibilidade."""

    def __init__(self):
        self.client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = "gpt-4o"

    async def generate(self, system_prompt: str, user_message: str) -> dict:
        """Envia prompt para o GPT-4o e retorna a resposta parseada como JSON."""
        response = await self.client.chat.completions.create(
            model=self.model,
            temperature=0.7,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
        )

        raw_text = response.choices[0].message.content
        return self._parse_json(raw_text)

    async def generate_with_image(self, system_prompt: str, text: str, image_url: str) -> dict:
        """Envia prompt com imagem para o GPT-4o Vision e retorna JSON."""
        response = await self.client.chat.completions.create(
            model=self.model,
            temperature=0.3,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": text},
                        {"type": "image_url", "image_url": {"url": image_url}},
                    ],
                },
            ],
        )

        raw_text = response.choices[0].message.content
        return self._parse_json(raw_text)

    @staticmethod
    def _parse_json(raw_text: str) -> dict:
        try:
            return json.loads(raw_text)
        except json.JSONDecodeError:
            if "```json" in raw_text:
                json_str = raw_text.split("```json")[1].split("```")[0].strip()
                return json.loads(json_str)
            if "```" in raw_text:
                json_str = raw_text.split("```")[1].split("```")[0].strip()
                return json.loads(json_str)
            raise ValueError(f"Resposta do LLM não é JSON válido: {raw_text}")
