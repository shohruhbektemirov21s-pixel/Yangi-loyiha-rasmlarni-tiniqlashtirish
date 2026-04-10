from __future__ import annotations

from dataclasses import dataclass
import uuid
from typing import Protocol


@dataclass(slots=True)
class PaymentCheckoutSession:
    provider: str
    session_id: str
    checkout_url: str | None
    status: str
    message: str


class PaymentProvider(Protocol):
    name: str

    def create_checkout_session(
        self,
        *,
        user_id: str,
        user_email: str,
        plan_code: str,
    ) -> PaymentCheckoutSession:
        ...


class PlaceholderPaymentProvider:
    """
    Non-billing provider used for MVP architecture.

    This implementation intentionally does not charge users. It exists to keep
    subscription flows provider-agnostic so Stripe or another provider can be
    plugged in later.
    """

    def __init__(self, *, provider_name: str = "placeholder") -> None:
        self.name = provider_name or "placeholder"

    def create_checkout_session(
        self,
        *,
        user_id: str,
        user_email: str,
        plan_code: str,
    ) -> PaymentCheckoutSession:
        _ = (user_id, user_email, plan_code)
        return PaymentCheckoutSession(
            provider=self.name,
            session_id=f"placeholder_{uuid.uuid4().hex}",
            checkout_url=None,
            status="simulated",
            message="Payment provider is in placeholder mode. No real charge has been made.",
        )
