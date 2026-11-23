"""Multi-agent orchestration, written as plain Python so it is easy to explain:
Planner -> (Research) -> Explanation / Quiz / Study-plan agents.
Every step records its REAL status and duration; nothing is simulated.
(You can port this to LangGraph later: each function below becomes a graph node.)"""
import time

from sqlalchemy.orm import Session

from app.services import llm, quiz as quiz_service, rag

ALLOWED = {"research", "explain", "quiz", "plan"}


def planner_agent(request: str, has_docs: bool) -> dict:
    data = llm.generate_json(
        "You route study requests. Choose which agents to run from: research (look in the "
        "student's uploaded notes), explain, quiz, plan (study schedule).\n"
        f"Student has uploaded notes: {has_docs}\nRequest: {request}\n"
        'Reply as JSON: {"agents": ["..."], "topic": "short topic"}'
    )
    if not isinstance(data, dict):
        raise llm.LLMError("The planner returned an unexpected format. Please try again.")
    agents = [a for a in data.get("agents", []) if a in ALLOWED]
    if not agents:
        agents = ["explain"]
    if "research" in agents and not has_docs:
        agents.remove("research")
    return {"agents": agents, "topic": str(data.get("topic") or request)[:200]}


def run(db: Session, user_id: int, request: str, document_ids: list[int] | None, has_docs: bool) -> dict:
    steps: list[dict] = []
    result: dict = {"steps": steps}

    def step(name: str, fn):
        t0 = time.perf_counter()
        try:
            value = fn()
            steps.append({"agent": name, "status": "done", "seconds": round(time.perf_counter() - t0, 2)})
            return value
        except Exception as e:
            steps.append({"agent": name, "status": "failed", "seconds": round(time.perf_counter() - t0, 2),
                          "error": str(e) if isinstance(e, llm.LLMError) else "Unexpected error"})
            raise

    try:
        plan = step("Planner Agent", lambda: planner_agent(request, has_docs))
        result["plan"] = plan
        passages: list[dict] = []
        if "research" in plan["agents"]:
            passages = step("Research Agent", lambda: rag.retrieve(db, user_id, f"{request} {plan['topic']}", document_ids))
            result["sources"] = [{k: p[k] for k in ("document", "page", "score")} for p in passages]
        notes = rag.format_context(passages)
        grounding = f"\nUse ONLY these notes; if they are insufficient, say so:\n{notes}" if notes else ""
        if "explain" in plan["agents"]:
            result["explanation"] = step("Explanation Agent", lambda: llm.generate(
                f"Explain clearly for a student: {plan['topic']}.{grounding}"))
        if "quiz" in plan["agents"]:
            result["quiz"] = step("Quiz Agent", lambda: quiz_service.generate_questions(
                plan["topic"], "Medium", 3, notes))  # practice only, so answers are included
        if "plan" in plan["agents"]:
            result["study_plan"] = step("Study Planner Agent", lambda: llm.generate(
                f"Create a short, practical study schedule for: {request}"))
    except Exception:
        result["failed"] = True  # the failing step is already recorded in `steps`
    return result
