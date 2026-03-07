"""Authentication helper services."""
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
from fastapi import HTTPException
from slugify import slugify
from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRY_MINUTES

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(user_id: str, username: str, role: str, session_id: str = None) -> str:
    payload = {
        "sub": user_id,
        "username": username,
        "role": role,
        "sid": session_id or str(uuid.uuid4()),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRY_MINUTES)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def generate_unique_slug(base: str) -> str:
    slug = slugify(base, max_length=80)
    return f"{slug}-{uuid.uuid4().hex[:6]}"
