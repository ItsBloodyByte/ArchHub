"""In-app notification service."""
import uuid
from datetime import datetime, timezone
from database import db


async def create_notification(user_id: str, notif_type: str, title: str, message: str, link: str = ""):
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": notif_type,
        "title": title,
        "message": message,
        "link": link,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
