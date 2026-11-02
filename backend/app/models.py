from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Document(Base):
    __tablename__ = "documents"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    file_type: Mapped[str] = mapped_column(String(20), default="pdf")
    status: Mapped[str] = mapped_column(String(20), default="processing")  # processing|ready|failed
    error: Mapped[str | None] = mapped_column(String(300), nullable=True)
    page_count: Mapped[int] = mapped_column(Integer, default=0)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    chunks: Mapped[list["Chunk"]] = relationship(cascade="all, delete-orphan")


class Chunk(Base):
    __tablename__ = "chunks"
    id: Mapped[int] = mapped_column(primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("documents.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    idx: Mapped[int] = mapped_column(Integer)
    page: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list] = mapped_column(JSON)


class Quiz(Base):
    __tablename__ = "quizzes"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    topic: Mapped[str] = mapped_column(String(255))
    difficulty: Mapped[str] = mapped_column(String(20))
    questions: Mapped[list] = mapped_column(JSON)  # includes answers; never sent before submit
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    quiz_id: Mapped[int] = mapped_column(ForeignKey("quizzes.id"))
    topic: Mapped[str] = mapped_column(String(255))
    score: Mapped[int] = mapped_column(Integer)
    total: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class StudyTask(Base):
    __tablename__ = "study_tasks"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    plan_name: Mapped[str] = mapped_column(String(255))
    day: Mapped[str] = mapped_column(String(50))
    task: Mapped[str] = mapped_column(String(500))
    kind: Mapped[str] = mapped_column(String(20), default="Study")
    minutes: Mapped[int] = mapped_column(Integer, default=45)
    done: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Activity(Base):
    """One row per learning session (tutor chat, notes question, quiz, agent run...)."""
    __tablename__ = "activities"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    kind: Mapped[str] = mapped_column(String(30))
    title: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
