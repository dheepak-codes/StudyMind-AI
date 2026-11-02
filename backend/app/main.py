from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401  (registers tables)
from app.api import agents, auth, documents, planner, progress, quizzes, tutor
from app.core.config import get_settings
from app.db import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    s = get_settings()
    if s.secret_key == "change-me" and not s.database_url.startswith("sqlite"):
        raise RuntimeError("Set a strong SECRET_KEY before running with a real database.")
    # Creates tables on first start. For schema changes later, add Alembic migrations.
    Base.metadata.create_all(engine)
    yield


app = FastAPI(title="StudyMind AI API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip().rstrip("/") for o in get_settings().cors_origins.split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth, tutor, documents, quizzes, planner, agents, progress):
    app.include_router(r.router)


@app.get("/health")
def health():
    return {"status": "ok"}
