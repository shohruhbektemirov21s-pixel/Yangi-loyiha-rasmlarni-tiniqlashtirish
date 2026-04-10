from __future__ import annotations

from datetime import UTC, datetime
import json
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import AppError
from app.models.image_job import ImageJob
from app.services.billing import BillingService
from app.services.processing_service import ProcessingRequest, ProcessingService
from app.services.storage_service import StorageService
from app.utils.file_validation import validate_upload_file
from app.workers.queue import QueueBackend


class ImageJobService:
    def __init__(
        self,
        *,
        settings: Settings,
        storage_service: StorageService,
        processing_service: ProcessingService,
        billing_service: BillingService,
        queue_backend: QueueBackend,
    ) -> None:
        self.settings = settings
        self.storage_service = storage_service
        self.processing_service = processing_service
        self.billing_service = billing_service
        self.queue_backend = queue_backend

    async def create_upload(self, *, db: Session, upload_file: UploadFile, user_id: str | None = None) -> ImageJob:
        if not upload_file.filename:
            raise AppError("Filename is required.", status_code=400, code="filename_required")

        file_bytes = await upload_file.read()
        await upload_file.close()
        validate_upload_file(
            filename=upload_file.filename,
            content_type=upload_file.content_type or "",
            file_bytes=file_bytes,
            allowed_types=self.settings.allowed_image_types,
            max_size_bytes=self.settings.max_upload_size_bytes,
        )

        plan_code = (self.settings.default_plan_code or "free").strip().lower()
        processing_priority = max(int(self.settings.free_processing_priority), 1)
        plan_context = None
        if user_id:
            plan_context, _ = self.billing_service.assert_upload_allowed(db=db, user_id=user_id)
            plan_code = plan_context.plan_code
            processing_priority = plan_context.plan.entitlements.priority_level

        stored = self.storage_service.save_upload_bytes(
            original_filename=upload_file.filename,
            content_type=upload_file.content_type or "application/octet-stream",
            file_bytes=file_bytes,
        )

        image = ImageJob(
            user_id=user_id,
            original_filename=stored.original_filename,
            stored_filename=stored.stored_filename,
            content_type=stored.content_type,
            size_bytes=stored.size_bytes,
            status="uploaded",
            plan_code=plan_code,
            processing_priority=processing_priority,
            upload_path=str(stored.path),
        )

        db.add(image)
        if user_id and plan_context:
            self.billing_service.consume_upload(db=db, user_id=user_id, context=plan_context)
        db.commit()
        db.refresh(image)
        return image

    def get_history(
        self,
        *,
        db: Session,
        limit: int = 20,
        offset: int = 0,
        user_id: str | None = None,
    ) -> tuple[list[ImageJob], int]:
        safe_limit = max(1, min(limit, 100))
        safe_offset = max(0, offset)

        query = db.query(ImageJob).order_by(ImageJob.created_at.desc())
        if user_id:
            query = query.filter(ImageJob.user_id == user_id)
        total = query.count()
        items = query.offset(safe_offset).limit(safe_limit).all()
        return items, total

    def delete_history_item(
        self,
        *,
        db: Session,
        image_id: str,
        user_id: str | None = None,
        delete_files: bool = True,
    ) -> None:
        image = self._get_or_404(db=db, image_id=image_id)
        if user_id and image.user_id != user_id:
            raise AppError(
                "History item not found for this user.",
                status_code=404,
                code="history_not_found",
            )

        if delete_files:
            self.storage_service.delete_local_file(image.upload_path)
            self.storage_service.delete_local_file(image.output_path)

        db.delete(image)
        db.commit()

    def get_result(
        self,
        *,
        db: Session,
        image_id: str,
        user_id: str | None = None,
        process_if_pending: bool = True,
    ) -> ImageJob:
        image = self._get_or_404(db=db, image_id=image_id, user_id=user_id)

        if process_if_pending and image.status in {"uploaded"}:
            self.queue_backend.enqueue(
                self._process_job,
                db=db,
                image_id=image_id,
                priority=max(int(image.processing_priority or 0), 0),
            )
            image = self._get_or_404(db=db, image_id=image_id, user_id=user_id)

        return image

    def _process_job(self, *, db: Session, image_id: str) -> None:
        image = self._get_or_404(db=db, image_id=image_id)
        if image.status in {"processing", "completed"}:
            return

        image.status = "processing"
        image.error_message = None
        image.processing_started_at = datetime.now(UTC)
        image.processing_completed_at = None
        db.add(image)
        db.commit()

        try:
            plan = self.billing_service.resolve_plan(image.plan_code)
            outcome = self.processing_service.process_image(
                Path(image.upload_path),
                request=ProcessingRequest(
                    plan_code=plan.code,
                    ocr_mode=plan.entitlements.ocr_mode,
                    priority_level=image.processing_priority or plan.entitlements.priority_level,
                    pipeline_override=plan.entitlements.pipeline_override,
                ),
            )
            image.status = "completed"
            image.output_path = outcome.output_path
            image.enhanced_image_url = outcome.enhanced_image_url
            image.extracted_text = outcome.extracted_text
            image.detected_mode = outcome.detected_mode
            image.metadata_json = json.dumps(outcome.metadata, ensure_ascii=False)
            image.error_message = None
            image.processing_completed_at = datetime.now(UTC)
        except Exception as exc:
            image.status = "failed"
            image.detected_mode = None
            image.error_message = str(exc)
            image.processing_completed_at = datetime.now(UTC)

        db.add(image)
        db.commit()

    @staticmethod
    def _get_or_404(*, db: Session, image_id: str, user_id: str | None = None) -> ImageJob:
        image = db.query(ImageJob).filter(ImageJob.id == image_id).first()
        if not image:
            raise AppError(
                "Image job not found.",
                status_code=404,
                code="image_not_found",
            )
        if user_id and image.user_id != user_id:
            raise AppError(
                "Image job not found.",
                status_code=404,
                code="image_not_found",
            )
        return image
