"""
FFmpeg orqali videoni siqish (sifatni nazorat qilish uchun CRF / preset).
"""
from __future__ import annotations

import logging
import shutil
import subprocess
import tempfile
from pathlib import Path

from django.conf import settings

from apps.media_processing.exceptions import ProcessingError

logger = logging.getLogger(__name__)


def run_ffmpeg_compress(
    input_path: Path,
    *,
    video_codec: str = "libx264",
    crf: int = 23,
    preset: str = "medium",
    audio_codec: str = "aac",
    audio_bitrate: str = "128k",
) -> Path:
    """
    MP4 chiqish (H.264 + AAC). CRF pastroq = yaxshi sifat, katta fayl.
    """
    ffmpeg = getattr(settings, "FFMPEG_BIN", "ffmpeg")
    if not shutil.which(ffmpeg):
        raise ProcessingError(
            f"ffmpeg topilmadi: {ffmpeg}. O'rnatib PATH ga qo'shing yoki FFMPEG_BIN ni sozlang."
        )

    out = Path(tempfile.mkstemp(suffix=".mp4", prefix="ffmpeg_out_")[1])

    cmd = [
        ffmpeg,
        "-y",
        "-i",
        str(input_path),
        "-c:v",
        video_codec,
        "-crf",
        str(crf),
        "-preset",
        preset,
        "-c:a",
        audio_codec,
        "-b:a",
        audio_bitrate,
        "-movflags",
        "+faststart",
        str(out),
    ]

    logger.info("FFmpeg: %s", " ".join(cmd))

    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=7200,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        out.unlink(missing_ok=True)
        raise ProcessingError("FFmpeg vaqti tugadi (timeout).") from exc

    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "").strip()[:2000]
        out.unlink(missing_ok=True)
        raise ProcessingError(
            f"FFmpeg xato (code {proc.returncode}): {err}",
            exit_code=proc.returncode,
        )

    if not out.is_file() or out.stat().st_size == 0:
        out.unlink(missing_ok=True)
        raise ProcessingError("FFmpeg chiqish fayli bo'sh yoki yo'q.")

    return out
