"""Authentication routes: register, login, profile, password, username, sessions, data export, 2FA."""
import re
import io
import time
import uuid
import base64
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Request
import pyotp
import qrcode

from database import db
from deps import get_current_user
from models import (
    UserRegister, UserLogin, UserProfileUpdate,
    ChangePasswordRequest, ChangeUsernameRequest, DeleteAccountRequest,
    DataExportRequest, TOTPVerify,
)
from services.auth_service import hash_password, verify_password, create_token
from services.email_service import send_email_notification
from config import (
    registration_attempts, REGISTRATION_RATE_LIMIT,
    REGISTRATION_RATE_WINDOW, MIN_REGISTRATION_TIME_MS,
)

router = APIRouter()


@router.post("/auth/register")
async def register(data: UserRegister, request: Request):
    if data.honeypot:
        raise HTTPException(status_code=400, detail="Registration failed")
    if data.form_loaded_at:
        elapsed = int(time.time() * 1000) - data.form_loaded_at
        if elapsed < MIN_REGISTRATION_TIME_MS:
            raise HTTPException(status_code=400, detail="Registration failed")
    client_ip = request.client.host if request.client else "unknown"
    now_ts = time.time()
    registration_attempts[client_ip] = [t for t in registration_attempts[client_ip] if now_ts - t < REGISTRATION_RATE_WINDOW]
    if len(registration_attempts[client_ip]) >= REGISTRATION_RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too many registration attempts. Try again later.")
    registration_attempts[client_ip].append(now_ts)

    username_lower = data.username.lower().strip()
    if not re.match(r'^[a-z0-9_-]+$', username_lower):
        raise HTTPException(status_code=400, detail="Username may only contain letters, numbers, hyphens and underscores")
    blocked = await db.blocked_usernames.find_one({"username": username_lower})
    if blocked:
        raise HTTPException(status_code=400, detail="This username is not allowed")
    existing = await db.users.find_one({"username_lower": username_lower})
    if existing:
        raise HTTPException(status_code=409, detail="Username already taken")
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    user_doc = {
        "id": user_id,
        "username": data.username.strip(),
        "username_lower": username_lower,
        "password_hash": hash_password(data.password),
        "email": data.email,
        "role": "user",
        "bio": "",
        "reputation": 0,
        "trust_level": 0,
        "article_count": 0,
        "comment_count": 0,
        "badges": [],
        "created_at": now,
        "updated_at": now
    }
    await db.users.insert_one(user_doc)
    session_id = str(uuid.uuid4())
    ua = request.headers.get("user-agent", "Unknown")
    await db.sessions.insert_one({
        "id": session_id,
        "user_id": user_id,
        "user_agent": ua[:256],
        "ip": client_ip,
        "created_at": now,
        "last_active": now,
        "revoked": False
    })
    token = create_token(user_id, data.username.strip(), "user", session_id)
    await send_email_notification("welcome", user_doc, {"username": data.username.strip()})
    return {
        "token": token,
        "user": {
            "id": user_id,
            "username": data.username.strip(),
            "role": "user",
            "reputation": 0,
            "trust_level": 0,
            "bio": "",
            "article_count": 0,
            "badges": [],
            "created_at": now
        }
    }


@router.post("/auth/login")
async def login(data: UserLogin, request: Request):
    user = await db.users.find_one({"username_lower": data.username.lower().strip()}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.get("totp_enabled"):
        if not data.totp_code:
            return {"requires_2fa": True}
        secret = user.get("totp_secret") or user.get("two_factor_secret")
        if not secret:
            raise HTTPException(status_code=500, detail="2FA misconfigured")
        totp = pyotp.TOTP(secret)
        if not totp.verify(data.totp_code, valid_window=1):
            raise HTTPException(status_code=401, detail="Invalid 2FA code")
    session_id = str(uuid.uuid4())
    ua = request.headers.get("user-agent", "Unknown")
    now = datetime.now(timezone.utc).isoformat()
    await db.sessions.insert_one({
        "id": session_id,
        "user_id": user["id"],
        "user_agent": ua[:256],
        "ip": request.client.host if request.client else "unknown",
        "created_at": now,
        "last_active": now,
        "revoked": False
    })
    token = create_token(user["id"], user["username"], user["role"], session_id)
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "reputation": user.get("reputation", 0),
            "trust_level": user.get("trust_level", 0),
            "bio": user.get("bio", ""),
            "article_count": user.get("article_count", 0),
            "badges": user.get("badges", []),
            "social_links": user.get("social_links", {}),
            "created_at": user["created_at"]
        }
    }


@router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return {
        "id": user["id"],
        "username": user["username"],
        "role": user["role"],
        "reputation": user.get("reputation", 0),
        "trust_level": user.get("trust_level", 0),
        "bio": user.get("bio", ""),
        "email": user.get("email"),
        "article_count": user.get("article_count", 0),
        "comment_count": user.get("comment_count", 0),
        "badges": user.get("badges", []),
        "created_at": user["created_at"],
        "totp_enabled": user.get("totp_enabled", False),
        "preferred_lang": user.get("preferred_lang", "de"),
        "social_links": user.get("social_links", {}),
        "notification_prefs": user.get("notification_prefs", {
            "articles": True, "comments": True, "votes": True,
            "badges": True, "moderation": True, "system": True,
            "email": {"articles": True, "comments": True, "votes": False, "badges": True, "moderation": True, "system": True}
        })
    }


