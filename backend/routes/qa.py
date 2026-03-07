"""Q&A routes: questions, answers, voting, stats, bug reports."""
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query, Body

from database import db
from deps import get_current_user, get_optional_user, require_2fa, require_moderator
from models import QuestionCreate, QuestionUpdate, AnswerCreate, VoteCreate
from services.reputation_service import update_reputation, check_and_award_badges
from services.notification_service import create_notification
from services.email_service import send_email_notification

router = APIRouter()


@router.get("/questions")
async def list_questions(
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=50),
    tag: Optional[str] = None,
    sort: str = Query("newest"),
    search: Optional[str] = None,
    status: Optional[str] = None,
    lang: Optional[str] = None,
    bug_reports: Optional[bool] = None
):
    query = {}
    if bug_reports:
        query["is_bug_report"] = True
    else:
        query["is_bug_report"] = {"$ne": True}
    if tag:
        query["tags"] = tag
    if lang and lang in ("de", "en"):
        if lang == "en":
            query.setdefault("$or", [{"language": "en"}, {"title_en": {"$ne": None}}])
        else:
            query.setdefault("$or", [{"language": "de"}, {"language": {"$exists": False}}])
    if search:
        search_or = [{"title": {"$regex": search, "$options": "i"}}, {"body_markdown": {"$regex": search, "$options": "i"}}]
        if "$or" in query:
            existing_or = query.pop("$or")
            query["$and"] = [{"$or": existing_or}, {"$or": search_or}]
        else:
            query["$or"] = search_or
    if status == "unanswered":
        query["answer_count"] = 0
    elif status == "answered":
        query["answer_count"] = {"$gt": 0}
    elif status == "solved":
        query["accepted_answer_id"] = {"$ne": None}
    sort_map = {
        "newest": [("created_at", -1)], "oldest": [("created_at", 1)],
        "popular": [("view_count", -1)], "most_voted": [("vote_score", -1)],
        "unanswered": [("answer_count", 1), ("created_at", -1)]
    }
    skip = (page - 1) * limit
    total = await db.questions.count_documents(query)
    questions = await db.questions.find(query, {"_id": 0, "body_markdown": 0}).sort(sort_map.get(sort, [("created_at", -1)])).skip(skip).limit(limit).to_list(limit)
    return {"questions": questions, "total": total, "page": page, "pages": max(1, (total + limit - 1) // limit)}


@router.get("/questions/stats/overview")
async def get_qa_stats():
    qa_filter = {"is_bug_report": {"$ne": True}}
    total = await db.questions.count_documents(qa_filter)
    unanswered = await db.questions.count_documents({**qa_filter, "answer_count": 0})
    solved = await db.questions.count_documents({**qa_filter, "accepted_answer_id": {"$ne": None}})
    bug_total = await db.questions.count_documents({"is_bug_report": True})
    bug_open = await db.questions.count_documents({"is_bug_report": True, "bug_status": "open"})
    bug_confirmed = await db.questions.count_documents({"is_bug_report": True, "bug_status": "confirmed"})
    bug_fixed = await db.questions.count_documents({"is_bug_report": True, "bug_status": "fixed"})
    return {"total": total, "unanswered": unanswered, "solved": solved, "bugs": {"total": bug_total, "open": bug_open, "confirmed": bug_confirmed, "fixed": bug_fixed}}


@router.get("/questions/{question_id}")
async def get_question(question_id: str, user=Depends(get_optional_user)):
    question = await db.questions.find_one({"id": question_id}, {"_id": 0})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    await db.questions.update_one({"id": question_id}, {"$inc": {"view_count": 1}})
    question["view_count"] = question.get("view_count", 0) + 1
    answers = await db.answers.find({"question_id": question_id}, {"_id": 0}).sort([("accepted", -1), ("vote_score", -1), ("created_at", 1)]).to_list(100)
    if user:
        vote = await db.votes.find_one({"user_id": user["id"], "target_id": question_id, "target_type": "question"}, {"_id": 0})
        question["user_vote"] = vote["value"] if vote else 0
        answer_ids = [a["id"] for a in answers]
        answer_votes = await db.votes.find({"user_id": user["id"], "target_id": {"$in": answer_ids}, "target_type": "answer"}, {"_id": 0}).to_list(100)
        avote_map = {v["target_id"]: v["value"] for v in answer_votes}
        for a in answers:
            a["user_vote"] = avote_map.get(a["id"], 0)
    else:
        question["user_vote"] = 0
        for a in answers:
            a["user_vote"] = 0
    return {"question": question, "answers": answers}


@router.post("/questions", status_code=201)
async def create_question(data: QuestionCreate, user=Depends(get_current_user)):
    await require_2fa(user)
    qid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    is_bug = "archhub-bug" in data.tags or "bug-report" in data.tags
    doc = {
        "id": qid, "title": data.title, "body_markdown": data.body_markdown, "tags": data.tags,
        "author_id": user["id"], "author_username": user["username"],
        "vote_score": 0, "upvotes": 0, "downvotes": 0, "view_count": 0, "answer_count": 0,
        "accepted_answer_id": None,
        "is_bug_report": is_bug, "bug_status": "open" if is_bug else None,
        "language": data.language or "de", "title_en": data.title_en, "body_markdown_en": data.body_markdown_en,
        "system_metadata": {
            "kernel_version": data.kernel_version,
            "gpu_vendor": data.gpu_vendor,
            "cpu_vendor": data.cpu_vendor,
            "desktop_environment": data.desktop_environment,
            "init_system": data.init_system,
        },
        "created_at": now, "updated_at": now
    }
    await db.questions.insert_one(doc)
    await update_reputation(user["id"], 2, "question_asked")
    await check_and_award_badges(user["id"])
    return {"id": qid, "message": "Question created"}


@router.put("/questions/{question_id}")
async def update_question(question_id: str, data: QuestionUpdate, user=Depends(get_current_user)):
    question = await db.questions.find_one({"id": question_id}, {"_id": 0})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    if question["author_id"] != user["id"] and user["role"] not in ["moderator", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if data.title: updates["title"] = data.title
    if data.body_markdown: updates["body_markdown"] = data.body_markdown
    if data.tags is not None: updates["tags"] = data.tags
    if data.language: updates["language"] = data.language
    if data.title_en is not None: updates["title_en"] = data.title_en
    if data.body_markdown_en is not None: updates["body_markdown_en"] = data.body_markdown_en
    meta_updates = {}
    for field in ["kernel_version", "gpu_vendor", "cpu_vendor", "desktop_environment", "init_system"]:
        val = getattr(data, field, None)
        if val is not None:
            meta_updates[f"system_metadata.{field}"] = val
    if meta_updates:
        updates.update(meta_updates)
    await db.questions.update_one({"id": question_id}, {"$set": updates})
    return {"message": "Question updated"}


@router.post("/questions/{question_id}/vote")
async def vote_question(question_id: str, data: VoteCreate, user=Depends(get_current_user)):
    question = await db.questions.find_one({"id": question_id}, {"_id": 0})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    if question["author_id"] == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot vote on own question")
    existing = await db.votes.find_one({"user_id": user["id"], "target_id": question_id, "target_type": "question"}, {"_id": 0})
    score_change = 0
    upvote_inc = 0
    downvote_inc = 0
    if existing:
        old = existing["value"]
        if old == 1: upvote_inc -= 1
        elif old == -1: downvote_inc -= 1
        if data.value == 0:
            await db.votes.delete_one({"user_id": user["id"], "target_id": question_id, "target_type": "question"})
            score_change = -old
        else:
            await db.votes.update_one({"user_id": user["id"], "target_id": question_id, "target_type": "question"}, {"$set": {"value": data.value}})
            score_change = data.value - old
    else:
        if data.value != 0:
            await db.votes.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "target_id": question_id, "target_type": "question", "value": data.value, "created_at": datetime.now(timezone.utc).isoformat()})
            score_change = data.value
    if data.value == 1: upvote_inc += 1
    elif data.value == -1: downvote_inc += 1
    await db.questions.update_one({"id": question_id}, {"$inc": {"vote_score": score_change, "upvotes": upvote_inc, "downvotes": downvote_inc}})
    if score_change > 0:
        await update_reputation(question["author_id"], 2, "question_upvoted")
    updated = await db.questions.find_one({"id": question_id}, {"_id": 0, "vote_score": 1, "upvotes": 1, "downvotes": 1})
    return {"vote_score": updated["vote_score"], "upvotes": updated["upvotes"], "downvotes": updated["downvotes"], "user_vote": data.value}


# ─── Answer Routes ───
@router.post("/questions/{question_id}/answers", status_code=201)
async def create_answer(question_id: str, data: AnswerCreate, user=Depends(get_current_user)):
    await require_2fa(user)
    question = await db.questions.find_one({"id": question_id}, {"_id": 0})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    aid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": aid, "question_id": question_id, "body_markdown": data.body_markdown,
        "author_id": user["id"], "author_username": user["username"],
        "vote_score": 0, "upvotes": 0, "downvotes": 0, "accepted": False,
        "created_at": now, "updated_at": now
    }
    await db.answers.insert_one(doc)
    await db.questions.update_one({"id": question_id}, {"$inc": {"answer_count": 1}})
    await update_reputation(user["id"], 5, "answer_posted")
    await check_and_award_badges(user["id"])
    if question["author_id"] != user["id"]:
        await create_notification(question["author_id"], "new_answer", "New Answer",
            f"{user['username']} answered your question '{question['title'][:50]}'", f"/questions/{question_id}")
        q_author = await db.users.find_one({"id": question["author_id"]}, {"_id": 0})
        if q_author:
            await send_email_notification("new_answer", q_author, {"username": q_author["username"], "answerer": user["username"], "question_title": question["title"]})
    return {"id": aid, "question_id": question_id, "author_username": user["username"], "body_markdown": data.body_markdown, "vote_score": 0, "upvotes": 0, "downvotes": 0, "accepted": False, "user_vote": 0, "created_at": now, "updated_at": now}


