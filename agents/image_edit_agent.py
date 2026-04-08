from models.variation import VisionAnalysis, CopyVariation
from services.gemini_service import GeminiService


class ImageEditAgent:
    def __init__(self):
        self.gemini = GeminiService()

    async def run(
        self,
        original_image: bytes,
        mime_type: str,
        original_analysis: VisionAnalysis,
        new_copy: CopyVariation,
    ) -> bytes:
        """Edita o criativo original trocando APENAS o texto, mantendo tudo mais idêntico."""
        instruction = (
            f"Edit this marketing creative image. "
            f"Replace the headline text '{original_analysis.headline}' with '{new_copy.headline}'. "
            f"Replace the subtitle text '{original_analysis.subheadline}' with '{new_copy.subheadline}'. "
            f"Replace the CTA text '{original_analysis.cta}' with '{new_copy.cta}'. "
            f"KEEP UNCHANGED: background image, illustrations, colors, logo, layout, composition, "
            f"fonts style, graphic elements, and all visual design. "
            f"Only modify the text content, nothing else."
        )

        return await self.gemini.edit_image(
            image_data=original_image,
            mime_type=mime_type,
            instruction=instruction,
        )
