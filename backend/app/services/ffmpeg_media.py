"""FFmpeg yordamchi funksiyalar: katta video, 4K, codec fallback."""

from __future__ import annotations

import logging
import subprocess
from pathlib import Path

logger = logging.getLogger("imageclear.ffmpeg")


def probe_video_width(path: Path, timeout_sec: int = 120) -> int | None:
    """Video oqimining kengligini aniqlash (4K filtrlash uchun)."""
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-select_streams",
                "v:0",
                "-show_entries",
                "stream=width",
                "-of",
                "csv=p=0",
                str(path),
            ],
            capture_output=True,
            text=True,
            timeout=timeout_sec,
            check=False,
        )
        if result.returncode != 0 or not result.stdout.strip():
            return None
        return int(result.stdout.strip().splitlines()[0])
    except (ValueError, subprocess.TimeoutExpired, OSError) as exc:
        logger.warning("ffprobe width failed for %s: %s", path, exc)
        return None


def compress_video_to_mp4(input_path: Path, output_path: Path) -> Path:
    """
    Videoni MP4 ga siqish: avval libx265, keyin libx264 (codec bo'lmasa).
    Audio: avval copy, keyin AAC.
    """
    common_prefix = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-threads",
        "0",
        "-i",
        str(input_path),
    ]
    tail_faststart = ["-movflags", "+faststart", str(output_path)]

    attempts: list[list[str]] = [
        common_prefix
        + [
            "-c:v",
            "libx265",
            "-crf",
            "28",
            "-preset",
            "medium",
            "-tag:v",
            "hvc1",
            "-c:a",
            "copy",
        ]
        + tail_faststart,
        common_prefix
        + [
            "-c:v",
            "libx265",
            "-crf",
            "28",
            "-preset",
            "fast",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
        ]
        + tail_faststart,
        common_prefix
        + [
            "-c:v",
            "libx264",
            "-crf",
            "23",
            "-preset",
            "medium",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "copy",
        ]
        + tail_faststart,
        common_prefix
        + [
            "-c:v",
            "libx264",
            "-crf",
            "23",
            "-preset",
            "fast",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
        ]
        + tail_faststart,
    ]

    for cmd in attempts:
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=None)
            if result.returncode == 0 and output_path.is_file() and output_path.stat().st_size > 0:
                return output_path
            if result.stderr:
                logger.debug("ffmpeg compress stderr: %s", result.stderr[-2000:])
        except OSError as exc:
            logger.warning("ffmpeg compress run failed: %s", exc)

    return input_path


def enhance_video_to_mp4(input_path: Path, output_path: Path) -> Path:
    """
    Tiniqlashtirish: 4K+ da hqdn3d qiyin/sekin — yengil zanjir.
    """
    width = probe_video_width(input_path)
    # 4K va undan katta: faqat unsharp + yuv420p (60 fps da barqarorroq)
    if width and width >= 1920:
        vf = "format=yuv420p,unsharp=5:5:0.85:5:5:0.0"
    else:
        vf = "format=yuv420p,unsharp=5:5:1.0:5:5:0.0,hqdn3d=1.2:1.2:4:4"

    common = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-threads",
        "0",
        "-i",
        str(input_path),
        "-vf",
        vf,
        "-c:v",
        "libx264",
        "-crf",
        "20",
        "-preset",
        "medium",
        "-pix_fmt",
        "yuv420p",
        "-max_muxing_queue_size",
        "9999",
        "-movflags",
        "+faststart",
    ]

    for audio_mode in ("copy", "aac"):
        cmd = list(common)
        if audio_mode == "copy":
            cmd += ["-c:a", "copy"]
        else:
            cmd += ["-c:a", "aac", "-b:a", "192k"]
        cmd.append(str(output_path))

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=None)
            if result.returncode == 0 and output_path.is_file() and output_path.stat().st_size > 0:
                return output_path
            if result.stderr:
                logger.debug("ffmpeg enhance stderr: %s", result.stderr[-2000:])
        except OSError as exc:
            logger.warning("ffmpeg enhance run failed: %s", exc)

    return input_path
