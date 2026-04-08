import asyncio
import os
import uuid

from dotenv import load_dotenv

from models.creative_request import CreativeRequest
from models.creative_output import CreativeOutput
from models.variation import VariationRequest, VariationOutput, VariationItem, CopyVariation
from agents.strategy_agent import StrategyAgent
from agents.copy_agent import CopyAgent
from agents.creative_director_agent import CreativeDirectorAgent
from agents.format_agent import FormatAgent
from agents.image_agent import ImageAgent
from agents.vision_agent import VisionAgent
from agents.variation_agent import VariationAgent
from services.bannerbear_service import BannerbearService
from services.ideogram_service import IdeogramService
from services.imagen_service import ImagenService

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
        self.image_provider = os.getenv("IMAGE_PROVIDER", "ideogram").lower()
        self.ideogram = IdeogramService()
        self.imagen = ImagenService()
        self.bannerbear = BannerbearService()

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

    async def gerar_variacoes(self, request: VariationRequest) -> VariationOutput:
        """Pipeline de variações: Vision → Variation → (Ideogram + Bannerbear) x5 em paralelo"""

        # 1. Analisa o criativo original com GPT-4o Vision
        analise = await self.vision_agent.run(image_url=request.imagem_url)

        # 2. Gera 5 variações de copy + prompt de fundo
        variacoes_copy = await self.variation_agent.run(analise=analise)

        # 3. Para cada variação em paralelo: Ideogram gera fundo → Bannerbear monta
        template_uid = request.template_uid or os.getenv("BANNERBEAR_TEMPLATE_FEED", "")

        async def processar_variacao(copy_var: CopyVariation) -> VariationItem:
            fundo_url = None
            imagem_final_url = None

            try:
                if self.image_provider == "imagen":
                    fundo_url = await self.imagen.generate_image(
                        prompt=copy_var.prompt_ideogram,
                        aspect_ratio="1:1",
                    )
                else:
                    fundo_url = await self.ideogram.generate_image(
                        prompt=copy_var.prompt_ideogram,
                        aspect_ratio="ASPECT_1_1",
                    )
            except Exception as e:
                print(f"Geração de imagem falhou para variação ({self.image_provider}): {e}")
                return VariationItem(copy=copy_var, fundo_url=None, imagem_url=None)

            if self.bannerbear.disponivel and template_uid and fundo_url:
                try:
                    imagem_final_url = await self.bannerbear.create_image(
                        template_uid=template_uid,
                        headline=copy_var.headline,
                        subheadline=copy_var.subheadline,
                        cta=copy_var.cta,
                        image_url=fundo_url,
                    )
                except Exception as e:
                    print(f"Bannerbear falhou para variação: {e}")

            return VariationItem(
                copy=copy_var,
                fundo_url=fundo_url,
                imagem_url=imagem_final_url,
            )

        variacoes = await asyncio.gather(
            *[processar_variacao(cv) for cv in variacoes_copy]
        )

        return VariationOutput(
            original_url=request.imagem_url,
            analise=analise,
            variacoes=list(variacoes),
        )
