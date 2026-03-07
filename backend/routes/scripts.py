"""Script library routes: CRUD, fork, versions, search."""
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query

from database import db
from deps import get_current_user, get_optional_user, require_2fa
from models import ScriptCreate, ScriptUpdate, VoteCreate
from services.reputation_service import update_reputation
from services.danger_check import check_destructive_commands

router = APIRouter()


@router.get("/scripts")
async def list_scripts(
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50),
    category: Optional[str] = None,
    language: Optional[str] = None,
    tag: Optional[str] = None,
    sort: str = Query("newest"),
    search: Optional[str] = None,
    content_lang: Optional[str] = None
):
    query = {}
    if category: query["category"] = category
    if language: query["language"] = language
    if tag: query["tags"] = tag
    if content_lang and content_lang in ("de", "en"):
        if content_lang == "en":
            query["$or"] = [{"content_language": "en"}, {"title_en": {"$ne": None}}]
        else:
            query.setdefault("$or", [{"content_language": "de"}, {"content_language": {"$exists": False}}])
    if search:
        search_or = [{"title": {"$regex": search, "$options": "i"}}, {"description": {"$regex": search, "$options": "i"}}, {"tags": {"$regex": search, "$options": "i"}}]
        if "$or" in query:
            existing_or = query.pop("$or")
            query["$and"] = [{"$or": existing_or}, {"$or": search_or}]
        else:
            query["$or"] = search_or
    sort_map = {"newest": [("created_at", -1)], "popular": [("vote_score", -1)], "most_copied": [("copy_count", -1)]}
    skip = (page - 1) * limit
    total = await db.scripts.count_documents(query)
    scripts = await db.scripts.find(query, {"_id": 0, "code": 0}).sort(sort_map.get(sort, [("created_at", -1)])).skip(skip).limit(limit).to_list(limit)
    return {"scripts": scripts, "total": total, "page": page, "pages": max(1, (total + limit - 1) // limit)}


@router.get("/scripts/search/quick")
async def quick_search_scripts(q: str = Query(..., min_length=1)):
    scripts = await db.scripts.find(
        {"title": {"$regex": q, "$options": "i"}},
        {"_id": 0, "id": 1, "title": 1, "language": 1, "author_username": 1}
    ).limit(10).to_list(10)
    return scripts


@router.get("/scripts/{script_id}")
async def get_script(script_id: str, user=Depends(get_optional_user)):
    script = await db.scripts.find_one({"id": script_id}, {"_id": 0})
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    await db.scripts.update_one({"id": script_id}, {"$inc": {"view_count": 1}})
    script["view_count"] = script.get("view_count", 0) + 1
    if user:
        vote = await db.votes.find_one({"user_id": user["id"], "target_id": script_id, "target_type": "script"}, {"_id": 0})
        script["user_vote"] = vote["value"] if vote else 0
    else:
        script["user_vote"] = 0
    return script


@router.post("/scripts", status_code=201)
async def create_script(data: ScriptCreate, user=Depends(get_current_user)):
    await require_2fa(user)
    sid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": sid, "title": data.title, "description": data.description, "code": data.code,
        "language": data.language, "category": data.category, "tags": data.tags,
        "author_id": user["id"], "author_username": user["username"],
        "vote_score": 0, "upvotes": 0, "downvotes": 0, "view_count": 0, "copy_count": 0,
        "version": 1, "forked_from": None,
        "content_language": data.content_language or "de",
        "title_en": data.title_en, "description_en": data.description_en,
        "forkable": data.forkable if user["role"] in ["admin", "moderator"] else True,
        "destructive_warnings": check_destructive_commands(data.code),
        "created_at": now, "updated_at": now
    }
    await db.scripts.insert_one(doc)
    await db.script_versions.insert_one({
        "id": str(uuid.uuid4()), "script_id": sid, "version_number": 1,
        "title": data.title, "description": data.description, "code": data.code,
        "language": data.language, "author_id": user["id"],
        "editor_comment": "Initial version", "created_at": now
    })
    await update_reputation(user["id"], 5, "script_shared")
    return {"id": sid, "message": "Script created"}


@router.put("/scripts/{script_id}")
async def update_script(script_id: str, data: ScriptUpdate, user=Depends(get_current_user)):
    script = await db.scripts.find_one({"id": script_id}, {"_id": 0})
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    if script["author_id"] != user["id"] and user["role"] not in ["moderator", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    now = datetime.now(timezone.utc).isoformat()
    updates = {"updated_at": now}
    has_content_change = False
    for field in ["title", "description", "code", "language", "category", "tags", "content_language", "title_en", "description_en"]:
        val = getattr(data, field, None)
        if val is not None:
            updates[field] = val
            if field in ["title", "description", "code", "language"]:
                has_content_change = True
    if data.forkable is not None and user["role"] in ["admin", "moderator"]:
        updates["forkable"] = data.forkable
    if has_content_change:
        new_version = script.get("version", 1) + 1
        updates["version"] = new_version
        updates["destructive_warnings"] = check_destructive_commands(updates.get("code", script.get("code", "")))
        await db.script_versions.insert_one({
            "id": str(uuid.uuid4()), "script_id": script_id, "version_number": new_version,
            "title": updates.get("title", script.get("title")),
            "description": updates.get("description", script.get("description")),
            "code": updates.get("code", script.get("code")),
            "language": updates.get("language", script.get("language")),
            "author_id": user["id"], "editor_comment": data.editor_comment or "", "created_at": now
        })
    await db.scripts.update_one({"id": script_id}, {"$set": updates})
    return {"message": "Script updated"}


@router.post("/scripts/{script_id}/vote")
async def vote_script(script_id: str, data: VoteCreate, user=Depends(get_current_user)):
    script = await db.scripts.find_one({"id": script_id}, {"_id": 0})
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    if script["author_id"] == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot vote on own script")
    existing = await db.votes.find_one({"user_id": user["id"], "target_id": script_id, "target_type": "script"}, {"_id": 0})
    score_change = 0
    upvote_inc = 0
    downvote_inc = 0
    if existing:
        old = existing["value"]
        if old == 1: upvote_inc -= 1
        elif old == -1: downvote_inc -= 1
        if data.value == 0:
            await db.votes.delete_one({"user_id": user["id"], "target_id": script_id, "target_type": "script"})
            score_change = -old
        else:
            await db.votes.update_one({"user_id": user["id"], "target_id": script_id, "target_type": "script"}, {"$set": {"value": data.value}})
            score_change = data.value - old
    else:
        if data.value != 0:
            await db.votes.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "target_id": script_id, "target_type": "script", "value": data.value, "created_at": datetime.now(timezone.utc).isoformat()})
            score_change = data.value
    if data.value == 1: upvote_inc += 1
    elif data.value == -1: downvote_inc += 1
    await db.scripts.update_one({"id": script_id}, {"$inc": {"vote_score": score_change, "upvotes": upvote_inc, "downvotes": downvote_inc}})
    updated = await db.scripts.find_one({"id": script_id}, {"_id": 0, "vote_score": 1, "upvotes": 1, "downvotes": 1})
    return {"vote_score": updated["vote_score"], "upvotes": updated["upvotes"], "downvotes": updated["downvotes"], "user_vote": data.value}


