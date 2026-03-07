"""Article routes: CRUD, fork, collaborators, comments, votes, versions, drafts, submit."""
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query

from database import db
from deps import get_current_user, get_optional_user, require_2fa
from models import (
    ArticleCreate, ArticleUpdate, CollaboratorAdd, CollaboratorUpdate,
    CommentCreate, VoteCreate,
)
from services.auth_service import generate_unique_slug
from services.reputation_service import update_reputation, check_and_award_badges
from services.notification_service import create_notification
from services.email_service import send_email_notification

router = APIRouter()


@router.get("/articles")
async def list_articles(
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50),
    difficulty: Optional[str] = None,
    category: Optional[str] = None,
    tag: Optional[str] = None,
    sort: str = Query("newest", pattern="^(newest|oldest|popular|most_voted)$"),
    search: Optional[str] = None,
    author: Optional[str] = None,
    lang: Optional[str] = None
):
    query = {"status": "published"}
    if difficulty:
        query["difficulty"] = difficulty
    if category:
        query["category"] = category
    if tag:
        query["tags"] = tag
    if author:
        query["author_username"] = author
    if lang and lang in ("de", "en"):
        query["$or"] = [{"language": lang}, {"language": {"$exists": False}}]
        if lang == "en":
            query["$or"] = [{"language": "en"}, {"content_markdown_en": {"$ne": None}}]
    if search:
        search_or = [
            {"title": {"$regex": search, "$options": "i"}},
            {"summary": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}}
        ]
        if "$or" in query:
            query = {"$and": [{"$or": query["$or"]}, {"$or": search_or}, {k: v for k, v in query.items() if k != "$or"}]}
        else:
            query["$or"] = search_or
    sort_map = {
        "newest": [("created_at", -1)], "oldest": [("created_at", 1)],
        "popular": [("view_count", -1)], "most_voted": [("vote_score", -1)]
    }
    skip = (page - 1) * limit
    total = await db.articles.count_documents(query)
    articles = await db.articles.find(query, {"_id": 0, "content_markdown": 0}).sort(sort_map.get(sort, [("created_at", -1)])).skip(skip).limit(limit).to_list(limit)
    return {"articles": articles, "total": total, "page": page, "pages": max(1, (total + limit - 1) // limit)}


@router.get("/articles/featured")
async def get_featured_articles():
    articles = await db.articles.find(
        {"status": "published"}, {"_id": 0, "content_markdown": 0}
    ).sort([("vote_score", -1), ("view_count", -1)]).limit(6).to_list(6)
    return {"articles": articles}


@router.get("/articles/{slug}")
async def get_article(slug: str, user=Depends(get_optional_user)):
    article = await db.articles.find_one({"slug": slug}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    await db.articles.update_one({"slug": slug}, {"$inc": {"view_count": 1}})
    article["view_count"] = article.get("view_count", 0) + 1
    if user:
        vote = await db.votes.find_one({"user_id": user["id"], "target_id": article["id"], "target_type": "article"}, {"_id": 0})
        article["user_vote"] = vote["value"] if vote else 0
    else:
        article["user_vote"] = 0
    return article


@router.post("/articles", status_code=201)
async def create_article(data: ArticleCreate, user=Depends(get_current_user)):
    await require_2fa(user)
    article_id = str(uuid.uuid4())
    slug = generate_unique_slug(data.title)
    now = datetime.now(timezone.utc).isoformat()
    initial_status = data.status if data.status in ["draft", "published"] else "draft"
    full_user = await db.users.find_one({"id": user["id"]}, {"_id": 0, "badges": 1})
    is_trusted = user["role"] in ["admin", "moderator"] or "trusted_voice" in (full_user.get("badges") or [])
    if initial_status == "published" and not is_trusted:
        initial_status = "submitted"
    article_doc = {
        "id": article_id, "title": data.title, "slug": slug,
        "content_markdown": data.content_markdown,
        "summary": data.summary or data.content_markdown[:200],
        "author_id": user["id"], "author_username": user["username"],
        "category": data.category, "difficulty": data.difficulty, "tags": data.tags,
        "status": initial_status, "review_feedback": None, "reviewer_id": None,
        "vote_score": 0, "upvotes": 0, "downvotes": 0, "view_count": 0, "comment_count": 0,
        "version": 1, "referenced_scripts": [],
        "language": data.language or "de",
        "title_en": data.title_en, "content_markdown_en": data.content_markdown_en, "summary_en": data.summary_en,
        "forkable": data.forkable if user["role"] in ["admin", "moderator"] else True,
        "collaborators": [],
        "created_at": now, "updated_at": now
    }
    await db.articles.insert_one(article_doc)
    await db.article_versions.insert_one({
        "id": str(uuid.uuid4()), "article_id": article_id, "version_number": 1,
        "content_markdown": data.content_markdown, "author_id": user["id"],
        "editor_comment": "Initial version", "created_at": now
    })
    await db.users.update_one({"id": user["id"]}, {"$inc": {"article_count": 1}})
    if initial_status == "published":
        await update_reputation(user["id"], 10, "article_published")
    await check_and_award_badges(user["id"])
    return {"id": article_id, "slug": slug, "status": initial_status, "message": "Article created"}


@router.put("/articles/{article_id}")
async def update_article(article_id: str, data: ArticleUpdate, user=Depends(get_current_user)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    is_author = article["author_id"] == user["id"]
    collab = next((c for c in article.get("collaborators", []) if c["user_id"] == user["id"]), None)
    is_editor = collab and collab.get("can_edit", False)
    is_mod = user["role"] in ["moderator", "admin"]
    if not is_author and not is_editor and not is_mod:
        raise HTTPException(status_code=403, detail="Not authorized")
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if data.title:
        updates["title"] = data.title
    if data.content_markdown:
        updates["content_markdown"] = data.content_markdown
        updates["version"] = article.get("version", 1) + 1
        await db.article_versions.insert_one({
            "id": str(uuid.uuid4()), "article_id": article_id,
            "version_number": updates["version"], "content_markdown": data.content_markdown,
            "author_id": user["id"], "author_username": user["username"],
            "editor_comment": data.editor_comment or "", "created_at": updates["updated_at"]
        })
    if data.category:
        updates["category"] = data.category
    if data.difficulty:
        updates["difficulty"] = data.difficulty
    if data.tags is not None:
        updates["tags"] = data.tags
    if data.summary:
        updates["summary"] = data.summary
    if data.referenced_scripts is not None:
        updates["referenced_scripts"] = data.referenced_scripts
    if data.language:
        updates["language"] = data.language
    if data.title_en is not None:
        updates["title_en"] = data.title_en
    if data.content_markdown_en is not None:
        updates["content_markdown_en"] = data.content_markdown_en
    if data.summary_en is not None:
        updates["summary_en"] = data.summary_en
    if data.forkable is not None and user["role"] in ["admin", "moderator"]:
        updates["forkable"] = data.forkable
    if data.status:
        full_u = await db.users.find_one({"id": user["id"]}, {"_id": 0, "badges": 1})
        can_publish = user["role"] in ["admin", "moderator"] or "trusted_voice" in (full_u.get("badges") or [])
        if data.status == "published" and not can_publish:
            updates["status"] = "submitted"
        else:
            updates["status"] = data.status
        if updates.get("status") == "published" and article.get("status") != "published":
            await update_reputation(user["id"], 10, "article_published")
    await db.articles.update_one({"id": article_id}, {"$set": updates})
    return {"message": "Article updated"}


@router.delete("/articles/{article_id}")
async def delete_article(article_id: str, user=Depends(get_current_user)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    if article["author_id"] != user["id"] and user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")


@router.post("/articles/{article_id}/fork")
async def fork_article(article_id: str, user=Depends(get_current_user)):
    original = await db.articles.find_one({"id": article_id, "status": "published"}, {"_id": 0})
    if not original:
        raise HTTPException(status_code=404, detail="Article not found")
    if original.get("forkable") is False:
        raise HTTPException(status_code=403, detail="This article cannot be forked")
    fork_id = str(uuid.uuid4())
    fork_title = f"{original['title']} (Fork)"
    fork_slug = generate_unique_slug(fork_title)
    now = datetime.now(timezone.utc).isoformat()
    fork_doc = {
        "id": fork_id, "title": fork_title, "slug": fork_slug,
        "content_markdown": original["content_markdown"],
        "summary": original.get("summary", ""),
        "author_id": user["id"], "author_username": user["username"],
        "category": original["category"], "difficulty": original["difficulty"],
        "tags": original.get("tags", []),
        "status": "draft", "review_feedback": None, "reviewer_id": None,
        "vote_score": 0, "upvotes": 0, "downvotes": 0, "view_count": 0, "comment_count": 0,
        "version": 1,
        "forked_from": {
            "article_id": article_id, "title": original["title"],
            "slug": original["slug"], "author_username": original["author_username"]
        },
        "created_at": now, "updated_at": now
    }
    await db.articles.insert_one(fork_doc)
    await db.article_versions.insert_one({
        "id": str(uuid.uuid4()), "article_id": fork_id, "version_number": 1,
        "content_markdown": original["content_markdown"], "author_id": user["id"],
        "editor_comment": f"Forked from '{original['title']}' by {original['author_username']}",
        "created_at": now
    })
    await db.users.update_one({"id": user["id"]}, {"$inc": {"article_count": 1}})
    if original["author_id"] != user["id"]:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()), "user_id": original["author_id"],
            "message": f"{user['username']} forked your article \"{original['title']}\"",
            "link": f"/editor/{fork_id}", "read": False, "created_at": now
        })
    return {"id": fork_id, "slug": fork_slug, "message": "Article forked as draft"}


# ─── Collaboration Routes ───
@router.get("/articles/{article_id}/collaborators")
async def get_collaborators(article_id: str):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0, "collaborators": 1, "author_id": 1, "author_username": 1})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return {"author": {"user_id": article["author_id"], "username": article.get("author_username", "")}, "collaborators": article.get("collaborators", [])}


