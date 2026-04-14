"""Fon rejimida video kompressiya — uzoq FFmpeg paytida HTTP ulanishi yopilmasin."""

from __future__ import annotations

import os
import threading
import uuid
from pathlib import Path
from typing import Any

_lock = threading.Lock()
_jobs: dict[str, dict[str, Any]] = {}


def job_create() -> str:
    jid = uuid.uuid4().hex
    with _lock:
        _jobs[jid] = {"status": "queued"}
    return jid


def job_update(jid: str, **kwargs: Any) -> None:
    with _lock:
        if jid not in _jobs:
            return
        _jobs[jid] = {**_jobs[jid], **kwargs}


def job_get(jid: str) -> dict[str, Any] | None:
    with _lock:
        return _jobs.get(jid)


def start_video_compress_job(
    job_id: str,
    *,
    input_path: Path,
    output_path: Path,
    storage_root: Path,
    storage_url_prefix: str,
    original_size: int,
) -> None:
    def worker() -> None:
        job_update(job_id, status="processing")
        try:
            from app.services.ffmpeg_media import compress_video_to_mp4

            result_path = compress_video_to_mp4(input_path, output_path)
            if result_path.resolve() == output_path.resolve() and output_path.is_file() and input_path.exists():
                input_path.unlink(missing_ok=True)

            final_output_path = result_path if result_path.exists() else input_path
            relative_path = (
                final_output_path.relative_to(storage_root)
                if final_output_path.is_relative_to(storage_root)
                else Path(final_output_path).name
            )
            url = f"{storage_url_prefix}/{relative_path.as_posix()}"
            job_update(
                job_id,
                status="done",
                data={
                    "compressed_url": url,
                    "original_size": original_size,
                    "compressed_size": os.path.getsize(final_output_path),
                },
            )
        except Exception as exc:
            input_path.unlink(missing_ok=True)
            job_update(job_id, status="failed", error=str(exc))

    threading.Thread(target=worker, daemon=True).start()
