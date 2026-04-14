from __future__ import annotations

from io import BytesIO

import pytest
from PIL import Image


def test_compress_image_success(client, auth_headers, tmp_path):
    img_path = tmp_path / "test_image.jpg"
    Image.new("RGB", (32, 32), color="blue").save(img_path, format="JPEG")

    with open(img_path, "rb") as f:
        response = client.post(
            "/api/v1/compress",
            files={"file": ("test_image.jpg", f, "image/jpeg")},
            headers=auth_headers,
        )

    assert response.status_code == 200
    data = response.json()
    assert data.get("success") is True
    assert "compressed_url" in data["data"]


def test_compress_requires_auth(client, tmp_path):
    img_path = tmp_path / "x.jpg"
    Image.new("RGB", (8, 8), color="red").save(img_path, format="JPEG")
    with open(img_path, "rb") as f:
        response = client.post(
            "/api/v1/compress",
            files={"file": ("x.jpg", f, "image/jpeg")},
        )
    assert response.status_code == 401


def test_compress_job_status_not_found(client, auth_headers):
    response = client.get(
        "/api/v1/compress/jobs/" + "a" * 32,
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_compress_non_image_zip_branch(client, auth_headers):
    buf = BytesIO(b"hello world doc")
    response = client.post(
        "/api/v1/compress",
        files={"file": ("notes.txt", buf, "text/plain")},
        headers=auth_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body.get("success") is True
