import subprocess
import json
import os
import uuid


class RemotionService:
    def __init__(self):
        self.remotion_dir = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "remotion-video"
        )
        self.output_dir = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "generated_videos"
        )
        os.makedirs(self.output_dir, exist_ok=True)

    async def render_video(
        self,
        composition_id: str,
        props: dict,
        width: int = 1080,
        height: int = 1920,
        fps: int = 30,
        duration_in_frames: int = 300,
    ) -> str:
        """Renderiza vídeo com Remotion CLI e retorna path relativo do MP4."""
        video_id = str(uuid.uuid4())
        output_path = os.path.join(self.output_dir, f"{video_id}.mp4")

        cmd = [
            "npx", "remotion", "render",
            "src/Root.tsx",
            composition_id,
            output_path,
            "--props", json.dumps(props),
            "--width", str(width),
            "--height", str(height),
            "--fps", str(fps),
            "--frames", f"0-{duration_in_frames - 1}",
            "--codec", "h264",
            "--concurrency", "2",
        ]

        process = subprocess.Popen(
            cmd,
            cwd=self.remotion_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        stdout, stderr = process.communicate(timeout=120)

        if process.returncode != 0:
            raise RuntimeError(
                f"Remotion render failed (exit {process.returncode}): {stderr.decode()}"
            )

        return f"/static/videos/{video_id}.mp4"

    async def render_thumbnail(
        self,
        composition_id: str,
        props: dict,
        width: int = 1080,
        height: int = 1920,
        frame: int = 0,
    ) -> str:
        """Renderiza um frame como thumbnail JPG."""
        thumb_id = str(uuid.uuid4())
        output_path = os.path.join(self.output_dir, f"{thumb_id}.jpg")

        cmd = [
            "npx", "remotion", "still",
            "src/Root.tsx",
            composition_id,
            output_path,
            "--props", json.dumps(props),
            "--width", str(width),
            "--height", str(height),
            "--frame", str(frame),
        ]

        process = subprocess.Popen(
            cmd,
            cwd=self.remotion_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        stdout, stderr = process.communicate(timeout=60)

        if process.returncode != 0:
            raise RuntimeError(
                f"Remotion still failed (exit {process.returncode}): {stderr.decode()}"
            )

        return f"/static/videos/{thumb_id}.jpg"
