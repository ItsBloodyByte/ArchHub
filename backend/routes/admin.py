"""Admin routes: users, announcements, SMTP, templates, blocked usernames, GDPR, design, assets, SOTD."""
import re
import uuid
import base64
import smtplib
from datetime import datetime, timezone, timedelta
from email.mime.text import MIMEText
from fastapi import APIRouter, HTTPException, Depends, Query, Body, UploadFile, File

from database import db
from deps import get_current_user, require_admin
from models import UserRoleUpdate, UserBanAction, BADGE_DEFINITIONS
from services.auth_service import verify_password
from services.notification_service import create_notification
from services.email_service import get_smtp_settings, send_email_notification

router = APIRouter()


# ─── Announcement ───
@router.get("/announcement")
async def get_announcement():
    ann = await db.site_settings.find_one({"key": "announcement"}, {"_id": 0})
    if not ann or not ann.get("active"):
        return {"active": False}
    return ann.get("data", {"active": False})


@router.put("/admin/announcement")
async def update_announcement(data: dict = Body(...), user=Depends(get_current_user)):
    require_admin(user)
    ann_data = {
        "active": data.get("active", False), "title": data.get("title", ""),
        "message": data.get("message", ""), "type": data.get("type", "info"),
        "link_url": data.get("link_url", ""), "link_text": data.get("link_text", ""),
        "updated_by": user["username"], "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.site_settings.update_one(
        {"key": "announcement"},
        {"$set": {"key": "announcement", "data": ann_data, "active": ann_data["active"]}},
        upsert=True
    )
    return ann_data


# ─── SMTP ───
@router.get("/admin/smtp")
async def get_smtp_config(user=Depends(get_current_user)):
    require_admin(user)
    s = await db.site_settings.find_one({"key": "smtp"}, {"_id": 0})
    data = s.get("data", {}) if s else {}
    if "password" in data:
        data["password"] = "••••••••" if data["password"] else ""
    return data


@router.put("/admin/smtp")
async def update_smtp_config(data: dict = Body(...), user=Depends(get_current_user)):
    require_admin(user)
    if data.get("password") == "••••••••":
        existing = await db.site_settings.find_one({"key": "smtp"}, {"_id": 0})
        if existing and existing.get("data", {}).get("password"):
            data["password"] = existing["data"]["password"]
    await db.site_settings.update_one({"key": "smtp"}, {"$set": {"key": "smtp", "data": data}}, upsert=True)
    return {"message": "SMTP settings saved"}


@router.post("/admin/smtp/test")
async def test_smtp(data: dict = Body(...), user=Depends(get_current_user)):
    require_admin(user)
    smtp = await get_smtp_settings()
    if not smtp or not smtp.get("host"):
        raise HTTPException(status_code=400, detail="SMTP not configured")
    test_email = data.get("email", user.get("email"))
    if not test_email:
        raise HTTPException(status_code=400, detail="No test email provided")
    try:
        msg = MIMEText("<h2>ArchHub SMTP Test</h2><p>Die E-Mail-Konfiguration funktioniert!</p>", "html", "utf-8")
        msg["From"] = f"{smtp.get('from_name', 'ArchHub')} <{smtp.get('from_email', smtp['username'])}>"
        msg["To"] = test_email
        msg["Subject"] = "ArchHub - SMTP Test"
        use_ssl = smtp.get("port", 587) == 465
        if use_ssl:
            server = smtplib.SMTP_SSL(smtp["host"], smtp["port"], timeout=10)
        else:
            server = smtplib.SMTP(smtp["host"], smtp["port"], timeout=10)
            server.starttls()
        server.login(smtp["username"], smtp["password"])
        server.send_message(msg)
        server.quit()
        return {"message": f"Test email sent to {test_email}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SMTP Error: {str(e)}")


# ─── Email Templates ───
@router.get("/admin/email-templates")
async def list_email_templates(user=Depends(get_current_user)):
    require_admin(user)
    templates = await db.email_templates.find({}, {"_id": 0}).to_list(100)
    return templates


