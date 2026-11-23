# StudyMind AI

A full-stack AI study assistant: AI tutor, PDF notes with RAG, quizzes, study planner,
multi-agent pipeline and real progress tracking.

```
studymind-ai/
  frontend/   React + TypeScript + Vite + Tailwind  (deploy to Netlify)
  backend/    FastAPI + SQLAlchemy + Gemini         (deploy to Render)
```

## How the pieces work together
```
Browser (React) --/api/*--> FastAPI --> Gemini (tutor, quizzes, plans, embeddings)
                                   \--> Database (users, documents + embeddings, quizzes, tasks, activity)
```
- The browser never sees the Gemini key; only the backend has it.
- Login returns a JWT; the frontend sends it on every request. The backend checks it and
  only ever returns the logged-in user's own data.
- In development, Vite forwards `/api` to `localhost:8000`, so no CORS setup is needed.
  In production the frontend calls the URL in `VITE_API_URL`, and the backend allows it via `CORS_ORIGINS`.

## Run locally (two terminals)
**Terminal 1: backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env     # set SECRET_KEY and GEMINI_API_KEY (free key at aistudio.google.com)
uvicorn app.main:app --reload
```
**Terminal 2: frontend**
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173, create an account, and try each page.
API docs: http://localhost:8000/docs

## Tests
```bash
cd backend && pytest -v        # backend (AI mocked, no key needed)
cd frontend && npm run build   # type-checks and builds the frontend
```

## Deploy
1. **GitHub:** `git init && git add . && git commit -m "StudyMind AI" ` then push to a new repo.
2. **Database:** create a free PostgreSQL database (Neon, Supabase or Render) and copy its URL.
3. **Backend on Render:** New Web Service, root directory `backend`, build `pip install -r requirements.txt`,
   start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, health check `/health`.
   Environment: `DATABASE_URL`, `SECRET_KEY`, `GEMINI_API_KEY`, `CORS_ORIGINS` (set after step 4).
4. **Frontend on Netlify:** import the repo (settings come from `netlify.toml`).
   Environment variable: `VITE_API_URL=https://<your-render-service>.onrender.com`.
5. Go back to Render and set `CORS_ORIGINS=https://<your-site>.netlify.app`, then redeploy.
6. Open the Netlify URL, sign up, and test every page.

## Known limitations
- Scanned/image PDFs are not supported (no OCR); files up to 10 MB.
- Tutor chat history lives in the browser tab only (not saved to the database).
- Rate limiting is in-memory; no password reset or email verification; no database migrations yet.
- Render's free tier sleeps when idle, so the first request can take ~30 seconds.
