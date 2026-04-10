import pytest
from datetime import datetime, timezone
from app.models.image_job import ImageJob
from app.models.user import User

def test_image_job_creation(db_session):
    user = User(id="test_user_id", email="test@example.com", is_active=True)
    db_session.add(user)
    db_session.commit()

    job = ImageJob(
        user_id=user.id,
        original_filename="test.jpg",
        stored_filename="test_123.jpg",
        content_type="image/jpeg",
        size_bytes=1024,
        upload_path="uploads/test.jpg",
    )
    db_session.add(job)
    db_session.commit()
    
    assert job.id is not None
    assert job.status == "uploaded"
    assert job.created_at is not None
    assert job.updated_at is not None

def test_image_job_defaults(db_session):
    job = ImageJob(
        original_filename="test.png",
        stored_filename="test_456.png",
        content_type="image/png",
        size_bytes=2048,
        upload_path="uploads/test.png",
    )
    db_session.add(job)
    db_session.commit()
    
    assert job.plan_code == "free"
    assert job.processing_priority == 1
    assert job.detected_mode is None
    assert job.output_path is None
    assert job.error_message is None
