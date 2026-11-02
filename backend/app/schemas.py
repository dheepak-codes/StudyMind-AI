from datetime import date
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class RegisterIn(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: str
    name: str


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=30000)


class ChatIn(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=30)


class AskIn(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    document_ids: list[int] | None = None


class QuizGenerateIn(BaseModel):
    topic: str = Field(default="", max_length=200)
    document_id: int | None = None
    difficulty: Literal["Easy", "Medium", "Hard"] = "Medium"
    num_questions: int = Field(default=5, ge=1, le=15)


class QuizSubmitIn(BaseModel):
    answers: list[int]  # chosen option index per question, in order


class PlanGenerateIn(BaseModel):
    subjects: str = Field(min_length=1, max_length=500)
    exam_date: date
    hours_per_day: float = Field(default=3, gt=0, le=16)
    session_minutes: int = Field(default=45, ge=15, le=180)


class TaskPatch(BaseModel):
    done: bool


class AgentRunIn(BaseModel):
    request: str = Field(min_length=1, max_length=2000)
    document_ids: list[int] | None = None
