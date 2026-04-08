import asyncio
import os
import uuid

from dotenv import load_dotenv

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
        """Pipeline completo: Strategy → Copy → Creative Director → Format → Image"""

        # 1. Estratégia
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

        # 3. Direção criativa
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
        """Pipeline rápido: Strategy → Copy → Format → Image (sem direção criativa detalhada)"""

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

        # Gera imagem direto com prompt genérico (sem creative director)
        from models.creative_output import CreativeDirectorOutput

        direcao = CreativeDirectorOutput(
            conceito="Geração rápida sem direção criativa detalhada",
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
        """Pipeline de variações: Vision → Variation → 5x Image Edit em paralelo"""

        # 1. Analisa o criativo original com Gemini Vision
        analise = await self.vision_agent.run(image_data=image_data, mime_type=mime_type)

        # 2. Gera 5 variações de copy
        variacoes_copy = await self.variation_agent.run(analise=analise)

        # 3. Edita imagem em paralelo com semáforo para rate limit
        semaphore = asyncio.Semaphore(2)
        images_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "generated_images")
        os.makedirs(images_dir, exist_ok=True)

        async def processar_variacao(copy_var: CopyVariation) -> VariationItem:
            async with semaphore:
                try:
                    edited_bytes = await self.image_edit_agent.run(
                        original_image=image_data,
                        mime_type=mime_type,
                        original_analysis=analise,
                        new_copy=copy_var,
                        target_format=formato,
                    )
                    filename = f"{uuid.uuid4()}.png"
                    filepath = os.path.join(images_dir, filename)
                    with open(filepath, "wb") as f:
                        f.write(edited_bytes)
                    return VariationItem(
                        copy=copy_var,
                        imagem_url=f"/static/images/{filename}",
                        formato=formato,
                    )
                except Exception as e:
                    print(f"Edição de imagem falhou para variação: {e}")
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
