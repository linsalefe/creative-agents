import logging
import os
import uuid
from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, UploadFile, File, Form
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from models.video_output import VideoRequest, VideoOutput
from models.db_models import User
from agents.video_pipeline_agent import VideoPipelineAgent
from routers.auth import get_current_user
from services.database import get_db, SessionLocal
from services.push_service import PushService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/videos", tags=["videos"])

limiter = Limiter(key_func=get_remote_address)

CREDIT_COST = 20

# ---------------------------------------------------------------------------
# Job Store (in-memory)
# ---------------------------------------------------------------------------
class VideoJobStatus(BaseModel):
    job_id: str
    status: Literal["processing", "completed", "failed"]
    resultado: VideoOutput | None = None
    erro: str | None = None
    created_at: str
    completed_at: str | None = None
    user_id: int

video_jobs: dict[str, VideoJobStatus] = {}
video_historico: dict[str, VideoOutput] = {}

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

    if db_user.credits < 50:
        try:
            await push_service.send_to_user(
                db=db,
                user_id=db_user.id,
                title="Créditos baixos ⚠️",
                body=f"Você tem {db_user.credits} créditos restantes.",
                url="/configuracoes",
            )
        except Exception:
            pass

pipeline = VideoPipelineAgent()
push_service = PushService()

# ---------------------------------------------------------------------------
# Background task
# ---------------------------------------------------------------------------
async def _processar_video_job(job_id: str, request: VideoRequest):
    """Roda em background — atualiza o job store quando terminar."""
    try:
        resultado = await pipeline.gerar_video(request)
        video_jobs[job_id].status = "completed"
        video_jobs[job_id].resultado = resultado
        video_jobs[job_id].completed_at = datetime.utcnow().isoformat()
        video_historico[resultado.id] = resultado

        try:
            async with SessionLocal() as db:
                await push_service.send_to_user(
                    db=db,
                    user_id=video_jobs[job_id].user_id,
                    title="Vídeo pronto! 🎬",
                    body="Seu vídeo de marketing está pronto.",
                    url="/videos",
                )
        except Exception:
            pass
    except Exception as e:
        video_jobs[job_id].status = "failed"
        video_jobs[job_id].erro = str(e)
        video_jobs[job_id].completed_at = datetime.utcnow().isoformat()
        logger.error("Video job %s falhou", job_id, exc_info=True)

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.post("/gerar")
@limiter.limit("5/minute")
async def gerar_video(
    request: Request,
    background_tasks: BackgroundTasks,
    produto: str = Form(...),
    publico: str = Form(...),
    contexto: str = Form(...),
    tipo: Literal["ken_burns", "slideshow", "motion_graphics"] = Form(default="ken_burns"),
    plataforma: Literal["feed", "stories", "reels"] = Form(default="stories"),
    duracao_segundos: int = Form(default=10),
    file: Optional[UploadFile] = File(default=None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Inicia geração de vídeo criativo em background. Retorna job_id para polling."""
    await _check_and_deduct_credits(user, db)

    # Se enviou imagem, salvar no disco e montar URL
    imagem_url: Optional[str] = None
    if file and file.filename:
        images_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "generated_images")
        os.makedirs(images_dir, exist_ok=True)
        ext = os.path.splitext(file.filename)[1] or ".png"
        filename = f"video_upload_{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(images_dir, filename)
        content = await file.read()
        with open(filepath, "wb") as f:
            f.write(content)
        imagem_url = f"http://127.0.0.1:8000/static/images/{filename}"

    request = VideoRequest(
        produto=produto,
        publico=publico,
        contexto=contexto,
        tipo=tipo,
        plataforma=plataforma,
        duracao_segundos=duracao_segundos,
        imagem_url=imagem_url,
    )

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
    job = video_jobs[job_id]
    if job.user_id != user.id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    return job


@router.get("/historico")
async def listar_historico(user: User = Depends(get_current_user)):
    """Lista vídeos gerados pelo usuário logado."""
    user_jobs = [
        j.resultado for j in video_jobs.values()
        if j.user_id == user.id and j.status == "completed" and j.resultado
    ]
    return user_jobs


@router.get("/{video_id}", response_model=VideoOutput)
async def buscar_video(
    video_id: str,
    user: User = Depends(get_current_user),
):
    """Busca vídeo por ID."""
    if video_id not in video_historico:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado")
    return video_historico[video_id]
