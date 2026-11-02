from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import rate_limit
from app.db import get_db
from app.deps import current_user, log_activity
from app.models import User
from app.schemas import ChatIn
from app.services import llm

router = APIRouter(prefix="/api/tutor", tags=["tutor"])

SYSTEM = ("You are a patient study tutor. Explain step by step, give examples, "
          "use code blocks for code, and keep answers focused.")


@router.post("/chat", dependencies=[Depends(rate_limit(30, 60))])
def chat(body: ChatIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if body.messages[-1].role != "user":
        raise HTTPException(422, "The last message must come from the user.")
    transcript = "\n".join(f"{'Student' if m.role == 'user' else 'Tutor'}: {m.content}" for m in body.messages)
    try:
        reply = llm.generate(transcript + "\nTutor:", system=SYSTEM)
    except llm.LLMError as e:
        raise HTTPException(502, str(e))
    if len(body.messages) == 1:  # count a new conversation once
        log_activity(db, user, "tutor", body.messages[0].content)
    return {"reply": reply}
