import os
import tempfile
import json

from dotenv import load_dotenv
from playwright.async_api import async_playwright

from models.map_video_output import MapScript

load_dotenv()

# Map template path
TEMPLATE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates", "map_template.html")


class MapRenderService:
    def __init__(self):
        self.mapbox_token = os.getenv("MAPBOX_ACCESS_TOKEN", "")

    async def render_frames(self, script: MapScript, dimensoes: str) -> str:
        """Renderiza mapa animado e retorna diretório com frames PNG."""
        # Parse dimensions
        if "x" in dimensoes:
            width, height = map(int, dimensoes.split("x"))
        else:
            width, height = 1080, 1080

        total_frames = script.duracao_segundos * script.fps

        # Read template and inject data
        with open(TEMPLATE_PATH, "r", encoding="utf-8") as f:
            template_html = f.read()

        # Inject script data and token into template
        script_json = json.dumps(script.model_dump(), ensure_ascii=False)
        html_content = template_html.replace("__MAPBOX_TOKEN__", self.mapbox_token)
        html_content = html_content.replace("__MAP_SCRIPT__", script_json)
        html_content = html_content.replace("__TOTAL_FRAMES__", str(total_frames))

        # Determine map style URL
        style_map = {
            "dark": "mapbox://styles/mapbox/dark-v11",
            "satellite": "mapbox://styles/mapbox/satellite-streets-v12",
            "light": "mapbox://styles/mapbox/light-v11",
            "streets": "mapbox://styles/mapbox/streets-v12",
        }
        style_url = style_map.get(script.estilo_mapa, style_map["dark"])

        # Fallback to OSM if no Mapbox token
        if not self.mapbox_token:
            use_osm = "true"
        else:
            use_osm = "false"

        html_content = html_content.replace("__STYLE_URL__", style_url)
        html_content = html_content.replace("__USE_OSM__", use_osm)

        # Write temp HTML
        tmp_html = tempfile.NamedTemporaryFile(suffix=".html", delete=False, mode="w", encoding="utf-8")
        tmp_html.write(html_content)
        tmp_html.close()

        # Create frames output directory
        frames_dir = tempfile.mkdtemp(prefix="map_frames_")

        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page(viewport={"width": width, "height": height})

                await page.goto(f"file://{tmp_html.name}", wait_until="networkidle")

                # Wait for map to load
                await page.wait_for_function("window.mapReady === true", timeout=30000)

                # Capture each frame
                for frame_num in range(total_frames):
                    # Advance animation to this frame
                    await page.evaluate(f"window.advanceFrame({frame_num})")

                    # Wait for render to settle
                    await page.wait_for_function("window.frameReady === true", timeout=10000)

                    # Screenshot
                    frame_path = os.path.join(frames_dir, f"frame_{frame_num:05d}.png")
                    await page.screenshot(path=frame_path)

                await browser.close()
        finally:
            os.unlink(tmp_html.name)

        return frames_dir
