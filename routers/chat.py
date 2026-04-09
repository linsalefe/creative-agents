import json
import logging
import os
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, field_validator
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from agents.orchestrator import Orchestrator
from agents.vision_agent import VisionAgent
from models.db_models import Arte, ChatMessage, User, Variacao
from routers.auth import get_current_user
from services.database import get_db
from services.embedding_service import EmbeddingService
from services.gemini_service import GeminiService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])

orchestrator = Orchestrator()
vision_agent = VisionAgent()
embedding_service = EmbeddingService()
gemini = GeminiService()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploaded_artes")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ART_KEYWORDS = [
    "crie", "cria", "gere", "gera", "faca", "faça", "faz",
    "arte para", "criativo para", "variacao", "variação",
    "banner", "post para", "anuncio", "anúncio",
    "imagem para", "design para",
]

CHAT_SYSTEM_PROMPT = """Voce e o assistente de IA da Creative Machine, uma plataforma de geracao de criativos de marketing.
Voce ajuda os usuarios a:
- Gerar artes e variacoes de criativos
- Responder perguntas sobre a biblioteca de artes
- Dar sugestoes de marketing criativo

Responda sempre em portugues brasileiro, de forma direta e util.
Se o usuario pedir informacoes sobre suas artes, use o contexto fornecido.
Se o usuario quiser gerar uma arte mas nao tiver referencia, sugira que suba uma arte de referencia na biblioteca."""


