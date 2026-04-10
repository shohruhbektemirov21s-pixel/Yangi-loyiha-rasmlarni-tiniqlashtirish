from __future__ import annotations

from datetime import UTC, datetime

from app.models.image_job import ImageJob
from app.schemas.image import HistoryItemData


def test_history_item_data_reads_detected_mode_from_column() -> None:
    now = datetime.now(UTC)
    image = ImageJob(
        id="job-1",
        original_filename="sample.png",
        stored_filename="sample_stored.png",
        content_type="image/png",
        size_bytes=12345,
        status="completed",
        detected_mode="document",
        upload_path="uploads/sample.png",
        output_path="outputs/sample_enhanced.png",
        enhanced_image_url="/storage/outputs/sample_enhanced.png",
        extracted_text="example text",
        metadata_json='{"detected_mode":"photo"}',
        error_message=None,
        created_at=now,
        updated_at=now,
        processing_started_at=now,
        processing_completed_at=now,
    )

    data = HistoryItemData.from_model(image)
    assert data.detected_mode == "document"
    assert data.original_image_url == "/storage/uploads/sample.png"
    assert data.enhanced_image_url == "/storage/outputs/sample_enhanced.png"
