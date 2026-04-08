import os

from dotenv import load_dotenv

from models.creative_output import (
    ImageOutput,
    CopyOutput,
    CreativeDirectorOutput,
    FormatOutput,
)
from services.ideogram_service import IdeogramService
from services.imagen_service import ImagenService
from services.bannerbear_service import BannerbearService

load_dotenv()


class ImageAgent:
    def __init__(self):
        self.provider = os.getenv("IMAGE_PROVIDER", "ideogram").lower()
        self.ideogram = IdeogramService()
        self.imagen = ImagenService()
        self.bannerbear = BannerbearService()

    async def _generate_image(self, prompt: str, dimensoes: str) -> str:
        """Gera imagem usando o provider configurado em IMAGE_PROVIDER."""
        if self.provider == "imagen":
            aspect_ratio = ImagenService.dimensoes_to_aspect_ratio(dimensoes)
            return await self.imagen.generate_image(prompt=prompt, aspect_ratio=aspect_ratio)
        else:
            aspect_ratio = IdeogramService.dimensoes_to_aspect_ratio(dimensoes)
            return await self.ideogram.generate_image(prompt=prompt, aspect_ratio=aspect_ratio)

    async def run(
        self,
        copy: CopyOutput,
        direcao: CreativeDirectorOutput,
        formato: FormatOutput,
    ) -> ImageOutput:
        # 1. Gera imagem base
        imagem_url = await self._generate_image(
            prompt=direcao.prompt_ideogram,
            dimensoes=formato.dimensoes,
        )

        # 2 e 3. Compõe criativo final + variantes via Bannerbear (se configurado)
        criativo_final_url = None
        variantes_urls = []

        if self.bannerbear.disponivel:
            if formato.template_bannerbear:
                criativo_final_url = await self.bannerbear.create_image(
                    template_uid=formato.template_bannerbear,
                    headline=copy.headline,
                    subheadline=copy.subheadline,
                    cta=copy.cta,
                    image_url=imagem_url,
                )

            variantes_urls = await self.bannerbear.create_variants(
                variantes=formato.variantes,
                headline=copy.headline,
                subheadline=copy.subheadline,
                cta=copy.cta,
                image_url=imagem_url,
            )

        return ImageOutput(
            imagem_url=imagem_url,
            criativo_final_url=criativo_final_url,
            variantes_urls=variantes_urls,
        )
