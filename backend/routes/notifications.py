"""Notification routes."""
from fastapi import APIRouter, Depends, Query

from database import db
from deps import get_current_user

router = APIRouter()


@router.get("/notifications")
async def get_notifications(user=Depends(get_current_user), limit: int = Query(20, ge=1, le=50)):
    notifications = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort([("created_at", -1)]).limit(limit).to_list(limit)
    unread = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    return {"notifications": notifications, "unread_count": unread}


@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user=Depends(get_current_user)):
    await db.notifications.update_one({"id": notification_id, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"message": "Marked as read"}


@router.put("/notifications/read-all")
async def mark_all_notifications_read(user=Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"], "read": False}, {"$set": {"read": True}})
    return {"message": "All marked as read"}