@router.post("/answers/{answer_id}/accept")
async def accept_answer(answer_id: str, user=Depends(get_current_user)):
    answer = await db.answers.find_one({"id": answer_id}, {"_id": 0})
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")
    question = await db.questions.find_one({"id": answer["question_id"]}, {"_id": 0})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    if question["author_id"] != user["id"] and user["role"] not in ["admin", "moderator"]:
        raise HTTPException(status_code=403, detail="Only the question author or moderators can accept answers")
    if question.get("accepted_answer_id"):
        await db.answers.update_one({"id": question["accepted_answer_id"]}, {"$set": {"accepted": False}})
    toggle = not answer.get("accepted", False)
    await db.answers.update_one({"id": answer_id}, {"$set": {"accepted": toggle}})
    await db.questions.update_one({"id": answer["question_id"]}, {"$set": {"accepted_answer_id": answer_id if toggle else None}})
    if toggle:
        await update_reputation(answer["author_id"], 15, "answer_accepted")
        await check_and_award_badges(answer["author_id"])
        await create_notification(answer["author_id"], "answer_accepted", "Answer Accepted!",
            f"Your answer was accepted on '{question['title'][:50]}'", f"/questions/{answer['question_id']}")
    return {"accepted": toggle}


@router.post("/answers/{answer_id}/vote")
async def vote_answer(answer_id: str, data: VoteCreate, user=Depends(get_current_user)):
    answer = await db.answers.find_one({"id": answer_id}, {"_id": 0})
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")
    if answer["author_id"] == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot vote on own answer")
    existing = await db.votes.find_one({"user_id": user["id"], "target_id": answer_id, "target_type": "answer"}, {"_id": 0})
    score_change = 0
    upvote_inc = 0
    downvote_inc = 0
    if existing:
        old = existing["value"]
        if old == 1: upvote_inc -= 1
        elif old == -1: downvote_inc -= 1
        if data.value == 0:
            await db.votes.delete_one({"user_id": user["id"], "target_id": answer_id, "target_type": "answer"})
            score_change = -old
        else:
            await db.votes.update_one({"user_id": user["id"], "target_id": answer_id, "target_type": "answer"}, {"$set": {"value": data.value}})
            score_change = data.value - old
    else:
        if data.value != 0:
            await db.votes.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "target_id": answer_id, "target_type": "answer", "value": data.value, "created_at": datetime.now(timezone.utc).isoformat()})
            score_change = data.value
    if data.value == 1: upvote_inc += 1
    elif data.value == -1: downvote_inc += 1
    await db.answers.update_one({"id": answer_id}, {"$inc": {"vote_score": score_change, "upvotes": upvote_inc, "downvotes": downvote_inc}})
    if score_change > 0:
        await update_reputation(answer["author_id"], 2, "answer_upvoted")
    updated = await db.answers.find_one({"id": answer_id}, {"_id": 0, "vote_score": 1, "upvotes": 1, "downvotes": 1})
    return {"vote_score": updated["vote_score"], "upvotes": updated["upvotes"], "downvotes": updated["downvotes"], "user_vote": data.value}


