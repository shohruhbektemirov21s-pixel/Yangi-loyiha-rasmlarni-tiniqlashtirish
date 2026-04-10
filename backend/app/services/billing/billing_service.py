from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import AppError
from app.models.user import User

from .models import PlanContext, PlanDefinition, UsageSnapshot
from .payment_provider import PaymentCheckoutSession, PaymentProvider
from .plans import FREE_PLAN_CODE, build_plan_catalog
from .subscription_service import SubscriptionService
from .usage_service import UsageService


@dataclass(slots=True)
class PlanChangeResult:
    plan_context: PlanContext
    usage: UsageSnapshot
    checkout: PaymentCheckoutSession | None
    message: str


class BillingService:
    def __init__(
        self,
        *,
        settings: Settings,
        subscription_service: SubscriptionService,
        usage_service: UsageService,
        payment_provider: PaymentProvider,
    ) -> None:
        self.settings = settings
        self.subscription_service = subscription_service
        self.usage_service = usage_service
        self.payment_provider = payment_provider
        self.catalog = build_plan_catalog(settings)

    def list_plans(self) -> list[PlanDefinition]:
        return [self.catalog[key] for key in sorted(self.catalog.keys())]

    def get_plan_context(self, *, db: Session, user_id: str) -> PlanContext:
        subscription = self.subscription_service.get_subscription(db=db, user_id=user_id)
        if subscription:
            plan = self.catalog.get(subscription.plan_code)
            if plan is None:
                plan = self.catalog.get(FREE_PLAN_CODE) or next(iter(self.catalog.values()))
            return PlanContext(
                plan=plan,
                status=subscription.status,
                provider=subscription.provider,
            )

        fallback_code = (self.settings.default_plan_code or FREE_PLAN_CODE).strip().lower()
        fallback_plan = self.catalog.get(fallback_code)
        if fallback_plan is None:
            fallback_plan = self.catalog.get(FREE_PLAN_CODE) or next(iter(self.catalog.values()))

        return PlanContext(
            plan=fallback_plan,
            status="active",
            provider=self.settings.payment_provider or "placeholder",
        )

    def get_usage_snapshot(self, *, db: Session, user_id: str) -> UsageSnapshot:
        context = self.get_plan_context(db=db, user_id=user_id)
        return self.usage_service.get_usage_snapshot(
            db=db,
            user_id=user_id,
            daily_limit=context.plan.entitlements.daily_upload_limit,
        )

    def assert_upload_allowed(self, *, db: Session, user_id: str) -> tuple[PlanContext, UsageSnapshot]:
        context = self.get_plan_context(db=db, user_id=user_id)
        snapshot = self.usage_service.assert_upload_allowed(
            db=db,
            user_id=user_id,
            daily_limit=context.plan.entitlements.daily_upload_limit,
        )
        return context, snapshot

    def consume_upload(self, *, db: Session, user_id: str, context: PlanContext) -> UsageSnapshot:
        return self.usage_service.consume_upload(
            db=db,
            user_id=user_id,
            daily_limit=context.plan.entitlements.daily_upload_limit,
        )

    def resolve_plan(self, plan_code: str | None) -> PlanDefinition:
        normalized = (plan_code or FREE_PLAN_CODE).strip().lower()
        return self.catalog.get(normalized, self.catalog.get(FREE_PLAN_CODE) or next(iter(self.catalog.values())))

    def change_plan(
        self,
        *,
        db: Session,
        user: User,
        target_plan_code: str,
    ) -> PlanChangeResult:
        normalized_plan_code = (target_plan_code or "").strip().lower()
        plan = self.catalog.get(normalized_plan_code)
        if not plan:
            raise AppError(
                "Requested plan is not available.",
                status_code=422,
                code="invalid_plan_code",
            )

        checkout_session: PaymentCheckoutSession | None = None
        message = f"Plan updated to {plan.name}."

        if normalized_plan_code != FREE_PLAN_CODE:
            checkout_session = self.payment_provider.create_checkout_session(
                user_id=user.id,
                user_email=user.email,
                plan_code=normalized_plan_code,
            )
            message = checkout_session.message

        subscription = self.subscription_service.change_plan(
            db=db,
            user_id=user.id,
            plan_code=normalized_plan_code,
            status="active",
            provider=checkout_session.provider if checkout_session else "internal",
            provider_subscription_id=checkout_session.session_id if checkout_session else None,
        )

        db.commit()
        db.refresh(subscription)

        context = self.get_plan_context(db=db, user_id=user.id)
        usage = self.get_usage_snapshot(db=db, user_id=user.id)

        return PlanChangeResult(
            plan_context=context,
            usage=usage,
            checkout=checkout_session,
            message=message,
        )
