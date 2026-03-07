"""Authentication dependencies and role checks."""
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import db
from services.auth_service import decode_token

security = HTTPBearer(auto_error=False)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    sid = payload.get("sid")
    if sid:
        session = await db.sessions.find_one({"id": sid, "user_id": user["id"], "revoked": False})
        if not session:
            raise HTTPException(status_code=401, detail="Session revoked")
        from datetime import datetime, timezone
        await db.sessions.update_one({"id": sid}, {"$set": {"last_active": datetime.now(timezone.utc).isoformat()}})
    user["_current_session_id"] = sid
    return user


async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        return user
    except Exception:
        return None


def require_moderator(user):
    if user["role"] not in ["moderator", "admin"]:
        raise HTTPException(status_code=403, detail="Moderator access required")


def require_admin(user):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


async def require_2fa(user):
    if user["role"] in ["admin", "moderator"]:
        return
    full = await db.users.find_one({"id": user["id"]}, {"_id": 0, "totp_enabled": 1})
    if not full or not full.get("totp_enabled"):
        raise HTTPException(status_code=403, detail="2FA_REQUIRED")
