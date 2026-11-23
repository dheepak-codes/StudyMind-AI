from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db import get_db
from app.models import Activity, User

bearer = HTTPBearer(auto_error=False)


def current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    """Every protected route depends on this. Authorization is checked on the server."""
    user_id = decode_token(creds.credentials) if creds else None
    user = db.get(User, user_id) if user_id else None
    if not user:
        raise HTTPException(401, "Not authenticated")
    return user


def log_activity(db: Session, user: User, kind: str, title: str):
    db.add(Activity(user_id=user.id, kind=kind, title=title[:200]))
    db.commit()