@router.post("/articles/{article_id}/collaborators")
async def add_collaborator(article_id: str, data: CollaboratorAdd, user=Depends(get_current_user)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    is_author = article["author_id"] == user["id"]
    collab = next((c for c in article.get("collaborators", []) if c["user_id"] == user["id"]), None)
    can_invite = is_author or (collab and collab.get("can_invite", False)) or user["role"] in ["admin", "moderator"]
    if not can_invite:
        raise HTTPException(status_code=403, detail="Not authorized to invite collaborators")
    target = await db.users.find_one({"username_lower": data.username.lower()}, {"_id": 0, "id": 1, "username": 1})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target["id"] == article["author_id"]:
        raise HTTPException(status_code=400, detail="Cannot add author as collaborator")
    existing = next((c for c in article.get("collaborators", []) if c["user_id"] == target["id"]), None)
    if existing:
        raise HTTPException(status_code=400, detail="User is already a collaborator")
    collab_doc = {
        "user_id": target["id"], "username": target["username"],
        "can_edit": data.can_edit, "can_publish": data.can_publish,
        "can_invite": data.can_invite, "can_delete": data.can_delete,
        "added_at": datetime.now(timezone.utc).isoformat(), "added_by": user["username"]
    }
    await db.articles.update_one({"id": article_id}, {"$push": {"collaborators": collab_doc}})
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "type": "collaboration_invite", "user_id": target["id"],
        "message": f"{user['username']} hat dich als Mitarbeiter zum Artikel \"{article['title']}\" hinzugefuegt",
        "link": f"/editor/{article_id}", "read": False, "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Collaborator added", "collaborator": collab_doc}