@router.put("/auth/profile")
async def update_profile(data: UserProfileUpdate, user=Depends(get_current_user)):
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if data.bio is not None:
        updates["bio"] = data.bio
    if data.email is not None:
        updates["email"] = data.email
    if data.notification_prefs is not None:
        updates["notification_prefs"] = data.notification_prefs
    if data.social_links is not None:
        allowed_keys = {"github", "gitlab", "xing", "reddit", "mastodon", "arch_wiki", "website"}
        cleaned = {}
        for k, v in data.social_links.items():
            if k in allowed_keys and isinstance(v, str):
                cleaned[k] = v.strip()[:200]
        updates["social_links"] = cleaned
    await db.users.update_one({"id": user["id"]}, {"$set": updates})
    return {"message": "Profile updated"}


@router.put("/auth/change-password")
async def change_password(data: ChangePasswordRequest, user=Depends(get_current_user)):
    full_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if not verify_password(data.current_password, full_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"password_hash": hash_password(data.new_password), "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Password changed successfully"}


@router.put("/auth/change-username")
async def change_username(data: ChangeUsernameRequest, user=Depends(get_current_user)):
    full_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if not verify_password(data.password, full_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Password is incorrect")
    new_lower = data.new_username.lower().strip()
    if not re.match(r'^[a-z0-9_-]+$', new_lower):
        raise HTTPException(status_code=400, detail="Username may only contain letters, numbers, hyphens and underscores")
    blocked = await db.blocked_usernames.find_one({"username": new_lower})
    if blocked:
        raise HTTPException(status_code=400, detail="This username is not allowed")
    existing = await db.users.find_one({"username_lower": new_lower})
    if existing and existing["id"] != user["id"]:
        raise HTTPException(status_code=409, detail="Username already taken")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"username": data.new_username.strip(), "username_lower": new_lower, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    await db.articles.update_many({"author_id": user["id"]}, {"$set": {"author_username": data.new_username.strip()}})
    await db.scripts.update_many({"author_id": user["id"]}, {"$set": {"author_username": data.new_username.strip()}})
    await db.comments.update_many({"author_id": user["id"]}, {"$set": {"author_username": data.new_username.strip()}})
    await db.questions.update_many({"author_id": user["id"]}, {"$set": {"author_username": data.new_username.strip()}})
    await db.answers.update_many({"author_id": user["id"]}, {"$set": {"author_username": data.new_username.strip()}})
    return {"message": "Username changed", "new_username": data.new_username.strip()}


@router.delete("/auth/delete-account")
async def delete_own_account(data: DeleteAccountRequest, user=Depends(get_current_user)):
    if user["role"] == "admin":
        raise HTTPException(status_code=403, detail="Admin accounts cannot be self-deleted")
    if data.confirmation != "DELETE":
        raise HTTPException(status_code=400, detail="Confirmation must be 'DELETE'")
    full_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if not verify_password(data.password, full_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Password is incorrect")
    anon = f"gelöscht_{uuid.uuid4().hex[:8]}"
    await db.articles.update_many({"author_id": user["id"]}, {"$set": {"author_id": "deleted", "author_username": anon}})
    await db.scripts.update_many({"author_id": user["id"]}, {"$set": {"author_id": "deleted", "author_username": anon}})
    await db.comments.update_many({"author_id": user["id"]}, {"$set": {"author_id": "deleted", "author_username": anon}})
    await db.questions.update_many({"author_id": user["id"]}, {"$set": {"author_id": "deleted", "author_username": anon}})
    await db.answers.update_many({"author_id": user["id"]}, {"$set": {"author_id": "deleted", "author_username": anon}})
    await db.sessions.delete_many({"user_id": user["id"]})
    await db.notifications.delete_many({"user_id": user["id"]})
    await db.bookmarks.delete_many({"user_id": user["id"]})
    await db.votes.delete_many({"user_id": user["id"]})
    await db.data_exports.delete_many({"user_id": user["id"]})
    await db.users.delete_one({"id": user["id"]})
    return {"message": "Account deleted"}


@router.get("/auth/sessions")
async def list_sessions(user=Depends(get_current_user)):
    sessions = await db.sessions.find(
        {"user_id": user["id"], "revoked": False},
        {"_id": 0, "user_id": 0}
    ).sort("last_active", -1).to_list(50)
    current_sid = user.get("_current_session_id")
    for s in sessions:
        s["is_current"] = s["id"] == current_sid
    return sessions


@router.delete("/auth/sessions/{session_id}")
async def revoke_session(session_id: str, user=Depends(get_current_user)):
    result = await db.sessions.update_one(
        {"id": session_id, "user_id": user["id"], "revoked": False},
        {"$set": {"revoked": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session revoked"}


@router.delete("/auth/sessions")
async def revoke_all_sessions(user=Depends(get_current_user)):
    current_sid = user.get("_current_session_id")
    await db.sessions.update_many(
        {"user_id": user["id"], "revoked": False, "id": {"$ne": current_sid}},
        {"$set": {"revoked": True}}
    )
    return {"message": "All other sessions revoked"}


@router.post("/auth/data-export/request")
async def request_data_export(data: DataExportRequest, user=Depends(get_current_user)):
    full_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if not full_user or not verify_password(data.password, full_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Invalid password")
    existing = await db.data_exports.find_one(
        {"user_id": user["id"], "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}},
        {"_id": 0, "data": 0}
    )
    if existing:
        return {"status": "ready", "export_id": existing["id"], "expires_at": existing["expires_at"]}
    articles = await db.articles.find({"author_id": user["id"]}, {"_id": 0}).to_list(1000)
    comments = await db.comments.find({"author_id": user["id"]}, {"_id": 0}).to_list(1000)
    questions = await db.questions.find({"author_id": user["id"]}, {"_id": 0}).to_list(1000)
    answers = await db.answers.find({"author_id": user["id"]}, {"_id": 0}).to_list(1000)
    scripts = await db.scripts.find({"author_id": user["id"]}, {"_id": 0}).to_list(1000)
    votes = await db.votes.find({"user_id": user["id"]}, {"_id": 0}).to_list(5000)
    bookmarks = await db.bookmarks.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    notifications = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    user_data = {k: v for k, v in full_user.items() if k != "password_hash"}
    now = datetime.now(timezone.utc)
    export_id = str(uuid.uuid4())
    export_doc = {
        "id": export_id,
        "user_id": user["id"],
        "username": user["username"],
        "created_by": user["username"],
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(hours=48)).isoformat(),
        "data": {
            "user": user_data, "articles": articles, "comments": comments,
            "questions": questions, "answers": answers, "scripts": scripts,
            "votes": votes, "bookmarks": bookmarks, "notifications": notifications
        }
    }
    await db.data_exports.insert_one(export_doc)
    return {
        "status": "ready", "export_id": export_id, "expires_at": export_doc["expires_at"],
        "stats": {
            "articles": len(articles), "comments": len(comments), "questions": len(questions),
            "answers": len(answers), "scripts": len(scripts), "votes": len(votes), "bookmarks": len(bookmarks)
        }
    }


@router.get("/auth/data-export/status")
async def get_export_status(user=Depends(get_current_user)):
    export = await db.data_exports.find_one({"user_id": user["id"]}, {"_id": 0, "data": 0})
    if not export:
        return {"status": "none"}
    now = datetime.now(timezone.utc).isoformat()
    if now > export["expires_at"]:
        await db.data_exports.delete_many({"user_id": user["id"], "expires_at": {"$lt": now}})
        return {"status": "expired"}
    return {"status": "ready", "export_id": export["id"], "expires_at": export["expires_at"], "created_at": export["created_at"]}


@router.get("/auth/data-export/download")
async def download_own_export(user=Depends(get_current_user)):
    export = await db.data_exports.find_one({"user_id": user["id"]}, {"_id": 0})
    if not export:
        raise HTTPException(status_code=404, detail="No export found")
    if datetime.now(timezone.utc).isoformat() > export["expires_at"]:
        raise HTTPException(status_code=410, detail="Export expired (48h limit)")
    return export["data"]


@router.post("/auth/2fa/setup")
async def setup_2fa(user=Depends(get_current_user)):
    full_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if full_user.get("totp_enabled"):
        raise HTTPException(status_code=400, detail="2FA already enabled")
    secret = pyotp.random_base32()
    await db.users.update_one({"id": user["id"]}, {"$set": {"totp_secret": secret}})
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=user["username"], issuer_name="ArchHub")
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode()
    return {"secret": secret, "qr_code": f"data:image/png;base64,{qr_b64}", "uri": uri}


@router.post("/auth/2fa/enable")
async def enable_2fa(data: TOTPVerify, user=Depends(get_current_user)):
    full_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    secret = full_user.get("totp_secret")
    if not secret:
        raise HTTPException(status_code=400, detail="Setup 2FA first")
    totp = pyotp.TOTP(secret)
    if not totp.verify(data.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid code")
    await db.users.update_one({"id": user["id"]}, {"$set": {"totp_enabled": True}})
    return {"message": "2FA enabled"}


@router.post("/auth/2fa/disable")
async def disable_2fa(data: TOTPVerify, user=Depends(get_current_user)):
    full_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if not full_user.get("totp_enabled"):
        raise HTTPException(status_code=400, detail="2FA not enabled")
    totp = pyotp.TOTP(full_user.get("totp_secret", ""))
    if not totp.verify(data.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid code")
    await db.users.update_one({"id": user["id"]}, {"$set": {"totp_enabled": False, "totp_secret": None}})
    return {"message": "2FA disabled"}
