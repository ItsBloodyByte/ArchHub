"""Bookmark routes."""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends

from database import db
from deps import get_current_user

router = APIRouter()


@router.post("/bookmarks/{article_id}")
async def toggle_bookmark(article_id: str, user=Depends(get_current_user)):
    existing = await db.bookmarks.find_one({"user_id": user["id"], "article_id": article_id})
    if existing:
        await db.bookmarks.delete_one({"user_id": user["id"], "article_id": article_id})
        return {"bookmarked": False}
    else:
        await db.bookmarks.insert_one({
            "id": str(uuid.uuid4()), "user_id": user["id"],
            "article_id": article_id, "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {"bookmarked": True}


@router.get("/bookmarks")
async def get_bookmarks(user=Depends(get_current_user)):
    bookmarks = await db.bookmarks.find({"user_id": user["id"]}, {"_id": 0}).sort([("created_at", -1)]).to_list(100)
    article_ids = [b["article_id"] for b in bookmarks]
    articles = await db.articles.find({"id": {"$in": article_ids}}, {"_id": 0, "content_markdown": 0}).to_list(100)
    return {"bookmarks": articles}


@router.get("/bookmarks/{article_id}/check")
async def check_bookmark(article_id: str, user=Depends(get_current_user)):
    existing = await db.bookmarks.find_one({"user_id": user["id"], "article_id": article_id})
    return {"bookmarked": existing is not None}
