from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from typing import Literal

from models.map_video_output import MapVideoRequest, MapVideoOutput
from models.db_models import User
from agents.map_video_agent import MapVideoAgent
from routers.auth import get_current_user
from services.database import get_db
from pydantic import BaseModel

router = APIRouter(prefix="/videos", tags=["videos"])

CREDIT_COST = 20

# ---------------------------------------------------------------------------
# Job Store (in-memory)
# ---------------------------------------------------------------------------
class VideoJobStatus(BaseModel):
    job_id: str
    status: Literal["processing", "completed", "failed"]
    resultado: MapVideoOutput | None = None
    erro: str | None = None
    created_at: str
    completed_at: str | None = None
    user_id: int

video_jobs: dict[str, VideoJobStatus] = {}
video_historico: dict[str, MapVideoOutput] = {}

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
            detail=f"Créditos insuficientes. Você precisa de pelo menos {CREDIT_COST} créditos para gerar um vídeo.",
        )
    db_user.credits -= CREDIT_COST
    await db.commit()

map_video_agent = MapVideoAgent()

# ---------------------------------------------------------------------------
# Background task
# ---------------------------------------------------------------------------
async def _processar_video_job(job_id: str, request: MapVideoRequest):
    """Roda em background — atualiza o job store quando terminar."""
    try:
        resultado = await map_video_agent.gerar_video(request)
        video_jobs[job_id].status = "completed"
        video_jobs[job_id].resultado = resultado
        video_jobs[job_id].completed_at = datetime.utcnow().isoformat()
        video_historico[resultado.id] = resultado
    except Exception as e:
        video_jobs[job_id].status = "failed"
        video_jobs[job_id].erro = str(e)
        video_jobs[job_id].completed_at = datetime.utcnow().isoformat()
        print(f"Video job {job_id} falhou: {e}")

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.post("/gerar")
async def gerar_video(
    request: MapVideoRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Inicia geração de vídeo cartográfico em background. Retorna job_id para polling."""
    await _check_and_deduct_credits(user, db)

    import uuid
    job_id = str(uuid.uuid4())

    video_jobs[job_id] = VideoJobStatus(
        job_id=job_id,
        status="processing",
        created_at=datetime.utcnow().isoformat(),
        user_id=user.id,
    )

    background_tasks.add_task(_processar_video_job, job_id, request)

    return {"job_id": job_id, "status": "processing"}


@router.get("/jobs/{job_id}")
async def status_video_job(
    job_id: str,
    user: User = Depends(get_current_user),
):
    """Retorna o status atual de um job de vídeo."""
    if job_id not in video_jobs:
        raise HTTPException(status_code=404, detail="Job não encontrado")
    return video_jobs[job_id]


@router.get("/historico")
async def listar_historico(user: User = Depends(get_current_user)):
    """Lista vídeos gerados."""
    return list(video_historico.values())


@router.get("/{video_id}", response_model=MapVideoOutput)
async def buscar_video(
    video_id: str,
    user: User = Depends(get_current_user),
):
    """Busca vídeo por ID."""
    if video_id not in video_historico:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado")
    return video_historico[video_id]
