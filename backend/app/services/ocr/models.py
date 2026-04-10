from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(slots=True)
class OcrVariantPayload:
    name: str
    image: Any


@dataclass(slots=True)
class OcrCandidateResult:
    variant: str
    text: str
    confidence: float
    score: float
    succeeded: bool


@dataclass(slots=True)
class OcrResult:
    text: str
    success: bool
    fallback_used: bool
    engine: str
    selected_variant: str | None
    confidence: float | None
    message: str
    candidates: list[OcrCandidateResult] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
