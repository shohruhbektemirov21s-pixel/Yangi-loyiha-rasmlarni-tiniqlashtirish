from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from pydantic import BaseModel

from app.core.config import get_settings
from app.models.image_job import ImageJob


class UsageQuotaData(BaseModel):
    usage_date: str
    uploads_used: int
    uploads_limit: int
    uploads_remaining: int


class UploadImageData(BaseModel):
    id: str
    original_filename: str
    original_image_url: str | None
    content_type: str
    size_bytes: int
    status: str
    plan_code: str | None
    usage: UsageQuotaData | None = None
    created_at: datetime

    @classmethod
    def from_model(cls, image: ImageJob, usage: UsageQuotaData | None = None):
        return cls(
            id=image.id,
            original_filename=image.original_filename,
            original_image_url=to_public_storage_url(image.upload_path),
            content_type=image.content_type,
            size_bytes=image.size_bytes,
            status=image.status,
            plan_code=image.plan_code,
            usage=usage,
            created_at=image.created_at,
        )


class UploadImageResponse(BaseModel):
    success: bool
    message: str
    data: UploadImageData


class ImageResultData(BaseModel):
    id: str
    status: str
    plan_code: str | None
    detected_mode: str | None
    original_image_url: str | None
    enhanced_image_url: str | None
    extracted_text: str | None
    metadata: dict[str, Any] | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime
    processing_started_at: datetime | None
    processing_completed_at: datetime | None

    @classmethod
    def from_model(cls, image: ImageJob):
        parsed_metadata = None
        detected_mode = None
        if image.metadata_json:
            try:
                parsed_metadata = json.loads(image.metadata_json)
            except json.JSONDecodeError:
                parsed_metadata = {"raw": image.metadata_json}
        if isinstance(parsed_metadata, dict):
            detected_mode = _extract_detected_mode(parsed_metadata)

        return cls(
            id=image.id,
            status=image.status,
            plan_code=image.plan_code,
            detected_mode=image.detected_mode or detected_mode,
            original_image_url=to_public_storage_url(image.upload_path),
            enhanced_image_url=image.enhanced_image_url or to_public_storage_url(image.output_path),
            extracted_text=image.extracted_text,
            metadata=parsed_metadata,
            error_message=image.error_message,
            created_at=image.created_at,
            updated_at=image.updated_at,
            processing_started_at=image.processing_started_at,
            processing_completed_at=image.processing_completed_at,
        )


class ImageResultResponse(BaseModel):
    success: bool
    message: str
    data: ImageResultData


class HistoryItemData(BaseModel):
    id: str
    status: str
    plan_code: str | None
    original_filename: str
    content_type: str
    size_bytes: int
    detected_mode: str | None
    original_image_url: str | None
    enhanced_image_url: str | None
    output_path: str | None
    extracted_text: str | None
    created_at: datetime
    updated_at: datetime
    processing_started_at: datetime | None
    processing_completed_at: datetime | None

    @classmethod
    def from_model(cls, image: ImageJob):
        detected_mode = image.detected_mode
        if not detected_mode and image.metadata_json:
            try:
                parsed_metadata = json.loads(image.metadata_json)
                if isinstance(parsed_metadata, dict):
                    extracted = _extract_detected_mode(parsed_metadata)
                    if extracted:
                        detected_mode = extracted
            except json.JSONDecodeError:
                pass

        return cls(
            id=image.id,
            status=image.status,
            plan_code=image.plan_code,
            original_filename=image.original_filename,
            content_type=image.content_type,
            size_bytes=image.size_bytes,
            detected_mode=detected_mode,
            original_image_url=to_public_storage_url(image.upload_path),
            enhanced_image_url=image.enhanced_image_url or to_public_storage_url(image.output_path),
            output_path=image.output_path,
            extracted_text=image.extracted_text,
            created_at=image.created_at,
            updated_at=image.updated_at,
            processing_started_at=image.processing_started_at,
            processing_completed_at=image.processing_completed_at,
        )


class HistoryListData(BaseModel):
    items: list[HistoryItemData]
    total: int
    limit: int
    offset: int


class HistoryListResponse(BaseModel):
    success: bool
    message: str
    data: HistoryListData


class DeleteHistoryData(BaseModel):
    id: str


class DeleteHistoryResponse(BaseModel):
    success: bool
    message: str
    data: DeleteHistoryData


def to_public_storage_url(raw_path: str | None) -> str | None:
    if not raw_path:
        return None

    try:
        settings = get_settings()
        storage_url_prefix = settings.storage_url_prefix
        storage_name = settings.storage_root.name
    except Exception:
        # Keep schema serialization resilient in constrained test/runtime
        # environments where full settings cannot be constructed.
        storage_url_prefix = "/storage"
        storage_name = "storage"

    if raw_path.startswith(storage_url_prefix):
        return raw_path

    normalized = Path(raw_path).as_posix()
    segments = [segment for segment in normalized.split("/") if segment]

    if storage_name in segments:
        index = segments.index(storage_name)
        remainder = "/".join(segments[index + 1 :])
        return f"{storage_url_prefix}/{remainder}" if remainder else storage_url_prefix

    if segments and segments[0] in {"uploads", "outputs"}:
        return f"{storage_url_prefix}/{'/'.join(segments)}"

    return None


def _extract_detected_mode(metadata: dict[str, Any]) -> str | None:
    direct = metadata.get("detected_mode") or metadata.get("detectedMode") or metadata.get("profile")
    if isinstance(direct, str) and direct.strip():
        return direct.strip()

    nested = metadata.get("detection")
    if isinstance(nested, dict):
        nested_mode = nested.get("mode")
        if isinstance(nested_mode, str) and nested_mode.strip():
            return nested_mode.strip()

    return None
