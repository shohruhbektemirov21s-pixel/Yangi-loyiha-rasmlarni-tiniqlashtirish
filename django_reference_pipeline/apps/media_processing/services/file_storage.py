"""
Django default_storage orqali (lokal yoki S3) o'qish/yozish.
"""
from __future__ import annotations

import uuid
from pathlib import Path

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

from apps.media_processing.exceptions import StorageError


def read_storage_file(storage_key: str) -> bytes:
    try:
        with default_storage.open(storage_key, "rb") as f:
            return f.read()
    except Exception as exc:
        raise StorageError(f"Fayl o'qilmadi ({storage_key}): {exc}") from exc


def write_storage_file(data: bytes, folder: str, suffix: str) -> str:
    """
    Natijani saqlaydi, storage kalitini qaytaradi.
    folder: masalan 'results/2025/01'
    """
    name = f"{folder.rstrip('/')}/{uuid.uuid4().hex}{suffix}"
    try:
        saved = default_storage.save(name, ContentFile(data))
        return str(saved)
    except Exception as exc:
        raise StorageError(f"Fayl yozilmadi: {exc}") from exc


def write_storage_file_from_path(src_path: Path, folder: str, suffix: str) -> str:
    data = src_path.read_bytes()
    return write_storage_file(data, folder, suffix)
