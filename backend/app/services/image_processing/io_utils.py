from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

from .config import OutputConfig


def read_image(path: Path) -> np.ndarray:
    image_bytes = np.fromfile(path, dtype=np.uint8)
    image = cv2.imdecode(image_bytes, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError(f"Failed to decode image: {path}")
    return image


def write_image(path: Path, image_bgr: np.ndarray, output_config: OutputConfig) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)

    image_format = output_config.format.lower().strip(".")
    if image_format not in {"png", "jpg", "jpeg", "webp"}:
        image_format = "png"

    extension = ".jpg" if image_format == "jpeg" else f".{image_format}"
    encode_params: list[int] = []

    if image_format in {"jpg", "jpeg"}:
        encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), int(output_config.jpeg_quality)]

    success, encoded = cv2.imencode(extension, image_bgr, encode_params)
    if not success:
        raise ValueError(f"Failed to encode image: {path}")

    if path.suffix.lower() != extension:
        path = path.with_suffix(extension)

    encoded.tofile(path)
    return path
