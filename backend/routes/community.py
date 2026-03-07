"""Community routes: stats, leaderboard, badges, SOTD, easter egg, user profile."""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Query

from database import db
from deps import get_current_user
from models import BADGE_DEFINITIONS
from services.notification_service import create_notification
from services.email_service import send_email_notification

router = APIRouter()


@router.get("/stats")
async def get_stats():
    article_count = await db.articles.count_documents({"status": "published"})
    user_count = await db.users.count_documents({})
    comment_count = await db.comments.count_documents({})
    return {"articles": article_count, "users": user_count, "comments": comment_count}


@router.get("/stats/community")
async def get_community_stats():
    articles = await db.articles.count_documents({"status": "published"})
    users = await db.users.count_documents({})
    comments = await db.comments.count_documents({})
    questions = await db.questions.count_documents({})
    answers = await db.answers.count_documents({})
    scripts = await db.scripts.count_documents({})
    solved_questions = await db.questions.count_documents({"accepted_answer_id": {"$ne": None}})
    total_votes = await db.votes.count_documents({})
    cat_pipeline = [{"$match": {"status": "published"}}, {"$group": {"_id": "$category", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    categories = await db.articles.aggregate(cat_pipeline).to_list(20)
    diff_pipeline = [{"$match": {"status": "published"}}, {"$group": {"_id": "$difficulty", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    difficulties = await db.articles.aggregate(diff_pipeline).to_list(10)
    tag_pipeline = [{"$match": {"status": "published"}}, {"$unwind": "$tags"}, {"$group": {"_id": "$tags", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}, {"$limit": 12}]
    top_tags = await db.articles.aggregate(tag_pipeline).to_list(12)
    return {
        "overview": {"articles": articles, "users": users, "comments": comments, "questions": questions, "answers": answers, "scripts": scripts, "solved_questions": solved_questions, "total_votes": total_votes},
        "categories": [{"name": c["_id"], "count": c["count"]} for c in categories],
        "difficulties": [{"name": d["_id"], "count": d["count"]} for d in difficulties],
        "top_tags": [{"name": t["_id"], "count": t["count"]} for t in top_tags]
    }


@router.get("/leaderboard")
async def get_leaderboard(period: str = Query("all"), limit: int = Query(20, ge=1, le=50)):
    top_users = await db.users.find({}, {"_id": 0, "password_hash": 0, "email": 0}).sort([("reputation", -1)]).limit(limit).to_list(limit)
    top_authors_pipeline = [
        {"$match": {"status": "published"}},
        {"$group": {"_id": "$author_username", "total_votes": {"$sum": "$vote_score"}, "article_count": {"$sum": 1}, "total_views": {"$sum": "$view_count"}}},
        {"$sort": {"total_votes": -1}}, {"$limit": 10}
    ]
    top_authors = await db.articles.aggregate(top_authors_pipeline).to_list(10)
    top_answerers_pipeline = [
        {"$match": {"accepted": True}},
        {"$group": {"_id": "$author_username", "accepted_count": {"$sum": 1}, "total_votes": {"$sum": "$vote_score"}}},
        {"$sort": {"accepted_count": -1}}, {"$limit": 10}
    ]
    top_answerers = await db.answers.aggregate(top_answerers_pipeline).to_list(10)
    recent_pipeline = [
        {"$match": {"status": "published"}}, {"$sort": {"created_at": -1}},
        {"$group": {"_id": "$author_username", "last_activity": {"$first": "$created_at"}}},
        {"$sort": {"last_activity": -1}}, {"$limit": 10}
    ]
    rising_stars = await db.articles.aggregate(recent_pipeline).to_list(10)
    return {
        "top_contributors": top_users,
        "top_authors": [{"username": a["_id"], **{k: v for k, v in a.items() if k != "_id"}} for a in top_authors],
        "top_answerers": [{"username": a["_id"], **{k: v for k, v in a.items() if k != "_id"}} for a in top_answerers],
        "rising_stars": [{"username": r["_id"], "last_activity": r["last_activity"]} for r in rising_stars]
    }


@router.get("/badges")
async def get_badge_definitions():
    return {"badges": BADGE_DEFINITIONS}


@router.post("/easter-egg")
async def claim_easter_egg(user=Depends(get_current_user)):
    full = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if not full:
        raise HTTPException(status_code=404)
    if "arch_btw" in full.get("badges", []):
        return {"already_claimed": True, "message": "You already have this badge!"}
    await db.users.update_one({"id": user["id"]}, {"$addToSet": {"badges": "arch_btw"}})
    await create_notification(user["id"], "badge_earned", "Secret Achievement!",
        "You discovered the hidden terminal command. I use Arch btw.", f"/user/{user['username']}")
    return {"already_claimed": False, "message": "Achievement unlocked: I use Arch btw"}


@router.get("/script-of-the-day")
async def get_script_of_the_day():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    sotd = await db.settings.find_one({"key": "script_of_the_day"}, {"_id": 0})
    if sotd and sotd.get("value", {}).get("date") == today:
        script = await db.scripts.find_one({"id": sotd["value"]["script_id"]}, {"_id": 0})
        if script:
            return {"script": script, "date": today, "reason": sotd["value"].get("reason", "")}
    recent_featured = await db.settings.find_one({"key": "sotd_history"}, {"_id": 0})
    exclude_ids = []
    if recent_featured:
        exclude_ids = [e["script_id"] for e in recent_featured.get("value", [])[-30:]]
    pipeline = [
        {"$match": {"id": {"$nin": exclude_ids}}},
        {"$addFields": {"quality_score": {"$add": [
            {"$multiply": ["$vote_score", 3]}, "$view_count",
            {"$multiply": ["$copy_count", 5]},
            {"$multiply": [{"$ifNull": [{"$size": {"$ifNull": ["$tags", []]}}, 0]}, 2]}
        ]}}},
        {"$match": {"quality_score": {"$gt": 0}}},
        {"$sort": {"quality_score": -1}}, {"$limit": 1}
    ]
    candidates = await db.scripts.aggregate(pipeline).to_list(1)
    if not candidates:
        return {"script": None, "date": today, "reason": ""}
    winner = candidates[0]
    winner_id = winner["id"]
    reason = "auto"
    await db.settings.update_one(
        {"key": "script_of_the_day"},
        {"$set": {"key": "script_of_the_day", "value": {"script_id": winner_id, "date": today, "reason": reason}}},
        upsert=True
    )
    await db.settings.update_one(
        {"key": "sotd_history"},
        {"$push": {"value": {"script_id": winner_id, "date": today}}, "$setOnInsert": {"key": "sotd_history"}},
        upsert=True
    )
    author = await db.users.find_one({"id": winner.get("author_id")}, {"_id": 0})
    if author and "script_of_the_day" not in author.get("badges", []):
        await db.users.update_one({"id": author["id"]}, {"$addToSet": {"badges": "script_of_the_day"}})
        badge_name = BADGE_DEFINITIONS["script_of_the_day"]["en"]
        await create_notification(author["id"], "badge_earned", "Script of the Day!",
            f"Your script '{winner.get('title')}' was featured as Script of the Day!", f"/scripts/{winner_id}")
        await send_email_notification("badge_earned", author, {"username": author["username"], "badge_name": badge_name})
    winner.pop("_id", None)
    return {"script": winner, "date": today, "reason": reason}


@router.get("/users/{username}/profile")
async def get_user_profile(username: str):
    user = await db.users.find_one({"username_lower": username.lower()}, {"_id": 0, "password_hash": 0, "email": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    articles = await db.articles.find({"author_id": user["id"], "status": "published"}, {"_id": 0, "content_markdown": 0}).sort([("created_at", -1)]).limit(20).to_list(20)
    questions = await db.questions.find({"author_id": user["id"]}, {"_id": 0, "body_markdown": 0}).sort([("created_at", -1)]).limit(10).to_list(10)
    answers = await db.answers.find({"author_id": user["id"]}, {"_id": 0, "body_markdown": 0}).sort([("created_at", -1)]).limit(10).to_list(10)
    scripts = await db.scripts.find({"author_id": user["id"]}, {"_id": 0, "code": 0}).sort([("created_at", -1)]).limit(10).to_list(10)
    return {"user": user, "articles": articles, "questions": questions, "answers": answers, "scripts": scripts}
