import asyncio
import logging
import os
import uuid

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

from models.creative_request import CreativeRequest
from models.creative_output import CreativeOutput
from models.variation import VariationOutput, VariationItem, CopyVariation
from agents.strategy_agent import StrategyAgent
from agents.copy_agent import CopyAgent
from agents.creative_director_agent import CreativeDirectorAgent
from agents.format_agent import FormatAgent
from agents.image_agent import ImageAgent
from agents.vision_agent import VisionAgent
from agents.variation_agent import VariationAgent
from agents.image_edit_agent import ImageEditAgent

load_dotenv()


class Orchestrator:
    def __init__(self):
        self.strategy_agent = StrategyAgent()
        self.copy_agent = CopyAgent()
        self.creative_director_agent = CreativeDirectorAgent()
        self.format_agent = FormatAgent()
        self.image_agent = ImageAgent()
        self.vision_agent = VisionAgent()
        self.variation_agent = VariationAgent()
        self.image_edit_agent = ImageEditAgent()

    async def gerar_criativo(self, request: CreativeRequest) -> CreativeOutput:
        """Pipeline completo: Strategy -> Copy -> Creative Director -> Format -> Image"""

        # 1. Estrategia
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

        # 3. Direcao criativa
        direcao = await self.creative_director_agent.run(
            produto=request.produto,
            estrategia=estrategia,
            copy=copy,
        )

        # 4. Formato
        formato = await self.format_agent.run(
            plataforma=estrategia.plataforma,
        )

        # 5. Imagem
        imagem = await self.image_agent.run(
            copy=copy,
            direcao=direcao,
            formato=formato,
        )

        return CreativeOutput(
            id=str(uuid.uuid4()),
            estrategia=estrategia,
            copy=copy,
            direcao_criativa=direcao,
            formato=formato,
            imagem=imagem,
        )

    async def gerar_rapido(self, request: CreativeRequest) -> CreativeOutput:
        """Pipeline rapido: Strategy -> Copy -> Format -> Image (sem direcao criativa detalhada)"""

        estrategia = await self.strategy_agent.run(
            produto=request.produto,
            publico=request.publico,
            contexto=request.contexto,
            plataforma=request.plataforma,
        )

        copy = await self.copy_agent.run(
            produto=request.produto,
            publico=request.publico,
            estrategia=estrategia,
        )

        formato = await self.format_agent.run(
            plataforma=estrategia.plataforma,
        )

        # Gera imagem direto com prompt generico (sem creative director)
        from models.creative_output import CreativeDirectorOutput

        direcao = CreativeDirectorOutput(
            conceito="Geracao rapida sem direcao criativa detalhada",
            cores_dominantes=["#333333", "#FFFFFF", "#0066CC"],
            estilo_visual="clean, profissional, moderno",
            elementos_visuais="produto em destaque",
            prompt_ideogram=(
                f"Professional marketing creative for {request.produto}, "
                "clean modern design, professional atmosphere, "
                "no text, no letters, no words, photorealistic"
            ),
        )

        imagem = await self.image_agent.run(
            copy=copy,
            direcao=direcao,
            formato=formato,
        )

        return CreativeOutput(
            id=str(uuid.uuid4()),
            estrategia=estrategia,
            copy=copy,
            direcao_criativa=direcao,
            formato=formato,
            imagem=imagem,
        )

    async def gerar_variacoes(
        self,
        image_data: bytes,
        mime_type: str,
        formato: str = "feed",
    ) -> VariationOutput:
        """Pipeline de variacoes: Vision -> Variation -> Image Edit em paralelo"""

        # 1. Analisa o criativo original
        analise = await self.vision_agent.run(image_data=image_data, mime_type=mime_type)

        # 2. Gera 5 variacoes de copy com legendas
        variacoes_copy = await self.variation_agent.run(analise=analise)

        # 3. Edita imagens em paralelo
        semaphore = asyncio.Semaphore(2)
        images_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "generated_images")
        os.makedirs(images_dir, exist_ok=True)

        async def salvar_imagem(edited_bytes: bytes) -> str:
            filename = f"{uuid.uuid4()}.png"
            filepath = os.path.join(images_dir, filename)
            with open(filepath, "wb") as f:
                f.write(edited_bytes)
            return f"/static/images/{filename}"

        async def processar_variacao(copy_var: CopyVariation) -> VariationItem:
            async with semaphore:
                try:
                    if formato == "ambos":
                        # Gera feed e story em paralelo para a mesma copy
                        feed_task = self.image_edit_agent.run(
                            original_image=image_data,
                            mime_type=mime_type,
                            original_analysis=analise,
                            new_copy=copy_var,
                            target_format="feed",
                        )
                        story_task = self.image_edit_agent.run(
                            original_image=image_data,
                            mime_type=mime_type,
                            original_analysis=analise,
                            new_copy=copy_var,
                            target_format="story",
                        )
                        feed_bytes, story_bytes = await asyncio.gather(feed_task, story_task)
                        feed_url = await salvar_imagem(feed_bytes)
                        story_url = await salvar_imagem(story_bytes)
                        return VariationItem(
                            copy=copy_var,
                            imagem_url=feed_url,
                            imagem_story_url=story_url,
                            formato=formato,
                        )
                    else:
                        edited_bytes = await self.image_edit_agent.run(
                            original_image=image_data,
                            mime_type=mime_type,
                            original_analysis=analise,
                            new_copy=copy_var,
                            target_format=formato,
                        )
                        url = await salvar_imagem(edited_bytes)
                        return VariationItem(
                            copy=copy_var,
                            imagem_url=url,
                            formato=formato,
                        )
                except Exception as e:
                    logger.error("Edicao de imagem falhou para variacao", exc_info=True)
                    return VariationItem(copy=copy_var, imagem_url=None, formato=formato)

        variacoes = await asyncio.gather(
            *[processar_variacao(cv) for cv in variacoes_copy]
        )

        return VariationOutput(
            original_url="upload",
            analise=analise,
            variacoes=list(variacoes),
            formato=formato,
        )
