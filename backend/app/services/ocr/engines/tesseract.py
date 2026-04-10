from __future__ import annotations

from statistics import mean
from typing import Any

from .base import OcrEngineOutput


class TesseractOcrEngine:
    def __init__(self, *, language: str = "eng", psm: int = 6, oem: int = 3) -> None:
        self.name = "tesseract"
        self.language = language
        self.psm = psm
        self.oem = oem

    def is_available(self) -> bool:
        try:
            import pytesseract  # noqa: F401
            from PIL import Image  # noqa: F401
        except Exception:
            return False
        return True

    def extract(self, image: Any, *, timeout_sec: int | None = None) -> OcrEngineOutput:
        try:
            import pytesseract
            from pytesseract import Output
        except Exception:
            return OcrEngineOutput(text="", confidence=0.0, succeeded=False)

        config = f"--oem {self.oem} --psm {self.psm}"

        try:
            data = pytesseract.image_to_data(
                image,
                lang=self.language,
                config=config,
                output_type=Output.DICT,
                timeout=timeout_sec,
            )
        except Exception:
            return OcrEngineOutput(text="", confidence=0.0, succeeded=False)

        words: list[str] = []
        confidences: list[float] = []

        for i, raw_text in enumerate(data.get("text", [])):
            word = str(raw_text).strip()
            if not word:
                continue

            words.append(word)

            raw_conf = data.get("conf", [])[i] if i < len(data.get("conf", [])) else "-1"
            try:
                conf_value = float(raw_conf)
            except (TypeError, ValueError):
                conf_value = -1.0

            if conf_value >= 0:
                confidences.append(conf_value)

        text = " ".join(words).strip()
        confidence = mean(confidences) if confidences else 0.0

        return OcrEngineOutput(
            text=text,
            confidence=float(confidence),
            succeeded=bool(text),
        )
