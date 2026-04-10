import io
import uuid
from unittest import mock

import pytest
from fastapi.testclient import TestClient

# Import the FastAPI app
from app.main import app

client = TestClient(app)

# Helper to create a dummy image file
def dummy_image_bytes() -> bytes:
    # Simple 1x1 PNG binary (base64 decoded)
    return (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
        b"\x00\x00\x00\x0cIDATx\x9cc``\x00\x00\x00\x02\x00\x01\xe2!\xbc3\x00\x00\x00\x00IEND\xaeB`\x82"
    )

@pytest.fixture(autouse=True)
def mock_settings(monkeypatch):
    # Force SQLite in‑memory DB for isolation
    from app.core import config
    monkeypatch.setattr(config.settings, "database_url", "sqlite:///:memory:")
    # Ensure temporary directories exist
    import os
    os.makedirs(config.settings.tmp_upload_dir, exist_ok=True)
    os.makedirs(config.settings.tmp_processed_dir, exist_ok=True)
    yield

def test_upload_image_success(monkeypatch):
    # Mock S3 upload – return a fake URL
    mock_upload = mock.Mock(return_value="https://fake-bucket.s3.amazonaws.com/fake-key")
    monkeypatch.setattr("app.utils.s3.upload_file", mock_upload)

    # Mock Celery task – just ensure .delay is called
    mock_task = mock.Mock()
    monkeypatch.setattr("app.workers.tasks.process_image_job.delay", mock_task)

    # Perform request
    response = client.post(
        "/media/upload",
        files={"file": ("test.png", dummy_image_bytes(), "image/png")},
    )

    assert response.status_code == 202
    json_data = response.json()
    assert "job_id" in json_data
    assert json_data["status"] == "queued"

    # Verify mocks were called
    assert mock_upload.called
    assert mock_task.called
    # The Celery task should have been called with the generated job_id
    called_job_id = mock_task.call_args[0][0]
    assert called_job_id == json_data["job_id"]
