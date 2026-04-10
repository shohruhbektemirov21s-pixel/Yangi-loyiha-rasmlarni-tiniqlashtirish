from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(slots=True)
class ImageMetrics:
    width: int
    height: int
    mean_brightness: float
    contrast_std: float
    edge_density: float


@dataclass(slots=True)
class EnhancementMetadata:
    profile: str
    detected_mode: str
    detection_confidence: float
    detection_signals: dict[str, float]
    steps_applied: list[str]
    elapsed_ms: float
    input_size_bytes: int
    output_size_bytes: int
    metrics_before: ImageMetrics
    metrics_after: ImageMetrics


@dataclass(slots=True)
class EnhancementResult:
    input_path: str
    output_path: str
    metadata: EnhancementMetadata

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
