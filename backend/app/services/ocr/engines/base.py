from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol


@dataclass(slots=True)
class OcrEngineOutput:
    text: str
    confidence: float
    succeeded: bool


class OcrEngine(Protocol):
    name: str

    def is_available(self) -> bool:
        ...

    def extract(self, image: Any, *, timeout_sec: int | None = None) -> OcrEngineOutput:
        ...
