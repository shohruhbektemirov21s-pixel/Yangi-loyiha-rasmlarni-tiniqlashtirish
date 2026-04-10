from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping

from app.core.config import Settings
from app.services.image_processing import ImageEnhancementService
from app.services.image_processing.pipeline import ImageEnhancementPipeline
from app.services.image_processing.upscalers import NoopUpscaler, RealESRGANUpscaler
from app.services.ocr import OcrService


@dataclass(slots=True)
class ProcessingOutcome:
    output_path: str
    enhanced_image_url: str | None
    extracted_text: str
    detected_mode: str | None
    metadata: dict[str, Any]


@dataclass(slots=True)
class ProcessingRequest:
    plan_code: str = "free"
    ocr_mode: str = "standard"
    priority_level: int = 0
    pipeline_override: Mapping[str, Any] | None = None


class ProcessingService:
    def __init__(self, settings: Settings, ocr_service: OcrService) -> None:
        self.settings = settings
        self.ocr_service = ocr_service
        self.enhancer = self._build_enhancer()

    def process_image(self, input_path: Path, request: ProcessingRequest | None = None) -> ProcessingOutcome:
        active_request = request or ProcessingRequest()
        enhancement_result = self.enhancer.enhance_image(
            input_path=input_path,
            config_override=active_request.pipeline_override,
        )

        output_path = Path(enhancement_result.output_path)
        ocr_result = self.ocr_service.extract_text(output_path, mode=active_request.ocr_mode)
        extracted_text = ocr_result.text

        relative_output = output_path
        enhanced_image_url: str | None = None

        try:
            relative_output = output_path.relative_to(self.settings.storage_root)
            enhanced_image_url = f"{self.settings.storage_url_prefix}/{relative_output.as_posix()}"
        except ValueError:
            # Keep absolute output path if storage root differs.
            relative_output = output_path

        enhancement_metadata = enhancement_result.to_dict().get("metadata", {})
        metadata = {
            **(enhancement_metadata if isinstance(enhancement_metadata, dict) else {}),
            "ocr": ocr_result.to_dict(),
            "processing": {
                "plan_code": active_request.plan_code,
                "ocr_mode": active_request.ocr_mode,
                "priority_level": active_request.priority_level,
            },
        }

        detected_mode = None
        if isinstance(enhancement_metadata, dict):
            mode_candidate = enhancement_metadata.get("detected_mode") or enhancement_metadata.get("profile")
            if isinstance(mode_candidate, str) and mode_candidate.strip():
                detected_mode = mode_candidate.strip()

        return ProcessingOutcome(
            output_path=str(relative_output),
            enhanced_image_url=enhanced_image_url,
            extracted_text=extracted_text,
            detected_mode=detected_mode,
            metadata=metadata,
        )

    def _build_enhancer(self) -> ImageEnhancementService:
        upscaler = NoopUpscaler()
        if self.settings.real_esrgan_enabled and self.settings.real_esrgan_model_path.strip():
            upscaler = RealESRGANUpscaler(model_path=self.settings.real_esrgan_model_path.strip())

        return ImageEnhancementService(
            output_dir=self.settings.output_dir,
            pipeline=ImageEnhancementPipeline(upscaler=upscaler),
        )
