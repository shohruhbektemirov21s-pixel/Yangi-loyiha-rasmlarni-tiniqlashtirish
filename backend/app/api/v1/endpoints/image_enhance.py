"""Image enhancement for authenticated users (same pipeline as job uploads)."""

from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.dependencies import get_current_user, get_processing_service
from app.models.user import User
from app.services.processing_service import ProcessingRequest, ProcessingService

router = APIRouter()

_READ_CHUNK = 32 * 1024 * 1024

_IMAGE_EXT = frozenset(
    {
        "jpg",
        "jpeg",
        "png",
        "webp",
        "heic",
        "heif",
        "bmp",
        "gif",
        # tiff sometimes supported by pipeline
        "tif",
        "tiff",
    }
)


@router.post("")
async def enhance_image_authenticated(
    file: UploadFile = File(...),
    processing_service: ProcessingService = Depends(get_processing_service),
    _user: User = Depends(get_current_user),
):
    settings = get_settings()
    raw_name = file.filename or "upload"
    ext = raw_name.rsplit(".", 1)[-1].lower() if "." in raw_name else ""
    if ext not in _IMAGE_EXT:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Qo'llab-quvvatlanadigan formatlar: {', '.join(sorted(_IMAGE_EXT))}. "
                f"/ Supported: JPG, PNG, WEBP, GIF, BMP, HEIC, TIFF."
            ),
        )

    input_id = uuid.uuid4().hex
    input_path = settings.upload_dir / f"{input_id}_in.{ext}"

    max_bytes = settings.compress_max_upload_bytes
    total_written = 0
    try:
        with open(input_path, "wb") as out_f:
            while True:
                chunk = await file.read(_READ_CHUNK)
                if not chunk:
                    break
                next_total = total_written + len(chunk)
                if next_total > max_bytes:
                    raise HTTPException(
                        status_code=413,
                        detail=(
                            f"Fayl juda katta. Maksimal: {settings.compress_max_upload_mb} MB "
                            f"(~{settings.compress_max_upload_mb // 1024} GB). "
                            f"/ File too large."
                        ),
                    )
                out_f.write(chunk)
                total_written = next_total
    except HTTPException:
        input_path.unlink(missing_ok=True)
        raise
    except Exception:
        input_path.unlink(missing_ok=True)
        raise

    if total_written == 0:
        input_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Bo'sh fayl. / Empty file.")

    try:
        outcome = processing_service.process_image(
            Path(input_path),
            ProcessingRequest(plan_code="public_enhance", ocr_mode="standard"),
        )
    except Exception as exc:
        input_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=500,
            detail=f"Rasmni qayta ishlashda xato. / Processing failed: {exc!s}",
        ) from exc
    finally:
        input_path.unlink(missing_ok=True)

    return JSONResponse(
        content={
            "success": True,
            "message": "Rasm muvaffaqiyatli tiniqlashtirildi",
            "data": {
                "enhanced_image_url": outcome.enhanced_image_url or "",
                "extracted_text": outcome.extracted_text or "",
                "detected_mode": outcome.detected_mode,
            },
        }
    )
