from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from models.creative_request import CreativeRequest
from models.creative_output import CreativeOutput
from models.variation import VariationOutput
from models.db_models import User
from agents.orchestrator import Orchestrator
from routers.auth import get_current_user
from services.database import get_db

router = APIRouter(prefix="/criativos", tags=["criativos"])


CREDIT_COST = 10


async def _check_and_deduct_credits(user: User, db: AsyncSession) -> None:
    if user.credits < CREDIT_COST:
        raise HTTPException(
            status_code=402,
            detail="Créditos insuficientes. Você precisa de pelo menos 10 créditos para gerar um criativo.",
        )
    user.credits -= CREDIT_COST
    await db.commit()

orchestrator = Orchestrator()

# Armazenamento em memoria (complementar ao banco)
historico: dict[str, CreativeOutput] = {}


@router.post("/gerar", response_model=CreativeOutput)
async def gerar_criativo(
    request: CreativeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Gera criativo completo passando por todos os agentes do pipeline."""
    await _check_and_deduct_credits(user, db)
    try:
        resultado = await orchestrator.gerar_criativo(request)
        historico[resultado.id] = resultado
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/gerar/rapido", response_model=CreativeOutput)
async def gerar_rapido(
    request: CreativeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Gera criativo rapido (sem direcao de arte detalhada)."""
    await _check_and_deduct_credits(user, db)
    try:
        resultado = await orchestrator.gerar_rapido(request)
        historico[resultado.id] = resultado
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/historico/", response_model=list[CreativeOutput])
async def listar_historico(user: User = Depends(get_current_user)):
    """Lista todos os criativos gerados."""
    return list(historico.values())


@router.get("/{criativo_id}", response_model=CreativeOutput)
async def buscar_criativo(
    criativo_id: str, user: User = Depends(get_current_user)
):
    """Busca um criativo gerado pelo ID."""
    if criativo_id not in historico:
        raise HTTPException(status_code=404, detail="Criativo nao encontrado")
    return historico[criativo_id]


@router.post("/variante", response_model=CreativeOutput)
async def gerar_variante(
    criativo_id: str,
    request: CreativeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Gera uma variante de um criativo existente reutilizando a estrategia."""
    if criativo_id not in historico:
        raise HTTPException(status_code=404, detail="Criativo original nao encontrado")

    await _check_and_deduct_credits(user, db)
    resultado = await orchestrator.gerar_criativo(request)
    historico[resultado.id] = resultado
    return resultado


@router.post("/variacoes", response_model=VariationOutput)
async def gerar_variacoes(
    file: UploadFile = File(...),
    formato: str = Form(default="feed"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Recebe upload de imagem, analisa e gera 5 variacoes com edicao de texto."""
    await _check_and_deduct_credits(user, db)
    try:
        image_data = await file.read()
        mime_type = file.content_type or "image/png"
        resultado = await orchestrator.gerar_variacoes(
            image_data=image_data,
            mime_type=mime_type,
            formato=formato,
        )
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
