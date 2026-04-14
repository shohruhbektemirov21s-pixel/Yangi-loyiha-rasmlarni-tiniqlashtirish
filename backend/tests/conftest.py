from __future__ import annotations

import sys
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

# Model importlari — Base.metadata uchun
from app.db.base import Base  # noqa: E402
from app.models import daily_usage, image_job, revoked_token, user, user_subscription  # noqa: F401,E402


@pytest.fixture
def engine():
    eng = create_engine("sqlite+pysqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=eng)
    try:
        yield eng
    finally:
        Base.metadata.drop_all(bind=eng)


@pytest.fixture(autouse=True)
def _patch_app_session_engine(engine, monkeypatch: pytest.MonkeyPatch) -> None:
    """TestClient lifespan va get_db bir xil in-memory SQLite ishlatishi uchun."""
    import app.db.session as session_mod

    monkeypatch.setattr(session_mod, "engine", engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    monkeypatch.setattr(session_mod, "SessionLocal", Session)


@pytest.fixture
def db_session(engine) -> Generator[Session, None, None]:
    SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    from app.db.session import get_db
    from app.main import app

    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session: Session):
    from app.core.security import hash_password
    from app.models.user import User

    u = User(
        email="testuser@example.com",
        full_name="Test User",
        password_hash=hash_password("testpassword123"),
        is_active=True,
    )
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    return u


@pytest.fixture
def auth_headers(test_user, db_session: Session):
    from app.core.config import get_settings
    from app.schemas.auth import LoginRequest
    from app.services.auth_service import AuthService

    svc = AuthService(settings=get_settings())
    session = svc.login(
        db=db_session,
        payload=LoginRequest(email=test_user.email, password="testpassword123"),
    )
    return {"Authorization": f"Bearer {session.access_token}"}