@router.put("/articles/{article_id}/collaborators/{target_user_id}")
async def update_collaborator(article_id: str, target_user_id: str, data: CollaboratorUpdate, user=Depends(get_current_user)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    if article["author_id"] != user["id"] and user["role"] not in ["admin", "moderator"]:
        raise HTTPException(status_code=403, detail="Only the author can update permissions")
    collab = next((c for c in article.get("collaborators", []) if c["user_id"] == target_user_id), None)
    if not collab:
        raise HTTPException(status_code=404, detail="Collaborator not found")
    await db.articles.update_one(
        {"id": article_id, "collaborators.user_id": target_user_id},
        {"$set": {
            "collaborators.$.can_edit": data.can_edit,
            "collaborators.$.can_publish": data.can_publish,
            "collaborators.$.can_invite": data.can_invite,
            "collaborators.$.can_delete": data.can_delete
        }}
    )
    return {"message": "Permissions updated"}


@router.delete("/articles/{article_id}/collaborators/{target_user_id}")
async def remove_collaborator(article_id: str, target_user_id: str, user=Depends(get_current_user)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    is_author = article["author_id"] == user["id"]
    is_self = target_user_id == user["id"]
    is_mod = user["role"] in ["admin", "moderator"]
    if not is_author and not is_self and not is_mod:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.articles.update_one({"id": article_id}, {"$pull": {"collaborators": {"user_id": target_user_id}}})
    return {"message": "Collaborator removed"}


@router.get("/articles/{article_id}/forks")
async def get_article_forks(article_id: str):
    forks = await db.articles.find(
        {"forked_from.article_id": article_id}, {"_id": 0, "content_markdown": 0}
    ).sort([("created_at", -1)]).limit(20).to_list(20)
    return {"forks": forks, "count": len(forks)}


# ─── Vote Routes ───
@router.post("/articles/{article_id}/vote")
async def vote_article(article_id: str, data: VoteCreate, user=Depends(get_current_user)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    if article["author_id"] == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot vote on own article")
    existing_vote = await db.votes.find_one({"user_id": user["id"], "target_id": article_id, "target_type": "article"}, {"_id": 0})
    if existing_vote:
        old_value = existing_vote["value"]
        if data.value == 0:
            await db.votes.delete_one({"user_id": user["id"], "target_id": article_id, "target_type": "article"})
            score_change = -old_value
        else:
            await db.votes.update_one({"user_id": user["id"], "target_id": article_id, "target_type": "article"}, {"$set": {"value": data.value}})
            score_change = data.value - old_value
    else:
        if data.value != 0:
            await db.votes.insert_one({
                "id": str(uuid.uuid4()), "user_id": user["id"], "target_id": article_id,
                "target_type": "article", "value": data.value, "created_at": datetime.now(timezone.utc).isoformat()
            })
            score_change = data.value
        else:
            score_change = 0
    upvote_inc = 0
    downvote_inc = 0
    if existing_vote:
        if existing_vote["value"] == 1: upvote_inc -= 1
        elif existing_vote["value"] == -1: downvote_inc -= 1
    if data.value == 1: upvote_inc += 1
    elif data.value == -1: downvote_inc += 1
    await db.articles.update_one({"id": article_id}, {"$inc": {"vote_score": score_change, "upvotes": upvote_inc, "downvotes": downvote_inc}})
    if score_change > 0:
        await update_reputation(article["author_id"], 2, "article_upvoted")
    elif score_change < 0:
        await update_reputation(article["author_id"], -1, "article_downvoted")
    updated = await db.articles.find_one({"id": article_id}, {"_id": 0, "vote_score": 1, "upvotes": 1, "downvotes": 1})
    return {"vote_score": updated["vote_score"], "upvotes": updated["upvotes"], "downvotes": updated["downvotes"], "user_vote": data.value}


# ─── Comment Routes ───
@router.get("/articles/{article_id}/comments")
async def get_comments(article_id: str, user=Depends(get_optional_user)):
    comments = await db.comments.find({"article_id": article_id}, {"_id": 0}).sort([("created_at", 1)]).to_list(500)
    if user:
        comment_ids = [c["id"] for c in comments]
        user_votes = await db.votes.find({"user_id": user["id"], "target_id": {"$in": comment_ids}, "target_type": "comment"}, {"_id": 0}).to_list(500)
        vote_map = {v["target_id"]: v["value"] for v in user_votes}
        for c in comments:
            c["user_vote"] = vote_map.get(c["id"], 0)
    else:
        for c in comments:
            c["user_vote"] = 0
    return {"comments": comments}


@router.post("/articles/{article_id}/comments")
async def create_comment(article_id: str, data: CommentCreate, user=Depends(get_current_user)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    comment_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    comment_doc = {
        "id": comment_id, "article_id": article_id, "author_id": user["id"],
        "author_username": user["username"], "content": data.content, "parent_id": data.parent_id,
        "vote_score": 0, "upvotes": 0, "downvotes": 0, "created_at": now
    }
    await db.comments.insert_one(comment_doc)
    await db.articles.update_one({"id": article_id}, {"$inc": {"comment_count": 1}})
    await db.users.update_one({"id": user["id"]}, {"$inc": {"comment_count": 1}})
    await update_reputation(user["id"], 2, "comment_posted")
    await check_and_award_badges(user["id"])
    if article["author_id"] != user["id"]:
        await create_notification(article["author_id"], "new_comment", "New Comment",
            f"{user['username']} commented on '{article['title'][:50]}'", f"/article/{article['slug']}")
        c_author = await db.users.find_one({"id": article["author_id"]}, {"_id": 0})
        if c_author:
            await send_email_notification("new_comment", c_author, {"username": c_author["username"], "commenter": user["username"], "article_title": article["title"]})
    return {
        "id": comment_id, "article_id": article_id, "author_id": user["id"],
        "author_username": user["username"], "content": data.content, "parent_id": data.parent_id,
        "vote_score": 0, "upvotes": 0, "downvotes": 0, "user_vote": 0, "created_at": now
    }


@router.post("/comments/{comment_id}/vote")
async def vote_comment(comment_id: str, data: VoteCreate, user=Depends(get_current_user)):
    comment = await db.comments.find_one({"id": comment_id}, {"_id": 0})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    existing_vote = await db.votes.find_one({"user_id": user["id"], "target_id": comment_id, "target_type": "comment"}, {"_id": 0})
    if existing_vote:
        old_value = existing_vote["value"]
        if data.value == 0:
            await db.votes.delete_one({"user_id": user["id"], "target_id": comment_id, "target_type": "comment"})
            score_change = -old_value
        else:
            await db.votes.update_one({"user_id": user["id"], "target_id": comment_id, "target_type": "comment"}, {"$set": {"value": data.value}})
            score_change = data.value - old_value
    else:
        if data.value != 0:
            await db.votes.insert_one({
                "id": str(uuid.uuid4()), "user_id": user["id"], "target_id": comment_id,
                "target_type": "comment", "value": data.value, "created_at": datetime.now(timezone.utc).isoformat()
            })
            score_change = data.value
        else:
            score_change = 0
    upvote_inc = 0
    downvote_inc = 0
    if existing_vote:
        if existing_vote["value"] == 1: upvote_inc -= 1
        elif existing_vote["value"] == -1: downvote_inc -= 1
    if data.value == 1: upvote_inc += 1
    elif data.value == -1: downvote_inc += 1
    await db.comments.update_one({"id": comment_id}, {"$inc": {"vote_score": score_change, "upvotes": upvote_inc, "downvotes": downvote_inc}})
    updated = await db.comments.find_one({"id": comment_id}, {"_id": 0, "vote_score": 1, "upvotes": 1, "downvotes": 1})
    return {"vote_score": updated["vote_score"], "upvotes": updated["upvotes"], "downvotes": updated["downvotes"], "user_vote": data.value}


# ─── Article Workflow ───
@router.post("/articles/{article_id}/submit")
async def submit_for_review(article_id: str, user=Depends(get_current_user)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    if article["author_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    if article["status"] not in ["draft", "rejected"]:
        raise HTTPException(status_code=400, detail="Article cannot be submitted in current state")
    await db.articles.update_one({"id": article_id}, {"$set": {
        "status": "submitted", "review_feedback": None, "updated_at": datetime.now(timezone.utc).isoformat()
    }})
    return {"message": "Article submitted for review", "status": "submitted"}


@router.get("/articles/{article_id}/versions")
async def get_article_versions(article_id: str):
    versions = await db.article_versions.find(
        {"article_id": article_id}, {"_id": 0, "content_markdown": 0}
    ).sort([("version_number", -1)]).to_list(100)
    return {"versions": versions}


@router.get("/articles/{article_id}/versions/{version_number}")
async def get_article_version(article_id: str, version_number: int):
    version = await db.article_versions.find_one(
        {"article_id": article_id, "version_number": version_number}, {"_id": 0}
    )
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    return version


@router.get("/users/me/drafts")
async def get_my_drafts(user=Depends(get_current_user)):
    drafts = await db.articles.find(
        {"$or": [
            {"author_id": user["id"], "status": {"$in": ["draft", "submitted", "rejected"]}},
            {"collaborators.user_id": user["id"], "status": {"$in": ["draft", "submitted", "rejected"]}}
        ]},
        {"_id": 0, "content_markdown": 0}
    ).sort([("updated_at", -1)]).to_list(50)
    return {"articles": drafts}
