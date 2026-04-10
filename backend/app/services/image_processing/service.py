from __future__ import annotations

from pathlib import Path
from time import perf_counter
from typing import Mapping

from .models import EnhancementMetadata, EnhancementResult
from .io_utils import read_image, write_image
from .pipeline import ImageEnhancementPipeline


class ImageEnhancementService:
    """High-level service for enhancing and writing image outputs."""

    def __init__(self, output_dir: str | Path, pipeline: ImageEnhancementPipeline | None = None) -> None:
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.pipeline = pipeline or ImageEnhancementPipeline()

    def enhance_image(
        self,
        input_path: str | Path,
        output_path: str | Path | None = None,
        config_override: Mapping[str, object] | None = None,
    ) -> EnhancementResult:
        source_path = Path(input_path)
        if not source_path.exists() or not source_path.is_file():
            raise FileNotFoundError(f"Input image does not exist: {source_path}")

        image_bgr = read_image(source_path)
        input_size = source_path.stat().st_size

        start = perf_counter()
        run_result = self.pipeline.run(image_bgr=image_bgr, config_override=config_override)

        destination = Path(output_path) if output_path else self._build_output_path(source_path, run_result.config.output.format)
        written_path = write_image(destination, run_result.image_bgr, run_result.config.output)
        output_size = written_path.stat().st_size
        elapsed_ms = (perf_counter() - start) * 1000

        metadata = EnhancementMetadata(
            profile=run_result.profile,
            detected_mode=run_result.detected_mode,
            detection_confidence=run_result.detection_confidence,
            detection_signals=run_result.detection_signals,
            steps_applied=run_result.steps_applied,
            elapsed_ms=round(elapsed_ms, 2),
            input_size_bytes=input_size,
            output_size_bytes=output_size,
            metrics_before=run_result.metrics_before,
            metrics_after=run_result.metrics_after,
        )

        return EnhancementResult(
            input_path=str(source_path),
            output_path=str(written_path),
            metadata=metadata,
        )

    def _build_output_path(self, input_path: Path, output_format: str) -> Path:
        extension = output_format.lower().strip(".")
        output_name = f"{input_path.stem}_enhanced.{extension}"
        return self.output_dir / output_name
