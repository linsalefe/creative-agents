import os
import uuid

from dotenv import load_dotenv

from models.map_video_output import MapVideoRequest, MapVideoOutput
from agents.strategy_agent import StrategyAgent
from agents.copy_agent import CopyAgent
from agents.map_script_agent import MapScriptAgent
from services.map_render_service import MapRenderService
from services.video_service import VideoService

load_dotenv()

# Dimensões por plataforma
DIMENSOES_MAP = {
    "instagram_feed": "1080x1080",
    "feed": "1080x1080",
    "instagram_stories": "1080x1920",
    "stories": "1080x1920",
    "reels": "1080x1920",
}

VIDEOS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "generated_videos")
os.makedirs(VIDEOS_DIR, exist_ok=True)


class MapVideoAgent:
    def __init__(self):
        self.strategy_agent = StrategyAgent()
        self.copy_agent = CopyAgent()
        self.map_script_agent = MapScriptAgent()
        self.map_render = MapRenderService()
        self.video_service = VideoService()

    async def gerar_video(self, request: MapVideoRequest) -> MapVideoOutput:
        """Pipeline completo: Strategy → Copy → MapScript → Render Frames → Compose MP4"""

        video_id = str(uuid.uuid4())
        plataforma = request.plataforma or "instagram_feed"
        dimensoes = DIMENSOES_MAP.get(plataforma, "1080x1080")

        # 1. Strategy Agent
        estrategia = await self.strategy_agent.run(
            produto=request.produto,
            publico=request.publico,
            contexto=request.contexto,
            plataforma=plataforma,
        )

        # 2. Copy Agent
        copy = await self.copy_agent.run(
            produto=request.produto,
            publico=request.publico,
            estrategia=estrategia,
        )

        # 3. Map Script Agent — gera roteiro com keyframes
        script = await self.map_script_agent.run(request=request, copy=copy)

        # 4. Map Render Service — renderiza frames via Playwright
        frames_dir = await self.map_render.render_frames(script=script, dimensoes=dimensoes)

        try:
            # 5. Video Service — monta MP4 com overlays
            video_filename = f"{video_id}.mp4"
            video_path = os.path.join(VIDEOS_DIR, video_filename)
            await self.video_service.compose_video(
                frames_dir=frames_dir,
                script=script,
                dimensoes=dimensoes,
                output_path=video_path,
            )

            # 6. Generate thumbnail
            thumb_filename = f"{video_id}_thumb.jpg"
            thumb_path = os.path.join(VIDEOS_DIR, thumb_filename)
            await self.video_service.generate_thumbnail(
                video_path=video_path,
                output_path=thumb_path,
            )

        finally:
            # Cleanup temp frames
            self.video_service.cleanup_frames(frames_dir)

        return MapVideoOutput(
            id=video_id,
            video_url=f"/static/videos/{video_filename}",
            thumbnail_url=f"/static/videos/{thumb_filename}",
            duracao_segundos=script.duracao_segundos,
            formato=plataforma,
            dimensoes=dimensoes,
            script=script,
            copy_legenda=copy.copy_legenda,
        )
