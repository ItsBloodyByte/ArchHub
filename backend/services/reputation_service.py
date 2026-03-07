"""Reputation and badge management service."""
from database import db
from models import BADGE_DEFINITIONS
from services.notification_service import create_notification
from services.email_service import send_email_notification


async def update_reputation(user_id: str, points: int, reason: str):
    await db.users.update_one({"id": user_id}, {"$inc": {"reputation": points}})
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "reputation": 1})
    if user:
        rep = user.get("reputation", 0)
        if rep >= 2000:
            tl = 4
        elif rep >= 500:
            tl = 3
        elif rep >= 200:
            tl = 2
        elif rep >= 50:
            tl = 1
        else:
            tl = 0
        await db.users.update_one({"id": user_id}, {"$set": {"trust_level": tl}})


async def check_and_award_badges(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        return
    current_badges = set(user.get("badges", []))
    new_badges = []

    if "first_article" not in current_badges:
        count = await db.articles.count_documents({"author_id": user_id, "status": "published"})
        if count >= 1:
            new_badges.append("first_article")

    if "prolific_writer" not in current_badges:
        count = await db.articles.count_documents({"author_id": user_id, "status": "published"})
        if count >= 5:
            new_badges.append("prolific_writer")

    if "first_comment" not in current_badges:
        count = await db.comments.count_documents({"author_id": user_id})
        if count >= 1:
            new_badges.append("first_comment")

    if "first_question" not in current_badges:
        count = await db.questions.count_documents({"author_id": user_id})
        if count >= 1:
            new_badges.append("first_question")

    if "first_answer" not in current_badges:
        count = await db.answers.count_documents({"author_id": user_id})
        if count >= 1:
            new_badges.append("first_answer")

    if "accepted_answer" not in current_badges:
        count = await db.answers.count_documents({"author_id": user_id, "accepted": True})
        if count >= 1:
            new_badges.append("accepted_answer")

    if "helpful_10" not in current_badges:
        pipeline = [{"$match": {"author_id": user_id, "status": "published"}}, {"$group": {"_id": None, "total": {"$sum": "$upvotes"}}}]
        result = await db.articles.aggregate(pipeline).to_list(1)
        total_upvotes = result[0]["total"] if result else 0
        if total_upvotes >= 10:
            new_badges.append("helpful_10")

    if "helpful_50" not in current_badges:
        pipeline = [{"$match": {"author_id": user_id, "status": "published"}}, {"$group": {"_id": None, "total": {"$sum": "$upvotes"}}}]
        result = await db.articles.aggregate(pipeline).to_list(1)
        total_upvotes = result[0]["total"] if result else 0
        if total_upvotes >= 50:
            new_badges.append("helpful_50")

    rep = user.get("reputation", 0)
    if "trusted_voice" not in current_badges and rep >= 500:
        new_badges.append("trusted_voice")
    if "veteran" not in current_badges and rep >= 2000:
        new_badges.append("veteran")

    # Bug hunter badges
    if "bug_hunter" not in current_badges or "elite_bug_hunter" not in current_badges:
        confirmed_bugs = await db.questions.count_documents({"author_id": user_id, "is_bug_report": True, "bug_status": "confirmed"})
        if confirmed_bugs >= 3 and "bug_hunter" not in current_badges:
            new_badges.append("bug_hunter")
        if confirmed_bugs >= 10 and "elite_bug_hunter" not in current_badges:
            new_badges.append("elite_bug_hunter")

    if "pioneer" not in current_badges:
        has_article = await db.articles.count_documents({"author_id": user_id, "status": "published"})
        has_script = await db.scripts.count_documents({"author_id": user_id})
        has_answer = await db.answers.count_documents({"author_id": user_id})
        if (has_article + has_script + has_answer) >= 1:
            pioneer_count = await db.users.count_documents({"badges": "pioneer"})
            if pioneer_count < 50:
                new_badges.append("pioneer")

    if new_badges:
        await db.users.update_one(
            {"id": user_id},
            {"$addToSet": {"badges": {"$each": new_badges}}}
        )
        for badge in new_badges:
            badge_name = BADGE_DEFINITIONS.get(badge, {}).get("en", badge)
            await create_notification(user_id, "badge_earned",
                "Badge Earned!", f"You earned the '{badge_name}' badge!",
                f"/user/{user['username']}")
            badge_user = await db.users.find_one({"id": user_id}, {"_id": 0})
            if badge_user:
                await send_email_notification("badge_earned", badge_user, {"username": badge_user["username"], "badge_name": badge_name})
