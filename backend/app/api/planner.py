from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.security import rate_limit
from app.db import get_db
from app.deps import current_user, log_activity
from app.models import StudyTask, User
from app.schemas import PlanGenerateIn, TaskPatch
from app.services import llm

router = APIRouter(prefix="/api/planner", tags=["planner"])
KINDS = {"Study", "Revision", "Practice"}


def task_out(t: StudyTask) -> dict:
    return {"id": t.id, "plan": t.plan_name, "day": t.day, "task": t.task,
            "kind": t.kind, "minutes": t.minutes, "done": t.done}


@router.post("/generate", dependencies=[Depends(rate_limit(10, 60))])
def generate(body: PlanGenerateIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    days = (body.exam_date - date.today()).days
    if days < 1:
        raise HTTPException(422, "The exam date must be in the future.")
    try:
        raw = llm.generate_json(
            f"Today is {date.today()}. Build a study plan for: {body.subjects}. The exam is in {days} days. "
            f"The student has {body.hours_per_day} hours per day, in sessions of {body.session_minutes} minutes. "
            f"Cover at most the next 7 days and include revision and practice sessions. "
            f'Reply as JSON: [{{"day":"Day 1","task":"...","kind":"Study|Revision|Practice","minutes":45}}]')
    except llm.LLMError as e:
        raise HTTPException(502, str(e))
    if isinstance(raw, dict):
        raw = raw.get("tasks", [])
    if not isinstance(raw, list) or not raw:
        raise HTTPException(502, "The AI returned an invalid plan. Please try again.")
    tasks = []
    for r in raw[:60]:
        try:
            tasks.append(StudyTask(
                user_id=user.id, plan_name=body.subjects[:255], day=str(r["day"])[:50], task=str(r["task"])[:500],
                kind=r.get("kind") if r.get("kind") in KINDS else "Study",
                minutes=max(5, min(int(r.get("minutes", body.session_minutes)), 300))))
        except (KeyError, TypeError, ValueError):
            raise HTTPException(502, "The AI returned a malformed plan. Please try again.")
    db.execute(delete(StudyTask).where(StudyTask.user_id == user.id))  # one active plan per user
    db.add_all(tasks)
    db.commit()
    log_activity(db, user, "plan", body.subjects)
    return [task_out(t) for t in tasks]


@router.get("/tasks")
def tasks(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(StudyTask).where(StudyTask.user_id == user.id).order_by(StudyTask.id))
    return [task_out(t) for t in rows]


@router.patch("/tasks/{task_id}")
def update_task(task_id: int, body: TaskPatch, user: User = Depends(current_user), db: Session = Depends(get_db)):
    t = db.get(StudyTask, task_id)
    if not t or t.user_id != user.id:
        raise HTTPException(404, "Task not found.")
    t.done = body.done
    db.commit()
    return task_out(t)
