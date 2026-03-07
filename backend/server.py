"""ArchHub - Main application entry point."""
import os
import uuid
import logging
from datetime import datetime, timezone
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from database import db, client
from services.auth_service import hash_password
from routes import (
    auth, articles, qa, scripts, moderation,
    admin, search, community, bookmarks,
    notifications, media, pages, collections, packages,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ArchHub API")

# ─── CORS ───
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Include all route modules ───
for route_module in [
    auth, articles, qa, scripts, moderation,
    admin, search, community, bookmarks,
    notifications, media, pages, collections, packages,
]:
    app.include_router(route_module.router, prefix="/api")


# ─── Startup Events ───
@app.on_event("startup")
async def migrate_admin_user():
    admin_username = os.environ.get('ADMIN_USERNAME', 'ItsBloodyByte')
    admin_password = os.environ.get('ADMIN_PASSWORD', 'Admin123')
    admin_email = os.environ.get('ADMIN_EMAIL', None)
    existing = await db.users.find_one({"username_lower": admin_username.lower()})
    if existing:
        await db.users.update_one(
            {"username_lower": admin_username.lower()},
            {"$set": {"role": "admin", "password_hash": hash_password(admin_password), "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        logger.info(f"Admin user '{admin_username}' ensured.")
    else:
        now = datetime.now(timezone.utc).isoformat()
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "username": admin_username,
            "username_lower": admin_username.lower(),
            "password_hash": hash_password(admin_password),
            "email": admin_email, "role": "admin", "bio": "",
            "reputation": 0, "trust_level": 3,
            "article_count": 0, "comment_count": 0, "badges": [],
            "totp_enabled": False, "created_at": now, "updated_at": now
        })
        logger.info(f"Created admin user '{admin_username}'")


@app.on_event("startup")
async def seed_blocked_usernames():
    count = await db.blocked_usernames.count_documents({})
    if count > 0:
        return
    defaults = [
        "admin", "administrator", "moderator", "mod", "root", "system",
        "support", "help", "helpdesk", "archhub", "archlinux", "arch",
        "official", "staff", "team", "security", "abuse", "postmaster",
        "webmaster", "noreply", "no-reply", "mailer-daemon", "daemon",
        "sudo", "su", "superuser", "sysadmin", "operator",
        "bot", "robot", "automated", "service", "api",
        "test", "testing", "debug", "null", "undefined", "anonymous",
        "deleted", "banned", "suspended", "blocked",
    ]
    now = datetime.now(timezone.utc).isoformat()
    await db.blocked_usernames.insert_many([{"username": u, "added_at": now} for u in defaults])
    await db.blocked_usernames.create_index("username", unique=True)
    logger.info(f"Seeded {len(defaults)} blocked usernames")


@app.on_event("startup")
async def seed_default_email_templates():
    count = await db.email_templates.count_documents({})
    if count > 0:
        return
    default_templates = [
        {"trigger": "welcome", "name": "Willkommen / Welcome", "subject_de": "Willkommen bei ArchHub, {{username}}!", "subject_en": "Welcome to ArchHub, {{username}}!", "body_html_de": "<div style='font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:32px;border-radius:8px'><h2 style='color:#1793D1'>Willkommen bei ArchHub!</h2><p>Hallo <strong>{{username}}</strong>,</p><p>dein Account wurde erfolgreich erstellt.</p><p style='color:#888;font-size:12px;margin-top:24px'>— ArchHub</p></div>", "body_html_en": "<div style='font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:32px;border-radius:8px'><h2 style='color:#1793D1'>Welcome to ArchHub!</h2><p>Hello <strong>{{username}}</strong>,</p><p>Your account has been created.</p><p style='color:#888;font-size:12px;margin-top:24px'>— ArchHub</p></div>", "placeholders": ["username"], "active": True},
        {"trigger": "article_approved", "name": "Artikel genehmigt", "subject_de": "Dein Artikel wurde genehmigt: {{article_title}}", "subject_en": "Your article was approved: {{article_title}}", "body_html_de": "<h2 style='color:#2ecc71'>Artikel genehmigt!</h2><p>{{username}}, dein Artikel \"{{article_title}}\" wurde genehmigt.</p>", "body_html_en": "<h2 style='color:#2ecc71'>Article Approved!</h2><p>{{username}}, your article \"{{article_title}}\" has been approved.</p>", "placeholders": ["username", "article_title"], "active": True},
        {"trigger": "article_rejected", "name": "Artikel abgelehnt", "subject_de": "Dein Artikel benoetigt Ueberarbeitung: {{article_title}}", "subject_en": "Your article needs revision: {{article_title}}", "body_html_de": "<h2 style='color:#e74c3c'>Artikel abgelehnt</h2><p>{{username}}, Grund: {{reason}}</p>", "body_html_en": "<h2 style='color:#e74c3c'>Article Rejected</h2><p>{{username}}, Reason: {{reason}}</p>", "placeholders": ["username", "article_title", "reason"], "active": True},
        {"trigger": "new_comment", "name": "Neuer Kommentar", "subject_de": "{{commenter}} hat deinen Artikel kommentiert", "subject_en": "{{commenter}} commented on your article", "body_html_de": "<p>{{commenter}} hat kommentiert.</p>", "body_html_en": "<p>{{commenter}} commented.</p>", "placeholders": ["username", "commenter", "article_title"], "active": True},
        {"trigger": "new_answer", "name": "Neue Antwort", "subject_de": "{{answerer}} hat deine Frage beantwortet", "subject_en": "{{answerer}} answered your question", "body_html_de": "<p>{{answerer}} hat geantwortet.</p>", "body_html_en": "<p>{{answerer}} answered.</p>", "placeholders": ["username", "answerer", "question_title"], "active": True},
        {"trigger": "badge_earned", "name": "Abzeichen erhalten", "subject_de": "Du hast ein neues Abzeichen erhalten!", "subject_en": "You earned a new badge!", "body_html_de": "<p>Du hast \"{{badge_name}}\" erhalten.</p>", "body_html_en": "<p>You earned \"{{badge_name}}\".</p>", "placeholders": ["username", "badge_name"], "active": True},
    ]
    for t in default_templates:
        t["updated_by"] = "system"
        t["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.email_templates.insert_many(default_templates)
    logger.info(f"Seeded {len(default_templates)} default email templates")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


@app.on_event("startup")
async def ensure_package_cache_index():
    await db.package_cache.create_index("name", unique=True)
    logger.info("Package cache index ensured.")
