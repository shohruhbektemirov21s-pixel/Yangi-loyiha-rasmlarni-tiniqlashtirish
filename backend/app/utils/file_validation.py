from __future__ import annotations

from io import BytesIO
from pathlib import Path

from PIL import Image, UnidentifiedImageError

from app.core.errors import AppError

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def validate_upload_file(
    *,
    filename: str,
    content_type: str,
    file_bytes: bytes,
    allowed_types: list[str],
    max_size_bytes: int,
) -> None:
    suffix = Path(filename).suffix.lower()

    if suffix not in ALLOWED_EXTENSIONS:
        raise AppError(
            "Unsupported file extension. Allowed: JPG, JPEG, PNG, WEBP.",
            status_code=400,
            code="invalid_file_extension",
            details={"extension": suffix},
        )

    if content_type and content_type.lower() not in {item.lower() for item in allowed_types}:
        raise AppError(
            "Unsupported content type.",
            status_code=400,
            code="invalid_content_type",
            details={"content_type": content_type},
        )

    if len(file_bytes) > max_size_bytes:
        raise AppError(
            "File is too large.",
            status_code=400,
            code="file_too_large",
            details={"max_size_bytes": max_size_bytes, "actual_size_bytes": len(file_bytes)},
        )

    try:
        with Image.open(BytesIO(file_bytes)) as img:
            img.verify()
    except (UnidentifiedImageError, OSError) as exc:
        raise AppError(
            "Uploaded file is not a valid image.",
            status_code=400,
            code="invalid_image_file",
            details={"reason": str(exc)},
        ) from exc
