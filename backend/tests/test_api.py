from datetime import date, timedelta

from app.db import SessionLocal
from app.models import Document
from app.services import llm, rag
from tests.conftest import make_user

QUIZ = [{"question": "2+2?", "options": ["3", "4", "5", "6"], "answer_index": 1, "explanation": "Math"},
        {"question": "Capital of France?", "options": ["Paris", "Rome"], "answer_index": 0, "explanation": "Geo"}]


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_auth_flow(client):
    make_user(client)
    assert client.post("/api/auth/register", json={"email": "a@studymind-test.com", "name": "x", "password": "password123"}).status_code == 409
    assert client.post("/api/auth/login", json={"email": "a@studymind-test.com", "password": "wrong-pass"}).status_code == 401
    r = client.post("/api/auth/login", json={"email": "a@studymind-test.com", "password": "password123"})
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {r.json()['access_token']}"})
    assert me.json()["name"] == "Asha"


def test_short_password_rejected(client):
    r = client.post("/api/auth/register", json={"email": "c@studymind-test.com", "name": "C", "password": "short"})
    assert r.status_code == 422


def test_protected_routes_need_token(client):
    for path in ("/api/documents", "/api/planner/tasks", "/api/progress"):
        assert client.get(path).status_code == 401


def test_missing_gemini_key_gives_clear_error(client, user_a):
    r = client.post("/api/tutor/chat", headers=user_a, json={"messages": [{"role": "user", "content": "hi"}]})
    assert r.status_code == 502 and "GEMINI_API_KEY" in r.json()["detail"]


def test_tutor_chat(client, user_a, monkeypatch):
    monkeypatch.setattr(llm, "generate", lambda p, system=None: "Hello student")
    r = client.post("/api/tutor/chat", headers=user_a, json={"messages": [{"role": "user", "content": "hi"}]})
    assert r.json()["reply"] == "Hello student"
    assert client.get("/api/progress", headers=user_a).json()["sessions"] == 1


def test_upload_rejects_non_pdf(client, user_a):
    r = client.post("/api/documents", headers=user_a, files={"file": ("notes.pdf", b"not a pdf", "application/pdf")})
    assert r.status_code == 415


def test_documents_are_private(client, user_a, user_b):
    with SessionLocal() as db:
        d = Document(user_id=1, title="Secret notes", status="ready")
        db.add(d)
        db.commit()
        doc_id = d.id
    assert len(client.get("/api/documents", headers=user_a).json()) == 1
    assert client.get("/api/documents", headers=user_b).json() == []
    assert client.delete(f"/api/documents/{doc_id}", headers=user_b).status_code == 404
    assert client.delete(f"/api/documents/{doc_id}", headers=user_a).status_code == 204


def test_chunking_keeps_page_numbers():
    chunks = rag.chunk_pages([(1, "a" * 2500), (2, "b" * 500)])
    assert {p for p, _ in chunks} == {1, 2}
    assert all(len(t) <= 1000 for _, t in chunks)


def test_quiz_hides_answers_and_scores_on_server(client, user_a, user_b, monkeypatch):
    monkeypatch.setattr(llm, "generate_json", lambda p: QUIZ)
    r = client.post("/api/quizzes/generate", headers=user_a, json={"topic": "Basics", "num_questions": 2})
    body = r.json()
    assert "answer_index" not in body["questions"][0]
    qid = body["quiz_id"]
    assert client.post(f"/api/quizzes/{qid}/submit", headers=user_b, json={"answers": [1, 0]}).status_code == 404
    res = client.post(f"/api/quizzes/{qid}/submit", headers=user_a, json={"answers": [1, 1]}).json()
    assert (res["score"], res["total"]) == (1, 2)
    prog = client.get("/api/progress", headers=user_a).json()
    assert prog["quizzes_taken"] == 1 and prog["average_quiz_score"] == 50


def test_invalid_ai_quiz_is_rejected(client, user_a, monkeypatch):
    monkeypatch.setattr(llm, "generate_json", lambda p: [{"question": "?", "options": ["a", "b"], "answer_index": 9}])
    r = client.post("/api/quizzes/generate", headers=user_a, json={"topic": "x"})
    assert r.status_code == 502


def test_planner_generate_and_complete_task(client, user_a, user_b, monkeypatch):
    monkeypatch.setattr(llm, "generate_json", lambda p: [
        {"day": "Day 1", "task": "Read chapter 1", "kind": "Study", "minutes": 45},
        {"day": "Day 2", "task": "Quiz yourself", "kind": "Practice", "minutes": 30}])
    exam = (date.today() + timedelta(days=10)).isoformat()
    tasks = client.post("/api/planner/generate", headers=user_a,
                        json={"subjects": "OS", "exam_date": exam}).json()
    assert len(tasks) == 2
    tid = tasks[0]["id"]
    assert client.patch(f"/api/planner/tasks/{tid}", headers=user_b, json={"done": True}).status_code == 404
    assert client.patch(f"/api/planner/tasks/{tid}", headers=user_a, json={"done": True}).json()["done"] is True
    assert client.get("/api/progress", headers=user_a).json()["tasks_done"] == 1


def test_planner_rejects_past_exam(client, user_a):
    r = client.post("/api/planner/generate", headers=user_a,
                    json={"subjects": "OS", "exam_date": (date.today() - timedelta(days=1)).isoformat()})
    assert r.status_code == 422


def test_progress_empty_state(client, user_a):
    p = client.get("/api/progress", headers=user_a).json()
    assert p["sessions"] == 0 and p["average_quiz_score"] is None


def test_agent_pipeline_reports_real_steps(client, user_a, monkeypatch):
    monkeypatch.setattr(llm, "generate_json", lambda p: {"agents": ["explain", "quiz"], "topic": "Virtual memory"}
                        if "route" in p else QUIZ)
    monkeypatch.setattr(llm, "generate", lambda p, system=None: "Explanation text")
    r = client.post("/api/agents/run", headers=user_a, json={"request": "Explain virtual memory and test me"}).json()
    assert [s["agent"] for s in r["steps"]] == ["Planner Agent", "Explanation Agent", "Quiz Agent"]
    assert all(s["status"] == "done" for s in r["steps"])
    assert r["explanation"] == "Explanation text"


def test_agent_failure_is_reported_not_hidden(client, user_a):
    r = client.post("/api/agents/run", headers=user_a, json={"request": "Explain TCP"}).json()
    assert r["failed"] is True and r["steps"][0]["status"] == "failed"
