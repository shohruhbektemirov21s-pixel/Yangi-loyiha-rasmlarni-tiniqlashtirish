from __future__ import annotations

from pathlib import Path

from PIL import Image

from .engines.base import OcrEngine
from .engines.tesseract import TesseractOcrEngine
from .models import OcrCandidateResult, OcrResult, OcrVariantPayload
from .preprocessor import OcrPreprocessor


class OcrService:
    """
    OCR orchestration service.

    Responsibilities:
    - Build OCR-friendly image variants
    - Run text extraction through pluggable engine(s)
    - Select best candidate based on confidence and text quality
    - Return graceful fallback text when extraction fails
    """

    def __init__(
        self,
        *,
        enabled: bool = True,
        fallback_message: str = "No readable text could be extracted from the image.",
        timeout_sec: int = 12,
        preprocess_enabled: bool = True,
        engine: OcrEngine | None = None,
        preprocessor: OcrPreprocessor | None = None,
    ) -> None:
        self.enabled = enabled
        self.fallback_message = fallback_message
        self.timeout_sec = timeout_sec
        self.preprocess_enabled = preprocess_enabled
        self.engine: OcrEngine = engine or TesseractOcrEngine()
        self.preprocessor = preprocessor or OcrPreprocessor()

    def extract_text(self, image_path: Path, mode: str = "standard") -> OcrResult:
        normalized_mode = (mode or "standard").strip().lower()
        if not self.enabled:
            return self._fallback_result(
                message="OCR is disabled in current configuration.",
            )

        if not self.engine.is_available():
            return self._fallback_result(
                message="OCR engine is not available in runtime.",
                engine=getattr(self.engine, "name", "unknown"),
            )

        variants = self._prepare_variants(image_path, mode=normalized_mode)
        if not variants:
            return self._fallback_result(
                message="OCR preprocessing failed.",
                engine=self.engine.name,
            )

        candidates: list[OcrCandidateResult] = []

        timeout = self.timeout_sec
        if normalized_mode == "quality":
            timeout = max(int(self.timeout_sec * 1.8), self.timeout_sec + 2)

        for variant in variants:
            output = self.engine.extract(variant.image, timeout_sec=timeout)
            score = self._score_candidate(output.text, output.confidence)
            candidates.append(
                OcrCandidateResult(
                    variant=variant.name,
                    text=output.text,
                    confidence=output.confidence,
                    score=score,
                    succeeded=output.succeeded,
                )
            )

        best = self._select_best(candidates)
        if best and best.succeeded:
            return OcrResult(
                text=best.text,
                success=True,
                fallback_used=False,
                engine=self.engine.name,
                selected_variant=best.variant,
                confidence=best.confidence,
                message="OCR completed successfully.",
                candidates=candidates,
            )

        return self._fallback_result(
            message="OCR completed with no reliable text.",
            engine=self.engine.name,
            candidates=candidates,
        )

    @staticmethod
    def _score_candidate(text: str, confidence: float) -> float:
        cleaned = text.strip()
        if not cleaned:
            return 0.0

        alpha_chars = sum(char.isalnum() for char in cleaned)
        useful_ratio = alpha_chars / max(len(cleaned), 1)
        length_score = min(len(cleaned), 400) / 400
        confidence_score = max(min(confidence / 100, 1.0), 0.0)

        return length_score * 0.45 + confidence_score * 0.45 + useful_ratio * 0.10

    @staticmethod
    def _select_best(candidates: list[OcrCandidateResult]) -> OcrCandidateResult | None:
        succeeded = [item for item in candidates if item.succeeded]
        if not succeeded:
            return None

        return max(succeeded, key=lambda item: item.score)

    def _fallback_result(
        self,
        *,
        message: str,
        engine: str | None = None,
        candidates: list[OcrCandidateResult] | None = None,
    ) -> OcrResult:
        return OcrResult(
            text=self.fallback_message,
            success=False,
            fallback_used=True,
            engine=engine or getattr(self.engine, "name", "unknown"),
            selected_variant=None,
            confidence=None,
            message=message,
            candidates=candidates or [],
        )

    def _prepare_variants(self, image_path: Path, mode: str = "standard") -> list[OcrVariantPayload]:
        if self.preprocess_enabled:
            try:
                variants = self.preprocessor.build_variants(image_path, mode=mode)
                if variants:
                    return variants
            except Exception:
                pass

        try:
            with Image.open(image_path) as image:
                return [OcrVariantPayload(name="basic_original", image=image.copy())]
        except Exception:
            return []
