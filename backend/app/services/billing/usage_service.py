from __future__ import annotations

from datetime import UTC, date, datetime

from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.daily_usage import DailyUsage

from .models import UsageSnapshot


class UsageService:
    def get_usage_snapshot(
        self,
        *,
        db: Session,
        user_id: str,
        daily_limit: int,
        usage_date: date | None = None,
    ) -> UsageSnapshot:
        target_date = usage_date or _today_utc()
        usage = (
            db.query(DailyUsage)
            .filter(DailyUsage.user_id == user_id, DailyUsage.usage_date == target_date)
            .first()
        )
        if not usage:
            limit = max(int(daily_limit), 1)
            return UsageSnapshot(
                usage_date=target_date,
                uploads_used=0,
                uploads_limit=limit,
                uploads_remaining=limit,
            )

        return _to_snapshot(usage=usage, daily_limit=daily_limit)

    def assert_upload_allowed(
        self,
        *,
        db: Session,
        user_id: str,
        daily_limit: int,
    ) -> UsageSnapshot:
        snapshot = self.get_usage_snapshot(db=db, user_id=user_id, daily_limit=daily_limit)
        if snapshot.uploads_remaining <= 0:
            raise AppError(
                "Daily upload limit reached for your current plan.",
                status_code=429,
                code="daily_upload_limit_reached",
                details={
                    "usage_date": snapshot.usage_date.isoformat(),
                    "uploads_used": snapshot.uploads_used,
                    "uploads_limit": snapshot.uploads_limit,
                    "uploads_remaining": snapshot.uploads_remaining,
                },
            )
        return snapshot

    def consume_upload(
        self,
        *,
        db: Session,
        user_id: str,
        daily_limit: int,
        usage_date: date | None = None,
    ) -> UsageSnapshot:
        target_date = usage_date or _today_utc()
        usage = self._get_or_create_usage_row(db=db, user_id=user_id, usage_date=target_date)
        if usage.uploads_used >= daily_limit:
            raise AppError(
                "Daily upload limit reached for your current plan.",
                status_code=429,
                code="daily_upload_limit_reached",
                details={
                    "usage_date": target_date.isoformat(),
                    "uploads_used": usage.uploads_used,
                    "uploads_limit": daily_limit,
                    "uploads_remaining": 0,
                },
            )

        usage.uploads_used += 1
        usage.updated_at = datetime.now(UTC)
        db.add(usage)
        db.flush()

        return _to_snapshot(usage=usage, daily_limit=daily_limit)

    def _get_or_create_usage_row(
        self,
        *,
        db: Session,
        user_id: str,
        usage_date: date,
    ) -> DailyUsage:
        usage = (
            db.query(DailyUsage)
            .filter(DailyUsage.user_id == user_id, DailyUsage.usage_date == usage_date)
            .first()
        )
        if usage:
            return usage

        usage = DailyUsage(
            user_id=user_id,
            usage_date=usage_date,
            uploads_used=0,
        )
        db.add(usage)
        db.flush()
        return usage


def _today_utc() -> date:
    return datetime.now(UTC).date()


def _to_snapshot(*, usage: DailyUsage, daily_limit: int) -> UsageSnapshot:
    limit = max(int(daily_limit), 1)
    used = max(int(usage.uploads_used), 0)
    remaining = max(limit - used, 0)
    return UsageSnapshot(
        usage_date=usage.usage_date,
        uploads_used=used,
        uploads_limit=limit,
        uploads_remaining=remaining,
    )
