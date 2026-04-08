import asyncio
import os
import shutil

from models.map_video_output import MapScript


class VideoService:
    def __init__(self):
        self.font_path = self._find_font()

    @staticmethod
    def _find_font() -> str:
        """Find a suitable sans-serif bold font."""
        candidates = [
            "/usr/share/fonts/truetype/inter/Inter-Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
            "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
        ]
        for path in candidates:
            if os.path.exists(path):
                return path
        return "Sans-Bold"

    async def compose_video(
        self,
        frames_dir: str,
        script: MapScript,
        dimensoes: str,
        output_path: str,
    ) -> str:
        """Monta frames em MP4 com overlays de texto via FFmpeg."""
        if "x" in dimensoes:
            width, height = map(int, dimensoes.split("x"))
        else:
            width, height = 1080, 1080

        fps = script.fps

        # Build FFmpeg filter for text overlays
        drawtext_filters = self._build_drawtext_filters(script, width, height)

        # Build FFmpeg command
        input_pattern = os.path.join(frames_dir, "frame_%05d.png")

        filter_complex = f"fps={fps}"
        if drawtext_filters:
            filter_complex += "," + ",".join(drawtext_filters)

        cmd = [
            "ffmpeg", "-y",
            "-framerate", str(fps),
            "-i", input_pattern,
            "-vf", filter_complex,
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "23",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            "-t", str(script.duracao_segundos),
            output_path,
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await process.communicate()

        if process.returncode != 0:
            raise RuntimeError(f"FFmpeg failed: {stderr.decode()}")

        return output_path

    async def generate_thumbnail(self, video_path: str, output_path: str, timestamp: float = None) -> str:
        """Gera thumbnail do frame no meio do vídeo."""
        if timestamp is None:
            # Use ffprobe to get duration, then take middle frame
            probe_cmd = [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                video_path,
            ]
            process = await asyncio.create_subprocess_exec(
                *probe_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await process.communicate()
            try:
                duration = float(stdout.decode().strip())
                timestamp = duration / 2
            except (ValueError, TypeError):
                timestamp = 3.0

        cmd = [
            "ffmpeg", "-y",
            "-ss", str(timestamp),
            "-i", video_path,
            "-vframes", "1",
            "-q:v", "2",
            output_path,
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        await process.communicate()

        return output_path

    def _build_drawtext_filters(self, script: MapScript, width: int, height: int) -> list[str]:
        """Build FFmpeg drawtext filter strings for each overlay."""
        filters = []
        fps = script.fps

        for overlay in script.overlays:
            text = overlay.texto.replace("'", "\u2019").replace(":", "\\:")
            start_frame = int(overlay.tempo_inicio * fps)
            end_frame = int(overlay.tempo_fim * fps)
            fade_frames = int(0.5 * fps)

            # Font size based on style
            if overlay.estilo == "headline":
                fontsize = int(width * 0.055)
            elif overlay.estilo == "cta":
                fontsize = int(width * 0.045)
            else:
                fontsize = int(width * 0.035)

            # Position
            if overlay.posicao == "top":
                y_expr = f"{int(height * 0.12)}"
            elif overlay.posicao == "bottom":
                y_expr = f"{int(height * 0.82)}"
            else:
                y_expr = f"(h-text_h)/2"

            # Alpha expression with fade in/out
            fade_in_end = start_frame + fade_frames
            fade_out_start = end_frame - fade_frames

            alpha_expr = (
                f"if(lt(n,{start_frame}),0,"
                f"if(lt(n,{fade_in_end}),(n-{start_frame})/{fade_frames},"
                f"if(lt(n,{fade_out_start}),1,"
                f"if(lt(n,{end_frame}),({end_frame}-n)/{fade_frames},"
                f"0))))"
            )

            # Build drawtext with shadow for readability
            shadow_filter = (
                f"drawtext="
                f"text='{text}':"
                f"fontfile='{self.font_path}':"
                f"fontsize={fontsize}:"
                f"fontcolor=black@0.6:"
                f"x=(w-text_w)/2+3:"
                f"y={y_expr}+3:"
                f"alpha='{alpha_expr}'"
            )

            text_filter = (
                f"drawtext="
                f"text='{text}':"
                f"fontfile='{self.font_path}':"
                f"fontsize={fontsize}:"
                f"fontcolor=white:"
                f"borderw=2:"
                f"bordercolor=black@0.5:"
                f"x=(w-text_w)/2:"
                f"y={y_expr}:"
                f"alpha='{alpha_expr}'"
            )

            filters.append(shadow_filter)
            filters.append(text_filter)

        return filters

    @staticmethod
    def cleanup_frames(frames_dir: str) -> None:
        """Remove temporary frames directory."""
        if os.path.isdir(frames_dir):
            shutil.rmtree(frames_dir, ignore_errors=True)