# ─── Bug Report Status ───
@router.put("/questions/{question_id}/bug-status")
async def update_bug_status(question_id: str, data: dict = Body(...), user=Depends(get_current_user)):
    require_moderator(user)
    question = await db.questions.find_one({"id": question_id}, {"_id": 0})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    if not question.get("is_bug_report"):
        raise HTTPException(status_code=400, detail="This question is not a bug report")
    new_status = data.get("bug_status")
    if new_status not in ("open", "confirmed", "fixed"):
        raise HTTPException(status_code=400, detail="Invalid bug status. Must be: open, confirmed, fixed")
    old_status = question.get("bug_status", "open")
    now = datetime.now(timezone.utc).isoformat()
    await db.questions.update_one({"id": question_id}, {"$set": {
        "bug_status": new_status, "bug_status_changed_by": user["username"], "bug_status_changed_at": now
    }})
    reporter_id = question["author_id"]
    # Award reputation and badge for confirmed bugs
    if new_status == "confirmed" and old_status != "confirmed":
        await update_reputation(reporter_id, 15, "bug_confirmed")
        await create_notification(reporter_id, "bug_confirmed", "Bug Confirmed!",
            f"Your bug report '{question['title'][:50]}' has been confirmed! +15 Rep",
            f"/questions/{question_id}")
        # Check for bug hunter badges
        confirmed_count = await db.questions.count_documents({"author_id": reporter_id, "is_bug_report": True, "bug_status": "confirmed"})
        # Include the one we just confirmed (+1 since the update is already committed)
        reporter = await db.users.find_one({"id": reporter_id}, {"_id": 0})
        if reporter:
            current_badges = set(reporter.get("badges", []))
            new_badges = []
            if confirmed_count >= 3 and "bug_hunter" not in current_badges:
                new_badges.append("bug_hunter")
            if confirmed_count >= 10 and "elite_bug_hunter" not in current_badges:
                new_badges.append("elite_bug_hunter")
            if new_badges:
                await db.users.update_one({"id": reporter_id}, {"$addToSet": {"badges": {"$each": new_badges}}})
                for badge in new_badges:
                    from models import BADGE_DEFINITIONS
                    badge_name = BADGE_DEFINITIONS.get(badge, {}).get("en", badge)
                    await create_notification(reporter_id, "badge_earned", "Badge Earned!",
                        f"You earned the '{badge_name}' badge!", f"/user/{reporter['username']}")
    elif new_status == "fixed":
        await create_notification(reporter_id, "bug_fixed", "Bug Fixed!",
            f"The bug you reported '{question['title'][:50]}' has been fixed!",
            f"/questions/{question_id}")
    return {"message": f"Bug status updated to {new_status}", "bug_status": new_status}
