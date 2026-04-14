from __future__ import annotations

from app.core.config import Settings

from .models import PlanDefinition, PlanEntitlements

FREE_PLAN_CODE = "free"
PREMIUM_PLAN_CODE = "premium"


def build_plan_catalog(settings: Settings) -> dict[str, PlanDefinition]:
    free_plan = PlanDefinition(
        code=FREE_PLAN_CODE,
        name="Free",
        description="Good for occasional image cleanup and OCR extraction.",
        monthly_price_usd=0,
        badge_text="Free",
        output_quality_label="Standard enhancement",
        features=[
            "Limited uploads per day",
            "Standard enhancement pipeline",
            "Standard OCR mode",
        ],
        entitlements=PlanEntitlements(
            daily_upload_limit=max(int(settings.free_daily_upload_limit), 1),
            priority_level=max(int(settings.free_processing_priority), 1),
            ocr_mode=settings.free_ocr_mode or "standard",
            pipeline_override={
                "upscale": {
                    "enabled": True,
                    "min_short_side": 960,
                }
            },
            max_output_short_side=None,
        ),
    )

    premium_plan = PlanDefinition(
        code=PREMIUM_PLAN_CODE,
        name="Premium",
        description="Built for heavier workloads and more detailed outputs.",
        monthly_price_usd=max(int(settings.premium_monthly_price_usd), 1),
        badge_text="Premium",
        output_quality_label="Higher-resolution output",
        features=[
            "Higher daily upload limit",
            "Priority processing hint",
            "Quality OCR mode with extra variants",
            "Higher-resolution output target",
        ],
        entitlements=PlanEntitlements(
            daily_upload_limit=max(int(settings.premium_daily_upload_limit), 1),
            priority_level=max(int(settings.premium_processing_priority), 1),
            ocr_mode=settings.premium_ocr_mode or "quality",
            pipeline_override={
                "upscale": {
                    "enabled": True,
                    "min_short_side": max(int(settings.premium_upscale_min_short_side), 800),
                }
            },
            max_output_short_side=max(int(settings.premium_upscale_min_short_side), 800),
        ),
    )

    return {
        free_plan.code: free_plan,
        premium_plan.code: premium_plan,
    }
