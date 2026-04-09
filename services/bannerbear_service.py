import json
import os
import asyncio
import logging

import httpx
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv()

BANNERBEAR_API_URL = "https://api.bannerbear.com/v2/images"


class BannerbearService:
    def __init__(self):
        self.api_key = os.getenv("BANNERBEAR_API_KEY")
        self.project_id = os.getenv("BANNERBEAR_PROJECT_ID")
        self.templates = {
            "feed_quadrado": os.getenv("BANNERBEAR_TEMPLATE_FEED", ""),
            "stories_vertical": os.getenv("BANNERBEAR_TEMPLATE_STORIES", ""),
        }

    @property
    def disponivel(self) -> bool:
        """Retorna True se a API key e pelo menos um template estão configurados."""
        tem_key = bool(self.api_key) and not self.api_key.startswith("uid_")
        tem_template = any(
            v and not v.startswith("uid_") for v in self.templates.values()
        )
        return tem_key and tem_template

    async def create_image(
        self,
        template_uid: str,
        headline: str,
        subheadline: str,
        cta: str,
        image_url: str,
    ) -> str:
        """Cria imagem composta no Bannerbear e retorna a URL final."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "template": template_uid,
            "project_id": self.project_id,
            "modifications": [
                {"name": "imagem_fundo", "image_url": image_url},
                {"name": "titulo_curso", "text": subheadline},
                {"name": "headline", "text": headline},
                {"name": "data_evento", "text": cta},
            ],
        }

        logger.info("Bannerbear: enviando para template %s", template_uid)
        logger.debug("Payload enviado ao Bannerbear: %s", json.dumps(payload, indent=2))

        try:
            async with httpx.AsyncClient(timeout=120) as client:
                response = await client.post(
                    BANNERBEAR_API_URL, headers=headers, json=payload
                )
                if response.status_code >= 400:
                    response_text = response.text
                    logger.error("Bannerbear erro %s: %s", response.status_code, response_text)
                    response.raise_for_status()

                data = response.json()
                image_uid = data["uid"]
                logger.info("Bannerbear: imagem criada, uid=%s. Aguardando processamento...", image_uid)

                for _ in range(30):
                    await asyncio.sleep(2)
                    status_resp = await client.get(
                        f"{BANNERBEAR_API_URL}/{image_uid}", headers=headers
                    )
                    if status_resp.status_code >= 400:
                        response_text = status_resp.text
                        logger.error("Bannerbear polling erro %s: %s", status_resp.status_code, response_text)
                        status_resp.raise_for_status()

                    status_data = status_resp.json()
                    if status_data["status"] == "completed":
                        final_url = status_data["image_url"]
                        logger.info("Bannerbear: criativo final gerado -> %s", final_url)
                        return final_url

            raise TimeoutError("Bannerbear não completou o processamento a tempo")

        except httpx.HTTPStatusError:
            logger.error("Bannerbear HTTPStatusError", exc_info=True)
            raise
        except Exception:
            logger.error("Bannerbear erro inesperado", exc_info=True)
            raise

    async def create_variants(
        self,
        variantes: list[str],
        headline: str,
        subheadline: str,
        cta: str,
        image_url: str,
    ) -> list[str]:
        """Gera variantes do criativo para diferentes formatos."""
        urls = []
        for variante in variantes:
            template_uid = self.templates.get(variante)
            if not template_uid:
                continue
            url = await self.create_image(
                template_uid, headline, subheadline, cta, image_url
            )
            urls.append(url)
        return urls
