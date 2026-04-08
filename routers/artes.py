import json
import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from agents.vision_agent import VisionAgent
from models.db_models import Arte, User
from routers.auth import get_current_user
from services.database import get_db
from services.embedding_service import EmbeddingService

router = APIRouter(prefix="/artes", tags=["artes"])

vision_agent = VisionAgent()
embedding_service = EmbeddingService()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploaded_artes")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class ArteResponse(BaseModel):
    id: int
    filename: str
    file_path: str
    mime_type: str
    analise_json: dict | None = None
    tags: list | None = None
    favorito: bool = False
    pasta: str | None = None
    created_at: str | None = None

    class Config:
        from_attributes = True


class ArteDetailResponse(ArteResponse):
    user_id: int


@router.post("/upload", response_model=ArteResponse)
async def upload_arte(
    file: UploadFile = File(...),
    tags: str = Query("", description="Comma-separated tags"),
    pasta: str = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    image_data = await file.read()
    mime_type = file.content_type or "image/png"

    # Save file
    ext = mime_type.split("/")[-1] if "/" in mime_type else "png"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(image_data)

    # Analyze with VisionAgent
    try:
        analise = await vision_agent.run(image_data=image_data, mime_type=mime_type)
        analise_dict = analise.model_dump()
    except Exception as e:
        print(f"Vision analysis failed: {e}")
        analise_dict = None

    # Generate embedding
    embedding = None
    if analise_dict:
        try:
            embedding = await embedding_service.embed_analysis(analise_dict)
        except Exception as e:
            print(f"Embedding generation failed: {e}")

    # Parse tags
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []

    arte = Arte(
        user_id=user.id,
        filename=file.filename or filename,
        file_path=f"/static/artes/{filename}",
        mime_type=mime_type,
        analise_json=analise_dict,
        embedding=embedding,
        tags=tag_list,
        favorito=False,
        pasta=pasta,
    )
    db.add(arte)
    await db.commit()
    await db.refresh(arte)

    return ArteResponse(
        id=arte.id,
        filename=arte.filename,
        file_path=arte.file_path,
        mime_type=arte.mime_type,
        analise_json=arte.analise_json,
        tags=arte.tags,
        favorito=arte.favorito,
        pasta=arte.pasta,
        created_at=str(arte.created_at) if arte.created_at else None,
    )


@router.get("/", response_model=list[ArteResponse])
async def list_artes(
    tag: str = Query(None),
    pasta: str = Query(None),
    favorito: bool = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Arte).where(Arte.user_id == user.id).order_by(Arte.created_at.desc())
    if pasta is not None:
        stmt = stmt.where(Arte.pasta == pasta)
    if favorito is not None:
        stmt = stmt.where(Arte.favorito == favorito)

    result = await db.execute(stmt)
    artes = result.scalars().all()

    items = []
    for a in artes:
        if tag and a.tags:
            if tag.lower() not in [t.lower() for t in a.tags]:
                continue
        items.append(
            ArteResponse(
                id=a.id,
                filename=a.filename,
                file_path=a.file_path,
                mime_type=a.mime_type,
                analise_json=a.analise_json,
                tags=a.tags,
                favorito=a.favorito,
                pasta=a.pasta,
                created_at=str(a.created_at) if a.created_at else None,
            )
        )
    return items


@router.patch("/{arte_id}/favorito")
async def toggle_favorito(
    arte_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Arte).where(Arte.id == arte_id, Arte.user_id == user.id)
    )
    arte = result.scalar_one_or_none()
    if not arte:
        raise HTTPException(status_code=404, detail="Arte nao encontrada")
    arte.favorito = not arte.favorito
    await db.commit()
    return {"id": arte.id, "favorito": arte.favorito}


@router.patch("/{arte_id}/pasta")
async def move_to_pasta(
    arte_id: int,
    pasta: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Arte).where(Arte.id == arte_id, Arte.user_id == user.id)
    )
    arte = result.scalar_one_or_none()
    if not arte:
        raise HTTPException(status_code=404, detail="Arte nao encontrada")
    arte.pasta = pasta if pasta else None
    await db.commit()
    return {"id": arte.id, "pasta": arte.pasta}


@router.patch("/{arte_id}/tags")
async def update_tags(
    arte_id: int,
    tags: list[str],
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Arte).where(Arte.id == arte_id, Arte.user_id == user.id)
    )
    arte = result.scalar_one_or_none()
    if not arte:
        raise HTTPException(status_code=404, detail="Arte nao encontrada")
    arte.tags = tags
    await db.commit()
    return {"id": arte.id, "tags": arte.tags}


@router.delete("/{arte_id}")
async def delete_arte(
    arte_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Arte).where(Arte.id == arte_id, Arte.user_id == user.id)
    )
    arte = result.scalar_one_or_none()
    if not arte:
        raise HTTPException(status_code=404, detail="Arte nao encontrada")

    # Delete file from disk
    full_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        arte.file_path.lstrip("/").replace("static/artes/", "uploaded_artes/"),
    )
    if os.path.exists(full_path):
        os.remove(full_path)

    await db.delete(arte)
    await db.commit()
    return {"message": "Arte removida"}


@router.get("/stats")
async def arte_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import func
    from models.db_models import Variacao
    from datetime import datetime, timedelta

    # Total artes
    total = await db.execute(
        select(func.count(Arte.id)).where(Arte.user_id == user.id)
    )
    total_artes = total.scalar() or 0

    # Total variacoes
    total_var = await db.execute(
        select(func.count(Variacao.id)).where(Variacao.user_id == user.id)
    )
    total_variacoes = total_var.scalar() or 0

    # Favoritas
    fav = await db.execute(
        select(func.count(Arte.id)).where(
            Arte.user_id == user.id, Arte.favorito == True
        )
    )
    total_favoritas = fav.scalar() or 0

    # Este mes
    now = datetime.utcnow()
    first_day = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    mes = await db.execute(
        select(func.count(Arte.id)).where(
            Arte.user_id == user.id, Arte.created_at >= first_day
        )
    )
    artes_mes = mes.scalar() or 0

    return {
        "total_artes": total_artes,
        "total_variacoes": total_variacoes,
        "total_favoritas": total_favoritas,
        "artes_este_mes": artes_mes,
    }
