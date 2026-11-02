import time
from collections import defaultdict, deque

import bcrypt
import jwt
from fastapi import HTTPException, Request

from app.core.config import get_settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode()[:72], bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode()[:72], hashed.encode())
    except ValueError:
        return False


def create_token(user_id: int) -> str:
    s = get_settings()
    payload = {"sub": str(user_id), "exp": int(time.time()) + s.access_token_minutes * 60}
    return jwt.encode(payload, s.secret_key, algorithm="HS256")


def decode_token(token: str) -> int | None:
    try:
        data = jwt.decode(token, get_settings().secret_key, algorithms=["HS256"])
        return int(data["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None


_hits: dict[str, deque] = defaultdict(deque)


def rate_limit(max_calls: int, per_seconds: int):
    """Simple in-memory limiter (per IP + path). Fine for one server;
    use Redis if you scale to several instances."""
    def dep(request: Request):
        ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "x")
        key = f"{ip}:{request.url.path}"
        now = time.time()
        q = _hits[key]
        while q and q[0] < now - per_seconds:
            q.popleft()
        if len(q) >= max_calls:
            raise HTTPException(429, "Too many requests. Please wait a moment.")
        q.append(now)
    return dep
