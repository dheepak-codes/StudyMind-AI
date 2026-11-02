from fastapi import HTTPException

from app.services import llm

SCHEMA = '[{"question":"...","options":["A","B","C","D"],"answer_index":0,"explanation":"..."}]'


def validate_questions(raw) -> list[dict]:
    """AI output is untrusted: check the shape before saving or showing it."""
    if isinstance(raw, dict):
        raw = raw.get("questions", [])
    if not isinstance(raw, list) or not raw:
        raise llm.LLMError("The AI returned an invalid quiz. Please try again.")
    out = []
    for q in raw:
        try:
            opts = [str(o) for o in q["options"]]
            idx = q["answer_index"]
            if len(opts) < 2 or not isinstance(idx, int) or not 0 <= idx < len(opts):
                raise ValueError
            out.append({"question": str(q["question"]), "options": opts,
                        "answer_index": idx, "explanation": str(q.get("explanation", ""))})
        except (KeyError, TypeError, ValueError):
            raise llm.LLMError("The AI returned a malformed question. Please try again.")
    return out


def generate_questions(topic: str, difficulty: str, n: int, source: str = "") -> list[dict]:
    prompt = (f"Write {n} {difficulty} multiple-choice questions about: {topic}.\n"
              + (f"Base them ONLY on these study notes:\n{source}\n" if source else "")
              + f"Exactly 4 options each, one correct. Reply as JSON: {SCHEMA}")
    return validate_questions(llm.generate_json(prompt))
