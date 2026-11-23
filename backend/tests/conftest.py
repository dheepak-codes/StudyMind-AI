import os

os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["SECRET_KEY"] = "test-secret"
os.environ["GEMINI_API_KEY"] = ""

import pytest
from fastapi.testclient import TestClient

from app.core import security
from app.db import Base, engine
from app.main import app


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    security._hits.clear()  # reset rate limiter between tests
    yield


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def make_user(client, email="a@studymind-test.com"):
    r = client.post("/api/auth/register", json={"email": email, "name": "Asha", "password": "password123"})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def user_a(client):
    return make_user(client, "a@studymind-test.com")


@pytest.fixture
def user_b(client):
    return make_user(client, "b@studymind-test.com")
