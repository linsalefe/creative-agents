import base64
import os
import uuid

from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

# Diretório para salvar imagens geradas localmente
IMAGES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "generated_images")
os.makedirs(IMAGES_DIR, exist_ok=True)


class ImagenService:
    def __init__(self):
        self.client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
        self.model = "gemini-2.0-flash-preview-image-generation"

    async def generate_image(
        self, prompt: str, aspect_ratio: str = "1:1"
    ) -> str:
        """Gera imagem via Google Imagen e retorna o caminho local como data URI base64."""
        config = types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"],
            image_config=types.ImageConfig(
                aspect_ratio=aspect_ratio,
            ),
        )

        response = self.client.models.generate_content(
            model=self.model,
            contents=[prompt],
            config=config,
        )

        # Extrai a imagem da resposta
        for part in response.parts:
            if part.inline_data is not None:
                image_data = part.inline_data.data
                mime_type = part.inline_data.mime_type or "image/png"

                # Salva localmente
                ext = "png" if "png" in mime_type else "jpg"
                filename = f"{uuid.uuid4()}.{ext}"
                filepath = os.path.join(IMAGES_DIR, filename)
                with open(filepath, "wb") as f:
                    f.write(image_data)

                # Retorna como data URI para uso direto no frontend e Bannerbear
                b64 = base64.b64encode(image_data).decode("utf-8")
                return f"data:{mime_type};base64,{b64}"

        raise ValueError("Imagen não retornou imagem na resposta")

    @staticmethod
    def dimensoes_to_aspect_ratio(dimensoes: str) -> str:
        """Converte dimensões (ex: '1080x1080') para aspect ratio do Imagen."""
        mapping = {
            "1080x1080": "1:1",
            "1080x1920": "9:16",
            "1920x1080": "16:9",
            "1200x628": "16:9",
            "1080x1350": "4:5",
        }
        return mapping.get(dimensoes, "1:1")
