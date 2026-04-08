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
        target_format: str = "feed",
    ) -> bytes:
        """Edita o criativo original trocando o texto e, se story, recompõe para 9:16."""

        format_instruction = ""
        if target_format == "story":
            format_instruction = (
                " Additionally, recompose this image into a vertical 9:16 Story format "
                "(tall portrait orientation, like Instagram/TikTok Stories). "
                "Extend the background to fill the vertical space, keep all key visual elements "
                "and the logo visible. Place the text elements in positions that work well "
                "for the vertical format. The final image must be portrait/vertical orientation."
            )

        instruction = (
            f"Edit this marketing creative image. "
            f"Replace the headline text '{original_analysis.headline}' with '{new_copy.headline}'. "
            f"Replace the subtitle text '{original_analysis.subheadline}' with '{new_copy.subheadline}'. "
            f"Replace the CTA text '{original_analysis.cta}' with '{new_copy.cta}'. "
            f"KEEP UNCHANGED: background image, illustrations, colors, logo, "
            f"fonts style, graphic elements, and all visual design. "
            f"Only modify the text content, nothing else."
            f"{format_instruction}"
        )

        return await self.gemini.edit_image(
            image_data=original_image,
            mime_type=mime_type,
            instruction=instruction,
        )
