from __future__ import annotations

from pathlib import Path

import pytest

cv2 = pytest.importorskip("cv2")
np = pytest.importorskip("numpy")

from app.services.image_processing import ImageEnhancementService


def test_enhancement_service_writes_output(tmp_path: Path) -> None:
    input_path = tmp_path / "input.png"
    output_dir = tmp_path / "outputs"

    # Build a synthetic blurry image with text-like edges.
    image = np.full((280, 420, 3), 235, dtype=np.uint8)
    cv2.putText(image, "ImageClear", (35, 115), cv2.FONT_HERSHEY_SIMPLEX, 1.7, (50, 50, 50), 3, cv2.LINE_AA)
    cv2.putText(image, "AI", (160, 200), cv2.FONT_HERSHEY_SIMPLEX, 2.0, (40, 40, 40), 4, cv2.LINE_AA)
    image = cv2.GaussianBlur(image, (7, 7), 1.6)

    ok, encoded = cv2.imencode(".png", image)
    assert ok
    encoded.tofile(str(input_path))

    service = ImageEnhancementService(output_dir=output_dir)
    result = service.enhance_image(input_path=input_path)

    assert Path(result.output_path).exists()
    assert result.metadata.output_size_bytes > 0
    assert len(result.metadata.steps_applied) > 0
    assert result.metadata.metrics_after.contrast_std >= result.metadata.metrics_before.contrast_std * 0.6
