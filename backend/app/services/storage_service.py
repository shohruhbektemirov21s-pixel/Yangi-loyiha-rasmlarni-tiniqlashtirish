from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import uuid

from app.core.config import Settings


@dataclass(slots=True)
class StoredFile:
    original_filename: str
    stored_filename: str
    path: Path
    size_bytes: int
    content_type: str


class StorageService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def save_upload_bytes(
        self,
        *,
        original_filename: str,
        content_type: str,
        file_bytes: bytes,
    ) -> StoredFile:
        extension = Path(original_filename).suffix.lower() or ".png"
        stored_filename = f"{uuid.uuid4().hex}{extension}"
        destination = self.settings.upload_dir / stored_filename

        destination.write_bytes(file_bytes)

        return StoredFile(
            original_filename=original_filename,
            stored_filename=stored_filename,
            path=destination,
            size_bytes=len(file_bytes),
            content_type=content_type,
        )

    def build_public_output_url(self, output_path: Path) -> str:
        relative = output_path.relative_to(self.settings.storage_root)
        return f"{self.settings.storage_url_prefix}/{relative.as_posix()}"

    def delete_local_file(self, path_value: str | None) -> None:
        if not path_value:
            return

        path = Path(path_value)
        storage_root = self.settings.storage_root.resolve()

        # Support stored relative paths like "uploads/file.png" in addition to
        # absolute storage-root paths.
        if not path.is_absolute():
            path = self.settings.storage_root / path

        try:
            resolved = path.resolve()
            if not resolved.is_relative_to(storage_root):
                return

            if path.exists() and path.is_file():
                path.unlink()
        except OSError:
            # Non-fatal for history deletion.
            return
