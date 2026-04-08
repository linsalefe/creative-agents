from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from models.creative_request import CreativeRequest
from models.creative_output import CreativeOutput
from models.variation import VariationOutput
from models.db_models import User
from agents.orchestrator import Orchestrator
from routers.auth import get_current_user

router = APIRouter(prefix="/criativos", tags=["criativos"])

orchestrator = Orchestrator()

# Armazenamento em memoria (complementar ao banco)
historico: dict[str, CreativeOutput] = {}


@router.post("/gerar", response_model=CreativeOutput)
async def gerar_criativo(
    request: CreativeRequest, user: User = Depends(get_current_user)
):
    """Gera criativo completo passando por todos os agentes do pipeline."""
    try:
        resultado = await orchestrator.gerar_criativo(request)
        historico[resultado.id] = resultado
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/gerar/rapido", response_model=CreativeOutput)
async def gerar_rapido(
    request: CreativeRequest, user: User = Depends(get_current_user)
):
    """Gera criativo rapido (sem direcao de arte detalhada)."""
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
):
    """Gera uma variante de um criativo existente reutilizando a estrategia."""
    if criativo_id not in historico:
        raise HTTPException(status_code=404, detail="Criativo original nao encontrado")

    resultado = await orchestrator.gerar_criativo(request)
    historico[resultado.id] = resultado
    return resultado


@router.post("/variacoes", response_model=VariationOutput)
async def gerar_variacoes(
    file: UploadFile = File(...), user: User = Depends(get_current_user)
):
    """Recebe upload de imagem, analisa e gera 5 variacoes com edicao de texto."""
    try:
        image_data = await file.read()
        mime_type = file.content_type or "image/png"
        resultado = await orchestrator.gerar_variacoes(
            image_data=image_data, mime_type=mime_type
        )
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
