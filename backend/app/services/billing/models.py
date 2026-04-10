from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any


@dataclass(slots=True)
class PlanEntitlements:
    daily_upload_limit: int
    priority_level: int
    ocr_mode: str
    pipeline_override: dict[str, Any]
    max_output_short_side: int | None


@dataclass(slots=True)
class PlanDefinition:
    code: str
    name: str
    description: str
    monthly_price_usd: int
    badge_text: str
    output_quality_label: str
    features: list[str]
    entitlements: PlanEntitlements


@dataclass(slots=True)
class PlanContext:
    plan: PlanDefinition
    status: str
    provider: str

    @property
    def plan_code(self) -> str:
        return self.plan.code


@dataclass(slots=True)
class UsageSnapshot:
    usage_date: date
    uploads_used: int
    uploads_limit: int
    uploads_remaining: int
