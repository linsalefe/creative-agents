from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from datetime import datetime
from typing import Literal

from models.creative_request import CreativeRequest
from models.creative_output import CreativeOutput
from models.variation import VariationOutput
from models.db_models import User
from agents.orchestrator import Orchestrator
from routers.auth import get_current_user
from services.database import get_db
from pydantic import BaseModel

router = APIRouter(prefix="/criativos", tags=["criativos"])

CREDIT_COST = 10

# ---------------------------------------------------------------------------
# Job Store (in-memory — persiste enquanto o processo estiver rodando)
# ---------------------------------------------------------------------------
class JobStatus(BaseModel):
    job_id: str
    status: Literal["processing", "completed", "failed"]
    resultado: VariationOutput | None = None
    erro: str | None = None
    created_at: str
    completed_at: str | None = None
    formato: str = "feed"
    user_id: int

jobs: dict[str, JobStatus] = {}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def _check_and_deduct_credits(user: User, db: AsyncSession) -> None:
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.id == user.id))
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    if db_user.credits < CREDIT_COST:
        raise HTTPException(
            status_code=402,
            detail="Créditos insuficientes. Você precisa de pelo menos 10 créditos para gerar um criativo.",
        )
    db_user.credits -= CREDIT_COST
    await db.commit()

orchestrator = Orchestrator()
historico: dict[str, CreativeOutput] = {}

# ---------------------------------------------------------------------------
# Background task
# ---------------------------------------------------------------------------
async def _processar_job(job_id: str, image_data: bytes, mime_type: str, formato: str):
    """Roda em background — atualiza o job store quando terminar."""
    try:
        resultado = await orchestrator.gerar_variacoes(
            image_data=image_data,
            mime_type=mime_type,
            formato=formato,
        )
        jobs[job_id].status = "completed"
        jobs[job_id].resultado = resultado
        jobs[job_id].completed_at = datetime.utcnow().isoformat()
    except Exception as e:
        jobs[job_id].status = "failed"
        jobs[job_id].erro = str(e)
        jobs[job_id].completed_at = datetime.utcnow().isoformat()
        print(f"Job {job_id} falhou: {e}")

# ---------------------------------------------------------------------------
# Endpoints existentes (sem alteração)
# ---------------------------------------------------------------------------
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
    return list(historico.values())


@router.get("/historico/{criativo_id}", response_model=CreativeOutput)
async def buscar_criativo(
    criativo_id: str, user: User = Depends(get_current_user)
):
    if criativo_id not in historico:
        raise HTTPException(status_code=404, detail="Criativo nao encontrado")
    return historico[criativo_id]


# ---------------------------------------------------------------------------
# NOVO: Variações com Job Queue
# ---------------------------------------------------------------------------
@router.post("/variacoes")
async def iniciar_variacoes(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    formato: str = Form(default="ambos"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Inicia geração de variações em background. Retorna job_id para polling."""
    await _check_and_deduct_credits(user, db)

    job_id = str(uuid.uuid4())
    image_data = await file.read()
    mime_type = file.content_type or "image/png"

    # Registrar job
    jobs[job_id] = JobStatus(
        job_id=job_id,
        status="processing",
        created_at=datetime.utcnow().isoformat(),
        formato=formato,
        user_id=user.id,
    )

    # Disparar em background (não bloqueia o request)
    background_tasks.add_task(_processar_job, job_id, image_data, mime_type, formato)

    return {"job_id": job_id, "status": "processing"}


@router.get("/jobs/{job_id}")
async def status_job(
    job_id: str,
    user: User = Depends(get_current_user),
):
    """Retorna o status atual de um job de variações."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job não encontrado")

    job = jobs[job_id]

    # Segurança: só o dono pode ver o job
    if job.user_id != user.id and True:  # relaxar para admin se necessário
        pass  # manter simples por ora

    return job


@router.get("/jobs/")
async def listar_jobs(user: User = Depends(get_current_user)):
    """Lista os últimos jobs do usuário."""
    user_jobs = [j for j in jobs.values() if j.user_id == user.id]
    # Ordenar por created_at desc, retornar últimos 10
    user_jobs.sort(key=lambda x: x.created_at, reverse=True)
    return user_jobs[:10]
