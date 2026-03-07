"""Search routes: search, categories, tags, global search."""
from typing import Optional
from fastapi import APIRouter, Query

from database import db

router = APIRouter()


@router.get("/search")
async def search(q: str = Query(..., min_length=1), page: int = Query(1, ge=1), limit: int = Query(12, ge=1, le=50)):
    query = {
        "status": "published",
        "$or": [
            {"title": {"$regex": q, "$options": "i"}},
            {"summary": {"$regex": q, "$options": "i"}},
            {"tags": {"$regex": q, "$options": "i"}},
            {"content_markdown": {"$regex": q, "$options": "i"}}
        ]
    }
    skip = (page - 1) * limit
    total = await db.articles.count_documents(query)
    articles = await db.articles.find(query, {"_id": 0, "content_markdown": 0}).sort([("vote_score", -1)]).skip(skip).limit(limit).to_list(limit)
    return {"articles": articles, "total": total, "page": page, "pages": max(1, (total + limit - 1) // limit)}


@router.get("/categories")
async def get_categories():
    cats = await db.articles.distinct("category", {"status": "published"})
    return {"categories": cats}


@router.get("/tags")
async def get_tags():
    pipeline = [
        {"$match": {"status": "published"}},
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 50}
    ]
    result = await db.articles.aggregate(pipeline).to_list(50)
    return {"tags": [{"name": r["_id"], "count": r["count"]} for r in result]}


@router.get("/search/all")
async def global_search(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=30),
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    content_type: Optional[str] = None,
    sort: str = Query("relevance"),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    tag: Optional[str] = None
):
    regex = {"$regex": q, "$options": "i"}
    date_filter = {}
    if date_from: date_filter["$gte"] = date_from
    if date_to: date_filter["$lte"] = date_to
    sort_map = {
        "relevance": [("vote_score", -1), ("created_at", -1)],
        "newest": [("created_at", -1)], "oldest": [("created_at", 1)],
        "most_voted": [("vote_score", -1)],
    }
    sort_key = sort_map.get(sort, sort_map["relevance"])
    articles = []
    questions = []
    scripts = []

    if not content_type or content_type in ("all", "articles"):
        article_filter = {"status": "published", "$or": [{"title": regex}, {"summary": regex}, {"tags": regex}]}
        if category: article_filter["category"] = category
        if difficulty: article_filter["difficulty"] = difficulty
        if tag: article_filter["tags"] = tag
        if date_filter: article_filter["created_at"] = date_filter
        raw_articles = await db.articles.find(article_filter, {"_id": 0, "content_markdown": 0}).sort(sort_key).limit(limit).to_list(limit)
        if sort == "relevance":
            q_lower = q.lower()
            for a in raw_articles:
                score = 0
                if q_lower in a.get("title", "").lower(): score += 10
                if q_lower in (a.get("summary") or "").lower(): score += 3
                a["_relevance"] = score + a.get("vote_score", 0)
            raw_articles.sort(key=lambda x: x.get("_relevance", 0), reverse=True)
            for a in raw_articles:
                a.pop("_relevance", None)
        articles = raw_articles

    if not content_type or content_type in ("all", "questions"):
        q_filter = {"$or": [{"title": regex}, {"tags": regex}]}
        if tag: q_filter["tags"] = tag
        if date_filter: q_filter["created_at"] = date_filter
        questions = await db.questions.find(q_filter, {"_id": 0, "body_markdown": 0}).sort(sort_key).limit(limit).to_list(limit)

    if not content_type or content_type in ("all", "scripts"):
        s_filter = {"$or": [{"title": regex}, {"description": regex}, {"tags": regex}]}
        if tag: s_filter["tags"] = tag
        if date_filter: s_filter["created_at"] = date_filter
        scripts = await db.scripts.find(s_filter, {"_id": 0, "code": 0}).sort(sort_key).limit(limit).to_list(limit)

    return {"articles": articles, "questions": questions, "scripts": scripts}


@router.get("/search/tags")
async def search_tags(q: str = Query("", min_length=0)):
    pipeline = [
        {"$match": {"status": "published"}},
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 30}
    ]
    if q:
        pipeline[0] = {"$match": {"status": "published", "tags": {"$regex": q, "$options": "i"}}}
    tags = await db.articles.aggregate(pipeline).to_list(30)
    return {"tags": [{"name": t["_id"], "count": t["count"]} for t in tags]}
