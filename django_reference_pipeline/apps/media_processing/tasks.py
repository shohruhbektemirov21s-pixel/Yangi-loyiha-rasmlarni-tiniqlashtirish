"""
Celery vazifalari: Real-ESRGAN / FFmpeg + natijani storage ga yozish.
"""
from __future__ import annotations

import logging
import shutil
import tempfile
from pathlib import Path

from celery import shared_task
from django.db import transaction

from apps.media_processing.exceptions import ProcessingError, StorageError
from apps.media_processing.models import MediaJob
from apps.media_processing.services import (
    read_storage_file,
    run_ffmpeg_compress,
    run_realesrgan_upscale,
    write_storage_file,
    write_storage_file_from_path,
)

logger = logging.getLogger(__name__)


def _process_job_body(job: MediaJob) -> str:
    """
    Asosiy pipeline. Qaytadi: result_key (storage ichida).
    """
    raw = read_storage_file(job.source_key)
    suffix_in = Path(job.original_filename or "in.bin").suffix or (
        ".png" if job.file_type == MediaJob.FileType.IMAGE else ".mp4"
    )

    with tempfile.TemporaryDirectory(prefix=f"job_{job.pk}_") as tmp:
        src = Path(tmp) / f"input{suffix_in}"
        src.write_bytes(raw)

        if job.file_type == MediaJob.FileType.IMAGE:
            out_local = run_realesrgan_upscale(src, scale=4)
            try:
                data = out_local.read_bytes()
                suffix = (out_local.suffix or ".png").lower()
                if suffix not in {".png", ".jpg", ".jpeg", ".webp"}:
                    suffix = ".png"
                folder = f"results/{job.user_id}"
                return write_storage_file(data, folder, suffix)
            finally:
                shutil.rmtree(out_local.parent, ignore_errors=True)

        if job.file_type == MediaJob.FileType.VIDEO:
            dest_tmp = run_ffmpeg_compress(src)
            try:
                folder = f"results/{job.user_id}"
                return write_storage_file_from_path(dest_tmp, folder, ".mp4")
            finally:
                dest_tmp.unlink(missing_ok=True)

        raise ProcessingError(f"Noma'lum fayl turi: {job.file_type}")


@shared_task
def process_media_job(job_id: int) -> None:
    """
    Navbatdan chaqiriladi. Holat: pending -> processing -> completed | failed
    """
    try:
        with transaction.atomic():
            job = MediaJob.objects.select_for_update().get(pk=job_id)
            if job.status != MediaJob.Status.PENDING:
                logger.info("Job %s allaqachon %s — o'tkazib yuborildi.", job_id, job.status)
                return
            job.status = MediaJob.Status.PROCESSING
            job.error_message = ""
            job.save(update_fields=["status", "error_message", "updated_at"])
    except MediaJob.DoesNotExist:
        logger.warning("MediaJob %s topilmadi.", job_id)
        return

    try:
        result_key = _process_job_body(job)
        job.result_key = result_key
        job.status = MediaJob.Status.COMPLETED
        job.save(update_fields=["result_key", "status", "updated_at"])
        logger.info("Job %s tugallandi: %s", job_id, result_key)
    except (ProcessingError, StorageError, OSError, ValueError) as exc:
        logger.exception("Job %s muvaffaqiyatsiz: %s", job_id, exc)
        job.status = MediaJob.Status.FAILED
        job.error_message = str(exc)[:5000]
        job.save(update_fields=["status", "error_message", "updated_at"])
    except Exception as exc:  # noqa: BLE001 — navbatda hamma narsani ushlaymiz
        logger.exception("Job %s kutilmagan xato: %s", job_id, exc)
        job.status = MediaJob.Status.FAILED
        job.error_message = f"Ichki xato: {exc}"[:5000]
        job.save(update_fields=["status", "error_message", "updated_at"])
        raise
