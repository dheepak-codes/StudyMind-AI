from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.agents import pipeline
from app.core.security import rate_limit
from app.db import get_db
from app.deps import current_user, log_activity
from app.models import Document, User
from app.schemas import AgentRunIn

router = APIRouter(prefix="/api/agents", tags=["agents"])


@router.post("/run", dependencies=[Depends(rate_limit(10, 60))])
def run(body: AgentRunIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    ready = db.scalar(select(func.count()).select_from(Document)
                      .where(Document.user_id == user.id, Document.status == "ready"))
    result = pipeline.run(db, user.id, body.request, body.document_ids, has_docs=bool(ready))
    log_activity(db, user, "agents", body.request)
    return result