@router.post("/scripts/{script_id}/copy")
async def track_script_copy(script_id: str):
    await db.scripts.update_one({"id": script_id}, {"$inc": {"copy_count": 1}})
    return {"message": "Copy tracked"}


@router.post("/scripts/{script_id}/fork")
async def fork_script(script_id: str, user=Depends(get_current_user)):
    await require_2fa(user)
    original = await db.scripts.find_one({"id": script_id}, {"_id": 0})
    if not original:
        raise HTTPException(status_code=404, detail="Script not found")
    if original.get("forkable") is False:
        raise HTTPException(status_code=403, detail="This script cannot be forked")
    fork_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    fork_doc = {
        "id": fork_id, "title": f"{original['title']} (Fork)",
        "description": original.get("description", ""), "code": original.get("code", ""),
        "language": original.get("language", "bash"), "category": original.get("category", "utility"),
        "tags": original.get("tags", []),
        "author_id": user["id"], "author_username": user["username"],
        "vote_score": 0, "upvotes": 0, "downvotes": 0, "view_count": 0, "copy_count": 0,
        "version": 1,
        "forked_from": {"script_id": script_id, "title": original["title"], "author_username": original.get("author_username", "")},
        "created_at": now, "updated_at": now
    }
    await db.scripts.insert_one(fork_doc)
    await db.script_versions.insert_one({
        "id": str(uuid.uuid4()), "script_id": fork_id, "version_number": 1,
        "title": fork_doc["title"], "description": fork_doc["description"],
        "code": fork_doc["code"], "language": fork_doc["language"],
        "author_id": user["id"],
        "editor_comment": f"Forked from '{original['title']}' by {original.get('author_username', '')}",
        "created_at": now
    })
    if original.get("author_id") and original["author_id"] != user["id"]:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()), "user_id": original["author_id"],
            "type": "script_forked", "read": False,
            "data": {"script_id": script_id, "fork_id": fork_id, "forker": user["username"], "title": original["title"]},
            "created_at": now
        })
    return {"id": fork_id, "message": "Script forked"}


@router.get("/scripts/{script_id}/versions")
async def get_script_versions(script_id: str):
    versions = await db.script_versions.find({"script_id": script_id}, {"_id": 0}).sort("version_number", -1).to_list(100)
    return versions


@router.get("/scripts/{script_id}/forks")
async def get_script_forks(script_id: str):
    forks = await db.scripts.find(
        {"forked_from.script_id": script_id},
        {"_id": 0, "id": 1, "title": 1, "author_username": 1, "created_at": 1, "vote_score": 1}
    ).sort("created_at", -1).to_list(50)
    return forks


@router.get("/scripts/{script_id}/tutorials")
async def get_tutorials_referencing_script(script_id: str):
    articles = await db.articles.find(
        {"status": "published", "referenced_scripts": script_id},
        {"_id": 0, "id": 1, "title": 1, "slug": 1, "author_username": 1}
    ).to_list(20)
    return articles


@router.get("/scripts/{script_id}/danger-check")
async def danger_check_script(script_id: str):
    script = await db.scripts.find_one({"id": script_id}, {"_id": 0, "code": 1, "destructive_warnings": 1})
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    if "destructive_warnings" in script and script["destructive_warnings"] is not None:
        return {"warnings": script["destructive_warnings"]}
    warnings = check_destructive_commands(script.get("code", ""))
    await db.scripts.update_one({"id": script_id}, {"$set": {"destructive_warnings": warnings}})
    return {"warnings": warnings}
