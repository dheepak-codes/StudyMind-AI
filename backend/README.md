# StudyMind AI — Backend

FastAPI + SQLAlchemy + Gemini. Provides auth, an AI tutor, PDF notes with RAG, quizzes,
a study planner, a multi-agent pipeline and real progress statistics.

## Run locally
```bash
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # then set SECRET_KEY and GEMINI_API_KEY (free key: aistudio.google.com)
uvicorn app.main:app --reload
```
Open http://localhost:8000/docs for interactive API docs. Tables are created on first start
(SQLite by default; set `DATABASE_URL` to PostgreSQL for production).

## Tests
```bash
pytest -v
```
The AI is mocked in tests, so no API key or internet is needed.

## Architecture
```
app/
  main.py          app, CORS, routers, /health
  core/            settings (env vars), password hashing, JWT, rate limiter
  models.py        User, Document, Chunk, Quiz, QuizAttempt, StudyTask, Activity
  api/             one file per feature (auth, tutor, documents, quizzes, planner, agents, progress)
  services/        llm.py (Gemini), rag.py (PDF -> chunks -> embeddings -> search), quiz.py (validation)
  agents/          pipeline.py: Planner -> Research -> Explanation / Quiz / Study-plan agents
```
**RAG:** PDF text is extracted with pypdf (keeping page numbers), split into ~1000-character
overlapping chunks, embedded with Gemini, and stored in the database. A question is embedded the
same way and compared with cosine similarity (numpy) against the *current user's* chunks only.

**Agents:** a plain-Python orchestrator. The Planner decides which agents to run; each step records
its true status and measured time, and a failing step is reported, never hidden.

## API summary
| Method | Path | Purpose |
|---|---|---|
| POST | /api/auth/register, /login | Create account / get token |
| GET | /api/auth/me | Current user |
| POST | /api/tutor/chat | `{messages:[{role,content}]}` -> `{reply}` |
| POST/GET | /api/documents | Upload PDF (multipart `file`) / list |
| DELETE | /api/documents/{id} | Delete |
| POST | /api/documents/ask | Question over your notes, returns sources with pages |
| POST | /api/documents/{id}/summary | Revision notes |
| POST | /api/quizzes/generate, /{id}/submit | Generate (no answers sent) / score on server |
| POST | /api/planner/generate | Create plan |
| GET/PATCH | /api/planner/tasks, /tasks/{id} | List / mark done |
| POST | /api/agents/run | Multi-agent run with real step log |
| GET | /api/progress | Real statistics (null when no data) |

Send `Authorization: Bearer <token>` on everything except register/login/health.

## Deploy (Render + hosted PostgreSQL)
1. Push the repo to GitHub (`.env` and `*.db` are git-ignored).
2. Create a PostgreSQL database (Render, Neon or Supabase) and copy its connection URL.
3. On Render: New Web Service -> your repo. Root directory `backend`, build `pip install -r requirements.txt`,
   start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, health check `/health` (`render.yaml` has this).
4. Set env vars: `DATABASE_URL`, `SECRET_KEY` (long random), `GEMINI_API_KEY`,
   `CORS_ORIGINS=https://your-site.netlify.app`.
5. In Netlify set `VITE_API_URL` to the Render URL (not a secret: it is public).

## Known limitations
- Scanned/image-only PDFs are rejected (no OCR). Password-protected PDFs are rejected.
- Uploaded PDFs are processed synchronously; large files make the request slow. Original files are not stored, only text + embeddings.
- Embeddings are compared with numpy, fine for personal notes; use FAISS/pgvector for very large libraries.
- Rate limiter is in-memory (per server instance). Tables are created automatically; there are no Alembic migrations yet.
- Render's free tier sleeps when idle, so the first request can be slow.
- No password reset or email verification. Tokens last 24 hours and there is no refresh/logout revocation.