@router.put("/admin/email-templates/{trigger}")
async def upsert_email_template(trigger: str, data: dict = Body(...), user=Depends(get_current_user)):
    require_admin(user)
    doc = {
        "trigger": trigger, "name": data.get("name", trigger),
        "subject_de": data.get("subject_de", ""), "subject_en": data.get("subject_en", ""),
        "body_html_de": data.get("body_html_de", ""), "body_html_en": data.get("body_html_en", ""),
        "placeholders": data.get("placeholders", []), "active": data.get("active", True),
        "updated_by": user["username"], "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.email_templates.update_one({"trigger": trigger}, {"$set": doc}, upsert=True)
    return doc


@router.delete("/admin/email-templates/{trigger}")
async def delete_email_template(trigger: str, user=Depends(get_current_user)):
    require_admin(user)
    await db.email_templates.delete_one({"trigger": trigger})
    return {"message": "Template deleted"}


# ─── Blocked Usernames ───
@router.get("/admin/blocked-usernames")
async def list_blocked_usernames(user=Depends(get_current_user)):
    require_admin(user)
    docs = await db.blocked_usernames.find({}, {"_id": 0}).sort("username", 1).to_list(500)
    return docs


@router.post("/admin/blocked-usernames")
async def add_blocked_username(data: dict = Body(...), user=Depends(get_current_user)):
    require_admin(user)
    username = data.get("username", "").lower().strip()
    if not username or not re.match(r'^[a-z0-9_-]+$', username):
        raise HTTPException(status_code=400, detail="Invalid username format")
    existing = await db.blocked_usernames.find_one({"username": username})
    if existing:
        raise HTTPException(status_code=409, detail="Username already blocked")
    await db.blocked_usernames.insert_one({"username": username, "added_at": datetime.now(timezone.utc).isoformat()})
    return {"message": f"'{username}' blocked"}


@router.delete("/admin/blocked-usernames/{username}")
async def remove_blocked_username(username: str, user=Depends(get_current_user)):
    require_admin(user)
    result = await db.blocked_usernames.delete_one({"username": username.lower().strip()})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Username not found in blocklist")
    return {"message": f"'{username}' unblocked"}


# ─── User Management ───
@router.get("/admin/users")
async def list_users(user=Depends(get_current_user), page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=50), search: str = None):
    require_admin(user)
    skip = (page - 1) * limit
    query = {}
    if search and search.strip():
        query["username_lower"] = {"$regex": search.strip().lower(), "$options": "i"}
    total = await db.users.count_documents(query)
    users = await db.users.find(query, {"_id": 0, "password_hash": 0, "totp_secret": 0}).sort([("created_at", -1)]).skip(skip).limit(limit).to_list(limit)
    return {"users": users, "total": total, "page": page, "pages": max(1, (total + limit - 1) // limit)}


@router.put("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, data: UserRoleUpdate, user=Depends(get_current_user)):
    require_admin(user)
    target = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.update_one({"id": user_id}, {"$set": {"role": data.role, "updated_at": datetime.now(timezone.utc).isoformat()}})
    await create_notification(user_id, "role_changed", "Role Updated", f"Your role has been changed to {data.role}.", f"/user/{target['username']}")
    return {"message": f"Role updated to {data.role}"}


@router.put("/admin/users/{user_id}/ban")
async def ban_user(user_id: str, data: UserBanAction, user=Depends(get_current_user)):
    require_admin(user)
    target = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target["role"] == "admin":
        raise HTTPException(status_code=403, detail="Cannot ban an admin")
    await db.users.update_one({"id": user_id}, {"$set": {"banned": data.banned, "ban_reason": data.reason, "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"message": f"User {'banned' if data.banned else 'unbanned'}"}


@router.get("/admin/stats")
async def get_admin_stats(user=Depends(get_current_user)):
    require_admin(user)
    total_users = await db.users.count_documents({})
    total_articles = await db.articles.count_documents({})
    published = await db.articles.count_documents({"status": "published"})
    drafts = await db.articles.count_documents({"status": "draft"})
    submitted = await db.articles.count_documents({"status": "submitted"})
    total_comments = await db.comments.count_documents({})
    total_votes = await db.votes.count_documents({})
    return {"users": total_users, "articles": total_articles, "published": published, "drafts": drafts, "submitted": submitted, "comments": total_comments, "votes": total_votes}


# ─── GDPR / Exports ───
@router.post("/admin/users/{user_id}/export")
async def create_user_export(user_id: str, data: dict = Body(...), user=Depends(get_current_user)):
    require_admin(user)
    target = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    password = data.get("password", "")
    if not verify_password(password, target["password_hash"]):
        raise HTTPException(status_code=400, detail="Invalid user password")
    articles = await db.articles.find({"author_id": user_id}, {"_id": 0}).to_list(1000)
    comments = await db.comments.find({"author_id": user_id}, {"_id": 0}).to_list(1000)
    questions = await db.questions.find({"author_id": user_id}, {"_id": 0}).to_list(1000)
    answers = await db.answers.find({"author_id": user_id}, {"_id": 0}).to_list(1000)
    scripts = await db.scripts.find({"author_id": user_id}, {"_id": 0}).to_list(1000)
    votes = await db.votes.find({"user_id": user_id}, {"_id": 0}).to_list(5000)
    bookmarks = await db.bookmarks.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    notifications = await db.notifications.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    user_data = {k: v for k, v in target.items() if k != "password_hash"}
    now = datetime.now(timezone.utc)
    export_id = str(uuid.uuid4())
    export_doc = {
        "id": export_id, "user_id": user_id, "username": target["username"],
        "created_by": user["username"], "created_at": now.isoformat(),
        "expires_at": (now + timedelta(hours=48)).isoformat(),
        "data": {"user": user_data, "articles": articles, "comments": comments, "questions": questions, "answers": answers, "scripts": scripts, "votes": votes, "bookmarks": bookmarks, "notifications": notifications}
    }
    await db.data_exports.insert_one(export_doc)
    return {
        "export_id": export_id, "username": target["username"], "expires_at": export_doc["expires_at"],
        "stats": {"articles": len(articles), "comments": len(comments), "questions": len(questions), "answers": len(answers), "scripts": len(scripts), "votes": len(votes), "bookmarks": len(bookmarks)}
    }


@router.get("/admin/exports/{export_id}")
async def download_export(export_id: str, user=Depends(get_current_user)):
    require_admin(user)
    export = await db.data_exports.find_one({"id": export_id}, {"_id": 0})
    if not export:
        raise HTTPException(status_code=404, detail="Export not found")
    if datetime.now(timezone.utc).isoformat() > export["expires_at"]:
        raise HTTPException(status_code=410, detail="Export expired (48h limit)")
    return export["data"]


@router.get("/admin/exports")
async def list_exports(user=Depends(get_current_user)):
    require_admin(user)
    exports = await db.data_exports.find({}, {"_id": 0, "data": 0}).sort([("created_at", -1)]).limit(50).to_list(50)
    now = datetime.now(timezone.utc).isoformat()
    for e in exports:
        e["expired"] = now > e["expires_at"]
    return {"exports": exports}


@router.delete("/admin/users/{user_id}/gdpr")
async def gdpr_delete_user(user_id: str, user=Depends(get_current_user)):
    require_admin(user)
    target = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target["role"] == "admin":
        raise HTTPException(status_code=403, detail="Cannot delete an admin account")
    anon_username = "ArchHub"
    now = datetime.now(timezone.utc).isoformat()
    await db.articles.update_many({"author_id": user_id}, {"$set": {"author_id": "deleted", "author_username": anon_username, "updated_at": now}})
    await db.comments.update_many({"author_id": user_id}, {"$set": {"author_id": "deleted", "author_username": anon_username}})
    await db.questions.update_many({"author_id": user_id}, {"$set": {"author_id": "deleted", "author_username": anon_username}})
    await db.answers.update_many({"author_id": user_id}, {"$set": {"author_id": "deleted", "author_username": anon_username}})
    await db.scripts.update_many({"author_id": user_id}, {"$set": {"author_id": "deleted", "author_username": anon_username}})
    await db.votes.delete_many({"user_id": user_id})
    await db.bookmarks.delete_many({"user_id": user_id})
    await db.notifications.delete_many({"user_id": user_id})
    await db.data_exports.delete_many({"user_id": user_id})
    await db.users.delete_one({"id": user_id})
    return {"message": f"User '{target['username']}' has been permanently deleted. Content has been anonymized to '{anon_username}'.", "username": target["username"]}


# ─── Design ───
@router.get("/site/design")
async def get_design_settings():
    doc = await db.site_settings.find_one({"key": "design"}, {"_id": 0})
    if not doc:
        return {"site_title": "ArchHub", "favicon_url": None, "logo_url": None, "seo": {}, "geo_aio": {}}
    return doc.get("value", {})


@router.get("/site/footer")
async def get_footer_public():
    doc = await db.site_settings.find_one({"key": "footer_config"}, {"_id": 0})
    defaults = {
        "copyright_de": "\u00a9 2026 ArchHub Contributors. Ver\u00f6ffentlicht unter der AGPL v3.",
        "copyright_en": "\u00a9 2026 ArchHub Contributors. Released under the AGPL v3.",
        "credit_username": "ItsBloodyByte",
    }
    return doc.get("value", defaults) if doc else defaults


@router.put("/admin/design")
async def update_design_settings(data: dict = Body(...), user=Depends(get_current_user)):
    require_admin(user)
    allowed_keys = ["site_title", "favicon_url", "logo_url", "seo", "geo_aio"]
    value = {k: v for k, v in data.items() if k in allowed_keys}
    existing = await db.site_settings.find_one({"key": "design"}, {"_id": 0})
    if existing:
        merged = {**existing.get("value", {}), **value}
        await db.site_settings.update_one({"key": "design"}, {"$set": {"value": merged}})
    else:
        await db.site_settings.insert_one({"key": "design", "value": value})
    return {"message": "Design settings updated"}


@router.post("/admin/upload-asset")
async def upload_asset(file: UploadFile = File(...), user=Depends(get_current_user)):
    require_admin(user)
    if not file.content_type or not file.content_type.startswith(("image/", "image/x-icon", "image/svg")):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    content = await file.read()
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File must be under 2MB")
    b64 = base64.b64encode(content).decode()
    data_url = f"data:{file.content_type};base64,{b64}"
    return {"url": data_url, "filename": file.filename}


# ─── Footer Settings ───
DEFAULT_FOOTER = {
    "copyright_de": "© 2026 ArchHub Contributors. Veröffentlicht unter der AGPL v3.",
    "copyright_en": "© 2026 ArchHub Contributors. Released under the AGPL v3.",
    "credit_username": "ItsBloodyByte",
}


@router.get("/admin/footer-settings")
async def get_footer_settings_admin(user=Depends(get_current_user)):
    require_admin(user)
    doc = await db.site_settings.find_one({"key": "footer_config"}, {"_id": 0})
    return doc.get("value", DEFAULT_FOOTER) if doc else DEFAULT_FOOTER


@router.put("/admin/footer-settings")
async def update_footer_settings(data: dict = Body(...), user=Depends(get_current_user)):
    require_admin(user)
    footer = {
        "copyright_de": data.get("copyright_de", "").strip()[:300],
        "copyright_en": data.get("copyright_en", "").strip()[:300],
        "credit_username": data.get("credit_username", "").strip()[:50],
    }
    await db.site_settings.update_one(
        {"key": "footer_config"},
        {"$set": {"key": "footer_config", "value": footer}},
        upsert=True
    )
    return {"message": "Footer saved", **footer}


# ─── Contributors ───
@router.get("/site/contributors")
async def get_contributors_public():
    doc = await db.site_settings.find_one({"key": "contributors"}, {"_id": 0})
    return {"contributors": doc.get("value", []) if doc else []}


@router.get("/admin/contributors")
async def get_contributors_admin(user=Depends(get_current_user)):
    require_admin(user)
    doc = await db.site_settings.find_one({"key": "contributors"}, {"_id": 0})
    return {"contributors": doc.get("value", []) if doc else []}


@router.put("/admin/contributors")
async def update_contributors(data: dict = Body(...), user=Depends(get_current_user)):
    require_admin(user)
    contributors = data.get("contributors", [])
    cleaned = []
    for c in contributors[:30]:
        cleaned.append({
            "username": str(c.get("username", "")).strip()[:50],
            "title_de": str(c.get("title_de", "")).strip()[:100],
            "title_en": str(c.get("title_en", "")).strip()[:100],
            "order": int(c.get("order", 0)),
        })
    cleaned.sort(key=lambda x: x.get("order", 0))
    await db.site_settings.update_one(
        {"key": "contributors"},
        {"$set": {"key": "contributors", "value": cleaned}},
        upsert=True
    )
    return {"message": "Contributors saved", "contributors": cleaned}


# ─── Package API Settings ───
@router.get("/admin/package-settings")
async def get_package_settings(user=Depends(get_current_user)):
    require_admin(user)
    doc = await db.site_settings.find_one({"key": "arch_package_api_url"}, {"_id": 0})
    return {"api_url": doc.get("value", "https://archlinux.org/packages/search/json/") if doc else "https://archlinux.org/packages/search/json/"}


@router.put("/admin/package-settings")
async def update_package_settings(data: dict = Body(...), user=Depends(get_current_user)):
    require_admin(user)
    api_url = data.get("api_url", "").strip()
    if not api_url:
        raise HTTPException(status_code=400, detail="API URL required")
    await db.site_settings.update_one(
        {"key": "arch_package_api_url"},
        {"$set": {"key": "arch_package_api_url", "value": api_url}},
        upsert=True
    )
    return {"message": "Package API settings saved", "api_url": api_url}


# ─── Script of the Day (Admin Set) ───
@router.put("/admin/script-of-the-day")
async def set_script_of_the_day(data: dict = Body(...), user=Depends(get_current_user)):
    require_admin(user)
    script_id = data.get("script_id")
    if not script_id:
        raise HTTPException(status_code=400, detail="script_id required")
    script = await db.scripts.find_one({"id": script_id}, {"_id": 0})
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    await db.settings.update_one(
        {"key": "script_of_the_day"},
        {"$set": {"key": "script_of_the_day", "value": {"script_id": script_id, "date": today, "reason": "admin"}}},
        upsert=True
    )
    await db.settings.update_one(
        {"key": "sotd_history"},
        {"$push": {"value": {"script_id": script_id, "date": today}}, "$setOnInsert": {"key": "sotd_history"}},
        upsert=True
    )
    author = await db.users.find_one({"id": script.get("author_id")}, {"_id": 0})
    if author and "script_of_the_day" not in author.get("badges", []):
        await db.users.update_one({"id": author["id"]}, {"$addToSet": {"badges": "script_of_the_day"}})
        badge_name = BADGE_DEFINITIONS["script_of_the_day"]["en"]
        await create_notification(author["id"], "badge_earned", "Script of the Day!",
            f"Your script '{script.get('title')}' was featured!", f"/scripts/{script_id}")
        if author:
            await send_email_notification("badge_earned", author, {"username": author["username"], "badge_name": badge_name})
    return {"message": "Script of the Day set", "script_id": script_id}
