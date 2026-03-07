"""Collection/Learning Path routes: CRUD, reorder."""
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field

from database import db
from deps import get_current_user, get_optional_user
from services.auth_service import generate_unique_slug

router = APIRouter()


class CollectionItemInput(BaseModel):
    content_type: str = Field(pattern="^(article|script)$")
    content_id: str


class CollectionCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=5, max_length=2000)
    difficulty: str = "beginner"
    tags: List[str] = []
    items: List[CollectionItemInput] = []
    language: str = "de"
    title_en: Optional[str] = None
    description_en: Optional[str] = None


class CollectionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[str] = None
    tags: Optional[List[str]] = None
    items: Optional[List[CollectionItemInput]] = None
    language: Optional[str] = None
    title_en: Optional[str] = None
    description_en: Optional[str] = None


async def enrich_items(items: list) -> list:
    """Fetch title/slug/type info for each item in a collection."""
    enriched = []
    for i, item in enumerate(items):
        ct = item.get("content_type", "article")
        cid = item.get("content_id", "")
        entry = {"order": i, "content_type": ct, "content_id": cid}
        if ct == "article":
            doc = await db.articles.find_one({"id": cid}, {"_id": 0, "title": 1, "slug": 1, "title_en": 1, "difficulty": 1, "author_username": 1})
            if doc:
                entry.update({"title": doc["title"], "slug": doc.get("slug"), "title_en": doc.get("title_en"), "difficulty": doc.get("difficulty"), "author_username": doc.get("author_username")})
        elif ct == "script":
            doc = await db.scripts.find_one({"id": cid}, {"_id": 0, "title": 1, "title_en": 1, "language": 1, "author_username": 1})
            if doc:
                entry.update({"title": doc["title"], "title_en": doc.get("title_en"), "language": doc.get("language"), "author_username": doc.get("author_username")})
        enriched.append(entry)
    return enriched


@router.get("/collections")
async def list_collections(
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50),
    tag: Optional[str] = None,
    sort: str = Query("newest"),
    search: Optional[str] = None
):
    query = {}
    if tag:
        query["tags"] = tag
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]
    sort_map = {
        "newest": [("created_at", -1)],
        "oldest": [("created_at", 1)],
        "popular": [("view_count", -1)],
    }
    skip = (page - 1) * limit
    total = await db.collections.count_documents(query)
    collections = await db.collections.find(query, {"_id": 0}).sort(sort_map.get(sort, [("created_at", -1)])).skip(skip).limit(limit).to_list(limit)
    return {"collections": collections, "total": total, "page": page, "pages": max(1, (total + limit - 1) // limit)}


@router.get("/collections/{slug}")
async def get_collection(slug: str, user=Depends(get_optional_user)):
    collection = await db.collections.find_one({"slug": slug}, {"_id": 0})
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    await db.collections.update_one({"slug": slug}, {"$inc": {"view_count": 1}})
    collection["view_count"] = collection.get("view_count", 0) + 1
    collection["items"] = await enrich_items(collection.get("items", []))
    return collection


@router.post("/collections", status_code=201)
async def create_collection(data: CollectionCreate, user=Depends(get_current_user)):
    cid = str(uuid.uuid4())
    slug = generate_unique_slug(data.title)
    now = datetime.now(timezone.utc).isoformat()
    raw_items = [{"content_type": it.content_type, "content_id": it.content_id} for it in data.items]
    doc = {
        "id": cid, "title": data.title, "slug": slug,
        "description": data.description, "difficulty": data.difficulty,
        "tags": data.tags, "items": raw_items, "item_count": len(raw_items),
        "author_id": user["id"], "author_username": user["username"],
        "view_count": 0,
        "language": data.language or "de",
        "title_en": data.title_en, "description_en": data.description_en,
        "created_at": now, "updated_at": now,
    }
    await db.collections.insert_one(doc)
    return {"id": cid, "slug": slug, "message": "Collection created"}


@router.put("/collections/{collection_id}")
async def update_collection(collection_id: str, data: CollectionUpdate, user=Depends(get_current_user)):
    col = await db.collections.find_one({"id": collection_id}, {"_id": 0})
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")
    if col["author_id"] != user["id"] and user["role"] not in ["admin", "moderator"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if data.title: updates["title"] = data.title
    if data.description: updates["description"] = data.description
    if data.difficulty: updates["difficulty"] = data.difficulty
    if data.tags is not None: updates["tags"] = data.tags
    if data.items is not None:
        raw_items = [{"content_type": it.content_type, "content_id": it.content_id} for it in data.items]
        updates["items"] = raw_items
        updates["item_count"] = len(raw_items)
    if data.language: updates["language"] = data.language
    if data.title_en is not None: updates["title_en"] = data.title_en
    if data.description_en is not None: updates["description_en"] = data.description_en
    await db.collections.update_one({"id": collection_id}, {"$set": updates})
    return {"message": "Collection updated"}


@router.delete("/collections/{collection_id}")
async def delete_collection(collection_id: str, user=Depends(get_current_user)):
    col = await db.collections.find_one({"id": collection_id}, {"_id": 0})
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")
    if col["author_id"] != user["id"] and user["role"] not in ["admin", "moderator"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.collections.delete_one({"id": collection_id})
    await db.collection_progress.delete_many({"collection_id": collection_id})
    return {"message": "Collection deleted"}


# ─── Progress Tracking ───

@router.get("/collections/{slug}/progress")
async def get_collection_progress(slug: str, user=Depends(get_current_user)):
    col = await db.collections.find_one({"slug": slug}, {"_id": 0, "id": 1})
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")
    doc = await db.collection_progress.find_one(
        {"user_id": user["id"], "collection_id": col["id"]}, {"_id": 0}
    )
    completed = doc.get("completed_items", []) if doc else []
    return {"completed_items": completed}


@router.post("/collections/{slug}/progress")
async def toggle_collection_progress(slug: str, data: dict, user=Depends(get_current_user)):
    col = await db.collections.find_one({"slug": slug}, {"_id": 0, "id": 1, "items": 1})
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")
    content_id = data.get("content_id")
    if not content_id:
        raise HTTPException(status_code=400, detail="content_id required")
    # Verify content_id belongs to collection
    valid_ids = {item.get("content_id") for item in col.get("items", [])}
    if content_id not in valid_ids:
        raise HTTPException(status_code=400, detail="Content not in this collection")

    doc = await db.collection_progress.find_one(
        {"user_id": user["id"], "collection_id": col["id"]}, {"_id": 0}
    )
    completed = doc.get("completed_items", []) if doc else []
    now = datetime.now(timezone.utc).isoformat()

    if content_id in completed:
        completed.remove(content_id)
    else:
        completed.append(content_id)

    await db.collection_progress.update_one(
        {"user_id": user["id"], "collection_id": col["id"]},
        {"$set": {
            "user_id": user["id"],
            "collection_id": col["id"],
            "completed_items": completed,
            "updated_at": now,
        }},
        upsert=True
    )
    total = len(col.get("items", []))
    return {
        "completed_items": completed,
        "total": total,
        "percentage": round(len(completed) / total * 100) if total > 0 else 0,
    }
