"""Google Drive Routes — Conectar, exportar criativos e vídeos."""
import os
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from models.db_models import User
from routers.auth import get_current_user
from services.drive_service import DriveService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/drive", tags=["google-drive"])
drive = DriveService()


# ── Schemas ──

class ExportCriativoRequest(BaseModel):
    produto_nome: str
    criativo_numero: int = 0
    file_paths: list[str]


class ExportVideoRequest(BaseModel):
    produto_nome: str
    video_numero: int = 0
    file_path: str


# ── OAuth ──

@router.get("/status")
async def drive_status(user: User = Depends(get_current_user)):
    """Verifica se Google Drive está conectado."""
    return {"connected": drive.is_connected(user.id)}


@router.post("/connect")
async def connect_drive(user: User = Depends(get_current_user)):
    """Inicia OAuth do Google Drive via Composio."""
    try:
        auth_url = drive.get_auth_url(user.id)
        return {"redirect_url": auth_url}
    except Exception as e:
        logger.error(f"Erro OAuth Drive: {e}")
        raise HTTPException(status_code=500, detail="Erro ao conectar Google Drive")


@router.post("/disconnect")
async def disconnect_drive(user: User = Depends(get_current_user)):
    """Desconecta Google Drive."""
    drive.disconnect(user.id)
    return {"status": "disconnected"}


# ── Export ──

def _resolve_local_path(file_path: str) -> str:
    """Converte path da API para path local no servidor."""
    base_dir = os.path.dirname(os.path.dirname(__file__))
    local = file_path.lstrip("/")

    if local.startswith("static/images/"):
        local = local.replace("static/images/", "generated_images/", 1)
    elif local.startswith("static/artes/"):
        local = local.replace("static/artes/", "uploaded_artes/", 1)
    elif local.startswith("static/videos/"):
        local = local.replace("static/videos/", "generated_videos/", 1)

    full_path = os.path.join(base_dir, local)
    if not os.path.exists(full_path):
        raise FileNotFoundError(f"Arquivo não encontrado: {file_path}")
    return full_path


@router.post("/export")
async def export_criativo(
    body: ExportCriativoRequest,
    user: User = Depends(get_current_user),
):
    """Exporta criativo para Drive: Creative Machine/{produto}/Criativo {N}/"""
    if not drive.is_connected(user.id):
        raise HTTPException(status_code=400, detail="Google Drive não conectado")

    files = []
    for fp in body.file_paths:
        try:
            local = _resolve_local_path(fp)
            files.append({"local_path": local, "filename": os.path.basename(local)})
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))

    numero = body.criativo_numero
    if numero == 0:
        numero = drive.count_criativos(user.id, body.produto_nome) + 1

    try:
        result = drive.export_criativo(
            user_id=user.id,
            produto_nome=body.produto_nome,
            criativo_numero=numero,
            files=files,
        )
        return result
    except Exception as e:
        logger.error(f"Export falhou: {e}")
        raise HTTPException(status_code=500, detail="Erro ao exportar para Google Drive")


@router.post("/export-video")
async def export_video(
    body: ExportVideoRequest,
    user: User = Depends(get_current_user),
):
    """Exporta vídeo para Drive: Creative Machine/{produto}/Video {N}/"""
    if not drive.is_connected(user.id):
        raise HTTPException(status_code=400, detail="Google Drive não conectado")

    try:
        local = _resolve_local_path(body.file_path)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    numero = body.video_numero if body.video_numero > 0 else 1

    try:
        result = drive.export_video(
            user_id=user.id,
            produto_nome=body.produto_nome,
            video_numero=numero,
            local_path=local,
        )
        return result
    except Exception as e:
        logger.error(f"Export vídeo falhou: {e}")
        raise HTTPException(status_code=500, detail="Erro ao exportar vídeo para Google Drive")


@router.get("/produtos")
async def list_produtos(user: User = Depends(get_current_user)):
    """Lista produtos já exportados no Drive."""
    return {"produtos": drive.list_produtos(user.id)}
