from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.user_subscription import UserSubscription


class SubscriptionService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def get_subscription(self, *, db: Session, user_id: str) -> UserSubscription | None:
        return db.query(UserSubscription).filter(UserSubscription.user_id == user_id).first()

    def get_or_create_subscription(self, *, db: Session, user_id: str) -> UserSubscription:
        existing = self.get_subscription(db=db, user_id=user_id)
        if existing:
            return existing

        subscription = UserSubscription(
            user_id=user_id,
            plan_code=(self.settings.default_plan_code or "free").strip().lower(),
            status="active",
            provider=self.settings.payment_provider or "placeholder",
            current_period_start=datetime.now(UTC),
        )
        db.add(subscription)
        db.flush()
        return subscription

    def change_plan(
        self,
        *,
        db: Session,
        user_id: str,
        plan_code: str,
        status: str = "active",
        provider: str | None = None,
        provider_subscription_id: str | None = None,
    ) -> UserSubscription:
        subscription = self.get_or_create_subscription(db=db, user_id=user_id)
        now = datetime.now(UTC)

        if subscription.plan_code != plan_code:
            subscription.current_period_start = now

        subscription.plan_code = plan_code
        subscription.status = status
        if provider:
            subscription.provider = provider
        if provider_subscription_id:
            subscription.provider_subscription_id = provider_subscription_id
        subscription.current_period_end = None

        db.add(subscription)
        db.flush()
        return subscription
