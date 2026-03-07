"""Moderation routes: queue, review, actions, content deletion, reports."""
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query

from database import db
from deps import get_current_user, require_moderator
from models import ModerationAction, ReportCreate
from services.reputation_service import update_reputation
from services.notification_service import create_notification
from services.email_service import send_email_notification

router = APIRouter()


@router.get("/mod/queue")
async def get_moderation_queue(user=Depends(get_current_user)):
    require_moderator(user)
    submitted = await db.articles.find({"status": "submitted"}, {"_id": 0, "content_markdown": 0}).sort([("created_at", 1)]).to_list(50)
    in_review = await db.articles.find({"status": "in_review"}, {"_id": 0, "content_markdown": 0}).sort([("updated_at", 1)]).to_list(50)
    return {"submitted": submitted, "in_review": in_review, "total": len(submitted) + len(in_review)}


@router.post("/mod/articles/{article_id}/claim")
async def claim_review(article_id: str, user=Depends(get_current_user)):
    require_moderator(user)
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    if article["status"] != "submitted":
        raise HTTPException(status_code=400, detail="Article is not in submitted state")
    await db.articles.update_one({"id": article_id}, {"$set": {
        "status": "in_review", "reviewer_id": user["id"], "updated_at": datetime.now(timezone.utc).isoformat()
    }})
    await create_notification(article["author_id"], "review_started", "Review Started",
        f"Your article '{article['title']}' is being reviewed.", f"/article/{article['slug']}")
    return {"message": "Review claimed", "status": "in_review"}


@router.post("/mod/articles/{article_id}/action")
async def moderate_article(article_id: str, data: ModerationAction, user=Depends(get_current_user)):
    require_moderator(user)
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    if article["status"] not in ["submitted", "in_review"]:
        raise HTTPException(status_code=400, detail="Article is not pending review")
    now = datetime.now(timezone.utc).isoformat()
    await db.mod_actions.insert_one({
        "id": str(uuid.uuid4()), "article_id": article_id,
        "moderator_id": user["id"], "moderator_username": user["username"],
        "action": data.action, "reason": data.reason, "created_at": now
    })
    if data.action == "approve":
        await db.articles.update_one({"id": article_id}, {"$set": {"status": "published", "review_feedback": None, "updated_at": now}})
        await update_reputation(article["author_id"], 10, "article_approved")
        await create_notification(article["author_id"], "article_approved", "Article Approved",
            f"Your article '{article['title']}' has been approved and published!", f"/article/{article['slug']}")
        author = await db.users.find_one({"id": article["author_id"]}, {"_id": 0})
        if author:
            await send_email_notification("article_approved", author, {"username": author["username"], "article_title": article["title"], "article_url": f"/article/{article['slug']}"})
        return {"message": "Article approved and published", "status": "published"}
    elif data.action == "reject":
        await db.articles.update_one({"id": article_id}, {"$set": {"status": "rejected", "review_feedback": data.reason, "updated_at": now}})
        await create_notification(article["author_id"], "article_rejected", "Article Rejected",
            f"Your article '{article['title']}' needs revision: {data.reason or 'No reason given'}", f"/editor/{article_id}")
        author = await db.users.find_one({"id": article["author_id"]}, {"_id": 0})
        if author:
            await send_email_notification("article_rejected", author, {"username": author["username"], "article_title": article["title"], "reason": data.reason or ""})
        return {"message": "Article rejected", "status": "rejected"}
    elif data.action == "request_changes":
        await db.articles.update_one({"id": article_id}, {"$set": {"status": "rejected", "review_feedback": data.reason, "updated_at": now}})
        await create_notification(article["author_id"], "changes_requested", "Changes Requested",
            f"Please update '{article['title']}': {data.reason or ''}", f"/editor/{article_id}")
        return {"message": "Changes requested", "status": "rejected"}


