import json
import os

from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()


class GeminiService:
    def __init__(self):
        self.client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
        self.text_model = "gemini-2.5-flash"
        self.image_model = "gemini-3-pro-image-preview"

    async def generate(self, system_prompt: str, user_message: str) -> dict:
        """Gera texto com Gemini 2.5 Flash e retorna JSON."""
        response = self.client.models.generate_content(
            model=self.text_model,
            contents=[user_message],
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.7,
                response_mime_type="application/json",
            ),
        )
        return self._parse_json(response.text)

    async def generate_with_image(
        self, system_prompt: str, text: str, image_data: bytes, mime_type: str
    ) -> dict:
        """Analisa imagem com Gemini 3 Pro Image Preview e retorna JSON."""
        image_part = types.Part.from_bytes(data=image_data, mime_type=mime_type)
        response = self.client.models.generate_content(
            model=self.image_model,
            contents=[text, image_part],
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.3,
                response_mime_type="application/json",
            ),
        )
        return self._parse_json(response.text)

    async def edit_image(
        self, image_data: bytes, mime_type: str, instruction: str
    ) -> bytes:
        """Edita imagem com Gemini 3 Pro Image Preview. Retorna bytes da imagem editada."""
        image_part = types.Part.from_bytes(data=image_data, mime_type=mime_type)
        response = self.client.models.generate_content(
            model=self.image_model,
            contents=[instruction, image_part],
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
            ),
        )
        for part in response.candidates[0].content.parts:
            if part.inline_data is not None:
                return part.inline_data.data
        raise ValueError("Gemini não retornou imagem editada na resposta")

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
            raise ValueError(f"Resposta do Gemini não é JSON válido: {raw_text}")
