import uuid

from models.video_output import VideoRequest, VideoOutput, VideoScript
from models.creative_output import CopyOutput
from agents.strategy_agent import StrategyAgent
from agents.copy_agent import CopyAgent
from agents.video_script_agent import VideoScriptAgent
from agents.image_agent import ImageAgent
from services.remotion_service import RemotionService


class VideoPipelineAgent:
    def __init__(self):
        self.strategy_agent = StrategyAgent()
        self.copy_agent = CopyAgent()
        self.video_script_agent = VideoScriptAgent()
        self.image_agent = ImageAgent()
        self.remotion_service = RemotionService()

    async def gerar_video(self, request: VideoRequest) -> VideoOutput:
        """Pipeline: Strategy -> Copy -> [Imagem] -> VideoScript -> Remotion Render"""

        # 1. Strategy
        estrategia = await self.strategy_agent.run(
            produto=request.produto,
            publico=request.publico,
            contexto=request.contexto,
            plataforma=request.plataforma,
        )

        # 2. Copy
        copy = await self.copy_agent.run(
            produto=request.produto,
            publico=request.publico,
            estrategia=estrategia,
        )

        # 3. Gerar imagem(ns) se necessário
        imagem_url = request.imagem_url
        slide_urls: list[str] = []

        if request.tipo in ("ken_burns", "slideshow") and not imagem_url:
            from models.creative_output import CreativeDirectorOutput, FormatOutput

            direcao = CreativeDirectorOutput(
                conceito="Video marketing background",
                cores_dominantes=["#333333", "#FFFFFF"],
                estilo_visual="cinematográfico, profissional",
                elementos_visuais="produto em destaque, atmosfera premium",
                prompt_ideogram=(
                    f"Professional cinematic background for {request.produto}, "
                    "high quality, no text, no letters, photorealistic, 4k"
                ),
            )
            formato = FormatOutput(
                formato=request.plataforma,
                dimensoes="1080x1920" if request.plataforma != "feed" else "1080x1080",
                template_bannerbear="",
                variantes=[],
                especificacoes={},
            )
            imagem_result = await self.image_agent.run(
                copy=copy, direcao=direcao, formato=formato
            )
            imagem_url = imagem_result.imagem_url

            # For slideshow, generate additional images
            if request.tipo == "slideshow":
                slide_urls.append(imagem_url)
                for i in range(2):
                    direcao_var = CreativeDirectorOutput(
                        conceito=f"Video slide {i + 2}",
                        cores_dominantes=["#333333", "#FFFFFF"],
                        estilo_visual="cinematográfico, profissional",
                        elementos_visuais="produto em destaque",
                        prompt_ideogram=(
                            f"Professional cinematic image for {request.produto}, "
                            f"variation {i + 2}, high quality, no text, photorealistic, 4k"
                        ),
                    )
                    img = await self.image_agent.run(
                        copy=copy, direcao=direcao_var, formato=formato
                    )
                    slide_urls.append(img.imagem_url)

        # 4. Video Script Agent
        script = await self.video_script_agent.run(request, copy)

        # Inject image URLs into script if applicable
        if request.tipo == "ken_burns" and imagem_url:
            pass  # imagem_url passed via props separately

        if request.tipo == "slideshow" and slide_urls:
            for i, slide in enumerate(script.slides):
                if i < len(slide_urls):
                    slide.imagem_url = slide_urls[i]

        # 5. Composition mapping
        composition_map = {
            "ken_burns": "KenBurnsVideo",
            "slideshow": "SlideshowVideo",
            "motion_graphics": "MotionGraphicsVideo",
        }

        dims = {
            "stories": (1080, 1920),
            "reels": (1080, 1920),
            "feed": (1080, 1080),
        }

        w, h = dims.get(request.plataforma, (1080, 1920))

        # For feed, use Feed-specific compositions
        comp_id = composition_map[request.tipo]
        if request.plataforma == "feed":
            comp_id += "Feed"

        # Build props for Remotion
        props = script.model_dump()
        if request.tipo == "ken_burns" and imagem_url:
            props["imagem_url"] = imagem_url

        duration_in_frames = script.duracao_segundos * script.fps

        # 6. Render MP4
        video_url = await self.remotion_service.render_video(
            composition_id=comp_id,
            props=props,
            width=w,
            height=h,
            fps=script.fps,
            duration_in_frames=duration_in_frames,
        )

        # 7. Thumbnail at 50%
        thumbnail_url = None
        try:
            thumbnail_url = await self.remotion_service.render_thumbnail(
                composition_id=comp_id,
                props=props,
                width=w,
                height=h,
                frame=duration_in_frames // 2,
            )
        except Exception:
            pass  # Thumbnail is optional

        return VideoOutput(
            id=str(uuid.uuid4()),
            video_url=video_url,
            thumbnail_url=thumbnail_url,
            duracao_segundos=script.duracao_segundos,
            tipo=request.tipo,
            formato=request.plataforma,
            dimensoes=f"{w}x{h}",
            script=script,
            copy_legenda=copy.copy_legenda,
        )
