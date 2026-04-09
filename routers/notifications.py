import os

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from models.db_models import User
from models.push_subscription import PushSubscription
from routers.auth import get_current_user
from services.database import get_db

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/vapid-key")
async def get_vapid_key():
    """Retorna a VAPID public key para o frontend se inscrever."""
    return {"public_key": os.getenv("VAPID_PUBLIC_KEY")}


class SubscribeRequest(BaseModel):
    subscription: dict  # {endpoint, keys: {p256dh, auth}}


@router.post("/subscribe")
async def subscribe(
    req: SubscribeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Registra uma subscription de push para o usuário."""
    endpoint = req.subscription.get("endpoint")
    keys = req.subscription.get("keys")

    # Upsert: remove antiga se existir
    await db.execute(
        delete(PushSubscription).where(PushSubscription.endpoint == endpoint)
    )

    sub = PushSubscription(
        user_id=user.id,
        endpoint=endpoint,
        keys=keys,
    )
    db.add(sub)
    await db.commit()
    return {"status": "subscribed"}


class UnsubscribeRequest(BaseModel):
    endpoint: str


@router.post("/unsubscribe")
async def unsubscribe(
    req: UnsubscribeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove subscription de push."""
    await db.execute(
        delete(PushSubscription).where(
            PushSubscription.endpoint == req.endpoint,
            PushSubscription.user_id == user.id,
        )
    )
    await db.commit()
    return {"status": "unsubscribed"}
