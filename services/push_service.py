import json
import logging
import os

from pywebpush import webpush, WebPushException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.push_subscription import PushSubscription

logger = logging.getLogger(__name__)


class PushService:
    def __init__(self):
        self.vapid_private_key = os.getenv("VAPID_PRIVATE_KEY")
        self.vapid_claims = {"sub": "mailto:admin@cenat.com.br"}

    async def send_to_user(
        self, db: AsyncSession, user_id: int, title: str, body: str, url: str = "/dashboard"
    ):
        """Envia push notification para todos os devices de um usuário."""
        result = await db.execute(
            select(PushSubscription).where(PushSubscription.user_id == user_id)
        )
        subscriptions = result.scalars().all()

        payload = json.dumps({
            "title": title,
            "body": body,
            "url": url,
        })

        for sub in subscriptions:
            try:
                webpush(
                    subscription_info={
                        "endpoint": sub.endpoint,
                        "keys": sub.keys,
                    },
                    data=payload,
                    vapid_private_key=self.vapid_private_key,
                    vapid_claims=self.vapid_claims,
                )
            except WebPushException as e:
                logger.warning(f"Push failed for {sub.endpoint}: {e}")
                if e.response and e.response.status_code in (404, 410):
                    await db.delete(sub)
                    await db.commit()
            except Exception as e:
                logger.error(f"Push error: {e}")
