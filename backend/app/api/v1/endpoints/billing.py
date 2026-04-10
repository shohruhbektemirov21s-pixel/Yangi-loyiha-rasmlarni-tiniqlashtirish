from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_billing_service, get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.billing import (
    BillingOverviewData,
    BillingOverviewResponse,
    ChangePlanData,
    ChangePlanRequest,
    ChangePlanResponse,
    PaymentCheckoutData,
    UsageData,
)
from app.services.billing import BillingService

router = APIRouter()


@router.get("/overview", response_model=BillingOverviewResponse)
def get_billing_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    billing_service: BillingService = Depends(get_billing_service),
) -> BillingOverviewResponse:
    context = billing_service.get_plan_context(db=db, user_id=current_user.id)
    usage = billing_service.get_usage_snapshot(db=db, user_id=current_user.id)
    plans = billing_service.list_plans()

    return BillingOverviewResponse(
        success=True,
        message="Billing overview fetched successfully.",
        data=BillingOverviewData.from_context(
            plans=plans,
            context=context,
            usage=usage,
        ),
    )


@router.post("/subscription", response_model=ChangePlanResponse)
def change_subscription_plan(
    payload: ChangePlanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    billing_service: BillingService = Depends(get_billing_service),
) -> ChangePlanResponse:
    result = billing_service.change_plan(
        db=db,
        user=current_user,
        target_plan_code=payload.plan_code,
    )

    checkout = PaymentCheckoutData.from_session(result.checkout) if result.checkout else None

    return ChangePlanResponse(
        success=True,
        message="Subscription updated successfully.",
        data=ChangePlanData(
            current_plan=result.plan_context.plan_code,
            plan_status=result.plan_context.status,
            plan_provider=result.plan_context.provider,
            usage=UsageData.from_snapshot(result.usage),
            checkout=checkout,
            notice=result.message,
        ),
    )
