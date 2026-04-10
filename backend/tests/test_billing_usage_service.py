from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.errors import AppError
from app.db.base import Base
from app.models.daily_usage import DailyUsage
from app.models.image_job import ImageJob
from app.models.revoked_token import RevokedToken
from app.models.user import User
from app.models.user_subscription import UserSubscription
from app.services.billing.usage_service import UsageService


def test_usage_service_enforces_daily_limit() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:", connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    _ = (User, ImageJob, RevokedToken, UserSubscription, DailyUsage)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    service = UsageService()

    snapshot = service.get_usage_snapshot(db=db, user_id="u-1", daily_limit=2)
    assert snapshot.uploads_used == 0
    assert snapshot.uploads_remaining == 2

    snapshot = service.consume_upload(db=db, user_id="u-1", daily_limit=2)
    assert snapshot.uploads_used == 1
    assert snapshot.uploads_remaining == 1

    snapshot = service.consume_upload(db=db, user_id="u-1", daily_limit=2)
    assert snapshot.uploads_used == 2
    assert snapshot.uploads_remaining == 0

    try:
        service.consume_upload(db=db, user_id="u-1", daily_limit=2)
        assert False, "Expected AppError for reached daily limit"
    except AppError as exc:
        assert exc.code == "daily_upload_limit_reached"

    db.close()