class MessageRequest(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        if len(v) > 5000:
            raise ValueError("Mensagem excede o limite de 5000 caracteres")
        return v


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    imagem_url: str | None = None
    arte_ref_id: int | None = None
    created_at: str | None = None

    class Config:
        from_attributes = True


def is_art_request(text: str) -> bool:
    text_lower = text.lower()
    return any(kw in text_lower for kw in ART_KEYWORDS)


async def search_similar_artes(
    query_text: str, user_id: int, db: AsyncSession, limit: int = 3
) -> list[tuple]:
    """Search for similar artes using embedding similarity."""
    try:
        query_embedding = await embedding_service.generate_embedding(query_text)
        embedding_str = "[" + ",".join(str(v) for v in query_embedding) + "]"

        result = await db.execute(
            text("""
                SELECT id, filename, file_path, analise_json, tags,
                       1 - (embedding <=> :embedding::vector) as similarity
                FROM artes
                WHERE user_id = :user_id AND embedding IS NOT NULL
                ORDER BY embedding <=> :embedding::vector
                LIMIT :limit
            """),
            {
                "embedding": embedding_str,
                "user_id": user_id,
                "limit": limit,
            },
        )
        rows = result.fetchall()
        return [(row.id, row.filename, row.file_path, row.analise_json, row.tags, row.similarity) for row in rows]
    except Exception as e:
        logger.error("Similarity search failed", exc_info=True)
        return []


@router.post("/message", response_model=MessageResponse)
async def send_message(
    req: MessageRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Save user message
    user_msg = ChatMessage(
        user_id=user.id,
        role="user",
        content=req.content,
    )
    db.add(user_msg)
    await db.flush()

    response_content = ""
    arte_ref_id = None
    imagem_url = None

    if is_art_request(req.content):
        # Search for similar artes
        similar = await search_similar_artes(req.content, user.id, db)

        if similar and similar[0][5] > 0.7:
            # Found a similar arte — use as reference
            arte_id, filename, file_path, analise, tags, similarity = similar[0]
            arte_ref_id = arte_id

            # Read the image file for variation generation
            full_path = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                file_path.lstrip("/").replace("static/artes/", "uploaded_artes/"),
            )

            if os.path.exists(full_path):
                with open(full_path, "rb") as f:
                    image_data = f.read()

                try:
                    var_result = await orchestrator.gerar_variacoes(
                        image_data=image_data, mime_type="image/png"
                    )

                    # Save variations to DB
                    var_urls = []
                    for var_item in var_result.variacoes:
                        if var_item.imagem_url:
                            var_urls.append(var_item.imagem_url)
                            variacao = Variacao(
                                arte_id=arte_id,
                                user_id=user.id,
                                headline=var_item.copy.headline,
                                subheadline=var_item.copy.subheadline,
                                cta=var_item.copy.cta,
                                imagem_path=var_item.imagem_url,
                            )
                            db.add(variacao)

                    headline_analise = analise.get("headline", filename) if analise else filename
                    response_content = (
                        f"Encontrei a arte \"{headline_analise}\" na sua biblioteca "
                        f"(similaridade: {similarity:.0%}). "
                        f"Gerei {len(var_urls)} variacoes automaticamente!\n\n"
                    )
                    for i, url in enumerate(var_urls):
                        response_content += f"- Variacao {i+1}: {url}\n"

                    if var_urls:
                        imagem_url = var_urls[0]

                except Exception as e:
                    logger.error("Erro ao gerar variacoes via chat", exc_info=True)
                    response_content = (
                        f"Encontrei a arte \"{filename}\" como referencia, "
                        f"mas houve um erro ao gerar variacoes. Tente novamente."
                    )
            else:
                response_content = (
                    f"Encontrei a arte \"{filename}\" como referencia "
                    f"(similaridade: {similarity:.0%}), "
                    "mas o arquivo original nao esta mais disponivel. "
                    "Por favor, suba a arte novamente na biblioteca."
                )
        else:
            response_content = (
                "Nao encontrei nenhuma arte similar na sua biblioteca. "
                "Suba uma arte de referencia na aba Biblioteca e eu poderei "
                "gerar variacoes automaticamente para voce!"
            )
    else:
        # General question — respond with AI
        # Get context about user's library
        from sqlalchemy import func

        total = await db.execute(
            select(func.count(Arte.id)).where(Arte.user_id == user.id)
        )
        total_artes = total.scalar() or 0

        total_var = await db.execute(
            select(func.count(Variacao.id)).where(Variacao.user_id == user.id)
        )
        total_variacoes = total_var.scalar() or 0

        context = f"O usuario tem {total_artes} artes e {total_variacoes} variacoes na biblioteca."

        try:
            ai_response = await gemini.generate(
                system_prompt=CHAT_SYSTEM_PROMPT,
                user_message=f"Contexto: {context}\n\nMensagem do usuario: {req.content}",
            )
            # The response might be JSON or text
            if isinstance(ai_response, dict):
                response_content = ai_response.get("response", ai_response.get("resposta", json.dumps(ai_response)))
            else:
                response_content = str(ai_response)
        except Exception:
            # Fallback: respond without AI
            response_content = (
                f"Voce tem {total_artes} artes na biblioteca e {total_variacoes} variacoes geradas. "
                "Como posso ajudar com seus criativos?"
            )

    # Save assistant message
    assistant_msg = ChatMessage(
        user_id=user.id,
        role="assistant",
        content=response_content,
        imagem_url=imagem_url,
        arte_ref_id=arte_ref_id,
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)

    return MessageResponse(
        id=assistant_msg.id,
        role="assistant",
        content=response_content,
        imagem_url=imagem_url,
        arte_ref_id=arte_ref_id,
        created_at=str(assistant_msg.created_at) if assistant_msg.created_at else None,
    )


@router.post("/upload-image", response_model=MessageResponse)
async def upload_chat_image(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload an image in the chat — analyze and save to library."""
    image_data = await file.read()
    mime_type = file.content_type or "image/png"

    # Save file
    ext = mime_type.split("/")[-1] if "/" in mime_type else "png"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(image_data)

    # Save user message
    user_msg = ChatMessage(
        user_id=user.id,
        role="user",
        content=f"[Upload de imagem: {file.filename}]",
        imagem_url=f"/static/artes/{filename}",
    )
    db.add(user_msg)
    await db.flush()

    # Analyze
    try:
        analise = await vision_agent.run(image_data=image_data, mime_type=mime_type)
        analise_dict = analise.model_dump()
    except Exception as e:
        analise_dict = None

    # Generate embedding
    embedding = None
    if analise_dict:
        try:
            embedding = await embedding_service.embed_analysis(analise_dict)
        except Exception:
            pass

    # Save to artes
    arte = Arte(
        user_id=user.id,
        filename=file.filename or filename,
        file_path=f"/static/artes/{filename}",
        mime_type=mime_type,
        analise_json=analise_dict,
        embedding=embedding,
        tags=[],
    )
    db.add(arte)
    await db.flush()

    # Build response
    if analise_dict:
        response_content = (
            f"Analisei a arte e salvei na sua biblioteca!\n\n"
            f"**Headline:** {analise_dict.get('headline', 'N/A')}\n"
            f"**Tom:** {analise_dict.get('tom', 'N/A')}\n"
            f"**Publico:** {analise_dict.get('publico', 'N/A')}\n"
            f"**Estilo:** {analise_dict.get('estilo_visual', 'N/A')}\n\n"
            f"Deseja que eu gere variacoes desta arte?"
        )
    else:
        response_content = (
            "Salvei a arte na sua biblioteca, mas nao consegui analisar. "
            "Voce pode tentar novamente ou gerar variacoes manualmente."
        )

    assistant_msg = ChatMessage(
        user_id=user.id,
        role="assistant",
        content=response_content,
        arte_ref_id=arte.id,
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)

    return MessageResponse(
        id=assistant_msg.id,
        role="assistant",
        content=response_content,
        arte_ref_id=arte.id,
        created_at=str(assistant_msg.created_at) if assistant_msg.created_at else None,
    )


@router.get("/history", response_model=list[MessageResponse])
async def get_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == user.id)
        .order_by(ChatMessage.created_at.asc())
    )
    messages = result.scalars().all()
    return [
        MessageResponse(
            id=m.id,
            role=m.role,
            content=m.content,
            imagem_url=m.imagem_url,
            arte_ref_id=m.arte_ref_id,
            created_at=str(m.created_at) if m.created_at else None,
        )
        for m in messages
    ]
