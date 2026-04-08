import base64

from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from models.creative_request import CreativeRequest
from models.creative_output import CreativeOutput
from models.variation import VariationRequest, VariationOutput
from agents.orchestrator import Orchestrator

router = APIRouter(prefix="/criativos", tags=["criativos"])

orchestrator = Orchestrator()

# Armazenamento em memória (substituir por banco de dados no futuro)
historico: dict[str, CreativeOutput] = {}


@router.post("/gerar", response_model=CreativeOutput)
async def gerar_criativo(request: CreativeRequest):
    """Gera criativo completo passando por todos os agentes do pipeline."""
    try:
        resultado = await orchestrator.gerar_criativo(request)
        historico[resultado.id] = resultado
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/gerar/rapido", response_model=CreativeOutput)
async def gerar_rapido(request: CreativeRequest):
    """Gera criativo rápido (sem direção de arte detalhada)."""
    try:
        resultado = await orchestrator.gerar_rapido(request)
        historico[resultado.id] = resultado
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{criativo_id}", response_model=CreativeOutput)
async def buscar_criativo(criativo_id: str):
    """Busca um criativo gerado pelo ID."""
    if criativo_id not in historico:
        raise HTTPException(status_code=404, detail="Criativo não encontrado")
    return historico[criativo_id]


@router.get("/historico/", response_model=list[CreativeOutput])
async def listar_historico():
    """Lista todos os criativos gerados."""
    return list(historico.values())


@router.post("/variante", response_model=CreativeOutput)
async def gerar_variante(criativo_id: str, request: CreativeRequest):
    """Gera uma variante de um criativo existente reutilizando a estratégia."""
    if criativo_id not in historico:
        raise HTTPException(status_code=404, detail="Criativo original não encontrado")

    resultado = await orchestrator.gerar_criativo(request)
    historico[resultado.id] = resultado
    return resultado


@router.post("/variacoes", response_model=VariationOutput)
async def gerar_variacoes(
    file: UploadFile = File(...),
    template_uid: str = Form(default=""),
):
    """Recebe upload de imagem, analisa e gera 5 variações completas."""
    try:
        contents = await file.read()
        mime_type = file.content_type or "image/png"
        b64 = base64.b64encode(contents).decode("utf-8")
        data_uri = f"data:{mime_type};base64,{b64}"

        request = VariationRequest(
            imagem_url=data_uri,
            template_uid=template_uid or None,
        )
        resultado = await orchestrator.gerar_variacoes(request)
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