@router.get("/mod/stats")
async def get_mod_stats(user=Depends(get_current_user)):
    require_moderator(user)
    pending = await db.articles.count_documents({"status": "submitted"})
    in_review = await db.articles.count_documents({"status": "in_review"})
    approved_today = await db.mod_actions.count_documents({
        "action": "approve", "created_at": {"$gte": (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()}
    })
    total_actions = await db.mod_actions.count_documents({})
    recent_actions = await db.mod_actions.find({}, {"_id": 0}).sort([("created_at", -1)]).limit(20).to_list(20)
    return {"pending": pending, "in_review": in_review, "approved_today": approved_today, "total_actions": total_actions, "recent_actions": recent_actions}


@router.get("/mod/article/{article_id}")
async def get_mod_article_detail(article_id: str, user=Depends(get_current_user)):
    require_moderator(user)
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    history = await db.mod_actions.find({"article_id": article_id}, {"_id": 0}).sort([("created_at", -1)]).to_list(50)
    return {"article": article, "moderation_history": history}


# ─── Content Deletion ───
@router.delete("/mod/articles/{article_id}")
async def mod_delete_article(article_id: str, user=Depends(get_current_user)):
    require_moderator(user)
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    await db.articles.delete_one({"id": article_id})
    await db.comments.delete_many({"article_id": article_id})
    await db.votes.delete_many({"target_id": article_id})
    return {"message": "Article deleted"}


@router.delete("/mod/comments/{comment_id}")
async def mod_delete_comment(comment_id: str, user=Depends(get_current_user)):
    require_moderator(user)
    result = await db.comments.delete_one({"id": comment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Comment not found")
    return {"message": "Comment deleted"}


@router.delete("/mod/questions/{question_id}")
async def mod_delete_question(question_id: str, user=Depends(get_current_user)):
    require_moderator(user)
    question = await db.questions.find_one({"id": question_id}, {"_id": 0})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    await db.questions.delete_one({"id": question_id})
    await db.answers.delete_many({"question_id": question_id})
    await db.votes.delete_many({"target_id": question_id})
    return {"message": "Question deleted"}


@router.delete("/mod/answers/{answer_id}")
async def mod_delete_answer(answer_id: str, user=Depends(get_current_user)):
    require_moderator(user)
    result = await db.answers.delete_one({"id": answer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Answer not found")
    return {"message": "Answer deleted"}


@router.delete("/mod/scripts/{script_id}")
async def mod_delete_script(script_id: str, user=Depends(get_current_user)):
    require_moderator(user)
    result = await db.scripts.delete_one({"id": script_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Script not found")
    return {"message": "Script deleted"}


# ─── Reports ───
@router.post("/reports", status_code=201)
async def create_report(data: ReportCreate, user=Depends(get_current_user)):
    existing = await db.reports.find_one({"reporter_id": user["id"], "target_id": data.target_id, "target_type": data.target_type})
    if existing:
        raise HTTPException(status_code=409, detail="Already reported")
    rid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    await db.reports.insert_one({
        "id": rid, "reporter_id": user["id"], "reporter_username": user["username"],
        "target_type": data.target_type, "target_id": data.target_id,
        "reason": data.reason, "category": data.category,
        "status": "open", "resolved_by": None, "resolution": None, "created_at": now
    })
    return {"id": rid, "message": "Report submitted"}


@router.get("/mod/reports")
async def get_reports(user=Depends(get_current_user), status_filter: str = Query("open")):
    require_moderator(user)
    query = {}
    if status_filter != "all":
        query["status"] = status_filter
    reports = await db.reports.find(query, {"_id": 0}).sort([("created_at", -1)]).limit(50).to_list(50)
    open_count = await db.reports.count_documents({"status": "open"})
    return {"reports": reports, "open_count": open_count}


@router.put("/mod/reports/{report_id}/resolve")
async def resolve_report(report_id: str, user=Depends(get_current_user)):
    require_moderator(user)
    await db.reports.update_one({"id": report_id}, {"$set": {"status": "resolved", "resolved_by": user["id"], "resolution": "reviewed"}})
    return {"message": "Report resolved"}
