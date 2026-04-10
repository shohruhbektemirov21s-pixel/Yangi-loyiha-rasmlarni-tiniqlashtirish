from __future__ import annotations

from datetime import UTC, datetime
import uuid

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ImageJob(Base):
    __tablename__ = "image_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(nullable=False)

    status: Mapped[str] = mapped_column(String(32), nullable=False, default="uploaded")
    detected_mode: Mapped[str | None] = mapped_column(String(32), nullable=True)
    plan_code: Mapped[str] = mapped_column(String(32), nullable=False, default="free")
    processing_priority: Mapped[int] = mapped_column(nullable=False, default=1)

    upload_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    output_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    enhanced_image_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    processing_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    processing_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )
