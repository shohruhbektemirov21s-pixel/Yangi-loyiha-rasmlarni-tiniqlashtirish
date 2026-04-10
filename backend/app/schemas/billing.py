from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.user_subscription import UserSubscription
from app.services.billing import PaymentCheckoutSession, PlanContext, PlanDefinition, UsageSnapshot


class PlanEntitlementsData(BaseModel):
    daily_upload_limit: int
    priority_level: int
    ocr_mode: str
    max_output_short_side: int | None


class PricingPlanData(BaseModel):
    code: str
    name: str
    description: str
    monthly_price_usd: int
    badge_text: str
    output_quality_label: str
    features: list[str]
    entitlements: PlanEntitlementsData

    @classmethod
    def from_plan(cls, plan: PlanDefinition) -> "PricingPlanData":
        return cls(
            code=plan.code,
            name=plan.name,
            description=plan.description,
            monthly_price_usd=plan.monthly_price_usd,
            badge_text=plan.badge_text,
            output_quality_label=plan.output_quality_label,
            features=plan.features,
            entitlements=PlanEntitlementsData(
                daily_upload_limit=plan.entitlements.daily_upload_limit,
                priority_level=plan.entitlements.priority_level,
                ocr_mode=plan.entitlements.ocr_mode,
                max_output_short_side=plan.entitlements.max_output_short_side,
            ),
        )


class SubscriptionData(BaseModel):
    user_id: str
    plan_code: str
    status: str
    provider: str
    current_period_start: datetime
    current_period_end: datetime | None

    @classmethod
    def from_subscription(cls, subscription: UserSubscription) -> "SubscriptionData":
        return cls(
            user_id=subscription.user_id,
            plan_code=subscription.plan_code,
            status=subscription.status,
            provider=subscription.provider,
            current_period_start=subscription.current_period_start,
            current_period_end=subscription.current_period_end,
        )


class UsageData(BaseModel):
    usage_date: date
    uploads_used: int
    uploads_limit: int
    uploads_remaining: int

    @classmethod
    def from_snapshot(cls, snapshot: UsageSnapshot) -> "UsageData":
        return cls(
            usage_date=snapshot.usage_date,
            uploads_used=snapshot.uploads_used,
            uploads_limit=snapshot.uploads_limit,
            uploads_remaining=snapshot.uploads_remaining,
        )


class PaymentCheckoutData(BaseModel):
    provider: str
    session_id: str
    checkout_url: str | None
    status: str
    message: str

    @classmethod
    def from_session(cls, session: PaymentCheckoutSession) -> "PaymentCheckoutData":
        return cls(
            provider=session.provider,
            session_id=session.session_id,
            checkout_url=session.checkout_url,
            status=session.status,
            message=session.message,
        )


class BillingOverviewData(BaseModel):
    plans: list[PricingPlanData]
    current_plan: str
    plan_status: str
    plan_provider: str
    usage: UsageData

    @classmethod
    def from_context(
        cls,
        *,
        plans: list[PlanDefinition],
        context: PlanContext,
        usage: UsageSnapshot,
    ) -> "BillingOverviewData":
        return cls(
            plans=[PricingPlanData.from_plan(item) for item in plans],
            current_plan=context.plan_code,
            plan_status=context.status,
            plan_provider=context.provider,
            usage=UsageData.from_snapshot(usage),
        )


class BillingOverviewResponse(BaseModel):
    success: bool
    message: str
    data: BillingOverviewData


class ChangePlanRequest(BaseModel):
    plan_code: str = Field(min_length=2, max_length=32)


class ChangePlanData(BaseModel):
    current_plan: str
    plan_status: str
    plan_provider: str
    usage: UsageData
    checkout: PaymentCheckoutData | None = None
    notice: str | None = None


class ChangePlanResponse(BaseModel):
    success: bool
    message: str
    data: ChangePlanData
