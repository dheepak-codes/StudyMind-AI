"""Thin wrapper around the Gemini API. The API key stays on the server."""
import json
import re
import time
from typing import Any

from app.core.config import get_settings


class LLMError(Exception):
    """Raised for any AI problem; routes turn it into a clear HTTP error."""


def _client():
    key = get_settings().gemini_api_key
    if not key:
        raise LLMError("GEMINI_API_KEY is not configured on the server.")
    from google import genai  # imported lazily so the app can start without a key
    return genai.Client(api_key=key)


def generate(prompt: str, system: str | None = None) -> str:
    from google.genai import types
    try:
        res = _client().models.generate_content(
            model=get_settings().gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(system_instruction=system),
        )
    except LLMError:
        raise
    except Exception as e:  # network, quota, bad key...
        raise LLMError(f"AI request failed: {type(e).__name__}") from e
    if not res.text:
        raise LLMError("The AI returned an empty response.")
    return res.text


def generate_json(prompt: str) -> Any:
    from google.genai import types
    try:
        res = _client().models.generate_content(
            model=get_settings().gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
    except LLMError:
        raise
    except Exception as e:
        raise LLMError(f"AI request failed: {type(e).__name__}") from e
    text = re.sub(r"^```(?:json)?|```$", "", (res.text or "").strip()).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise LLMError("The AI returned invalid JSON. Please try again.") from e


def embed(texts: list[str]) -> list[list[float]]:
    from google.genai import types
    out: list[list[float]] = []
    client = _client()
    cfg = types.EmbedContentConfig(output_dimensionality=768)  # smaller vectors = much smaller database
    for i in range(0, len(texts), 50):  # batch to stay within API limits
        for attempt in range(3):  # retry a couple of times (free-tier rate limits)
            try:
                res = client.models.embed_content(
                    model=get_settings().embedding_model, contents=texts[i:i + 50], config=cfg)
                out.extend(list(e.values) for e in res.embeddings)
                break
            except Exception as e:
                if attempt == 2:
                    raise LLMError(f"Embedding request failed: {type(e).__name__}") from e
                time.sleep(4 * (attempt + 1))
    return out
