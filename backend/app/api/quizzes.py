from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.documents import own_doc
from app.core.security import rate_limit
from app.db import get_db
from app.deps import current_user, log_activity
from app.models import Quiz, QuizAttempt, User
from app.schemas import QuizGenerateIn, QuizSubmitIn
from app.services import llm, quiz as quiz_service, rag

router = APIRouter(prefix="/api/quizzes", tags=["quizzes"])


@router.post("/generate", dependencies=[Depends(rate_limit(15, 60))])
def generate(body: QuizGenerateIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    topic, source = body.topic.strip(), ""
    if body.document_id:
        doc = own_doc(db, user, body.document_id)
        topic = topic or doc.title
        try:
            passages = rag.retrieve(db, user.id, topic, [doc.id], k=5)
        except llm.LLMError as e:
            raise HTTPException(502, str(e))
        source = rag.format_context(passages)
    if not topic:
        raise HTTPException(422, "Provide a topic or a document.")
    try:
        questions = quiz_service.generate_questions(topic, body.difficulty, body.num_questions, source)
    except llm.LLMError as e:
        raise HTTPException(502, str(e))
    quiz = Quiz(user_id=user.id, topic=topic[:255], difficulty=body.difficulty, questions=questions)
    db.add(quiz)
    db.commit()
    # correct answers stay on the server until the quiz is submitted
    return {"quiz_id": quiz.id, "topic": topic,
            "questions": [{"question": q["question"], "options": q["options"]} for q in questions]}


@router.post("/{quiz_id}/submit")
def submit(quiz_id: int, body: QuizSubmitIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    quiz = db.get(Quiz, quiz_id)
    if not quiz or quiz.user_id != user.id:
        raise HTTPException(404, "Quiz not found.")
    if len(body.answers) != len(quiz.questions):
        raise HTTPException(422, "Answer every question.")
    results = [{"correct": a == q["answer_index"], "your_answer": a,
                "correct_index": q["answer_index"], "explanation": q["explanation"]}
               for a, q in zip(body.answers, quiz.questions)]  # scoring happens on the server
    score = sum(r["correct"] for r in results)
    db.add(QuizAttempt(user_id=user.id, quiz_id=quiz.id, topic=quiz.topic, score=score, total=len(results)))
    db.commit()
    log_activity(db, user, "quiz", quiz.topic)
    return {"score": score, "total": len(results), "results": results}
