from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import current_user
from app.models import Activity, Document, QuizAttempt, StudyTask, User

router = APIRouter(prefix="/api/progress", tags=["progress"])


@router.get("")
def progress(user: User = Depends(current_user), db: Session = Depends(get_db)):
    count = lambda col, *w: db.scalar(select(func.count(col)).where(*w)) or 0  # noqa: E731
    attempts = db.scalars(select(QuizAttempt).where(QuizAttempt.user_id == user.id)
                          .order_by(QuizAttempt.created_at.desc())).all()
    avg = round(sum(a.score / a.total for a in attempts) / len(attempts) * 100) if attempts else None
    recent = db.scalars(select(Activity).where(Activity.user_id == user.id)
                        .order_by(Activity.created_at.desc()).limit(8)).all()
    return {
        "sessions": count(Activity.id, Activity.user_id == user.id),
        "documents": count(Document.id, Document.user_id == user.id),
        "quizzes_taken": len(attempts),
        "average_quiz_score": avg,  # null when there is no data: the UI shows an empty state
        "tasks_total": count(StudyTask.id, StudyTask.user_id == user.id),
        "tasks_done": count(StudyTask.id, StudyTask.user_id == user.id, StudyTask.done.is_(True)),
        "recent_quizzes": [{"topic": a.topic, "score": a.score, "total": a.total,
                            "at": a.created_at.isoformat()} for a in attempts[:8]],
        "recent_activity": [{"kind": a.kind, "title": a.title, "at": a.created_at.isoformat()} for a in recent],
    }
