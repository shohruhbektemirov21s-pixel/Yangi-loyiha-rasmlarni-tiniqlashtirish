"""
Real-ESRGAN CLI chaqiruvi (masalan realesrgan-ncnn-vulkan yoki realesrgan-x4plus).

O'rnatish: https://github.com/xinntao/Real-ESRGAN
Muhit: REALESRGAN_CLI sozlamasi (settings.REALESRGAN_CLI)
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


def run_realesrgan_upscale(input_path: Path, *, scale: int = 4) -> Path:
    """
    Kirish fayliga Real-ESRGAN qo'llaydi, chiqish vaqtinchalik fayliga yozadi.
    CLI mavjud emas bo'lsa — tushunarli xato.
    """
    cli = getattr(settings, "REALESRGAN_CLI", "realesrgan-ncnn-vulkan").strip()
    exe0 = cli.split()[0] if cli else ""
    if not exe0 or not shutil.which(exe0):
        raise ProcessingError(
            f"Real-ESRGAN CLI topilmadi: {cli}. "
            "Ikkilikni PATH ga qo'shing yoki REALESRGAN_CLI ni .env da sozlang."
        )

    out_dir = Path(tempfile.mkdtemp(prefix="esrgan_out_"))
    # Ko'p CLI lar: -i input -o output.png
    output_path = out_dir / "output.png"

    # Vulkan versiyasi misol (sizning CLI ga mos qilib o'zgartiring)
    cmd = [
        cli,
        "-i",
        str(input_path),
        "-o",
        str(output_path),
        "-s",
        str(scale),
    ]

    logger.info("Real-ESRGAN: %s", " ".join(cmd))

    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=3600,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise ProcessingError("Real-ESRGAN vaqti tugadi (timeout).") from exc
    except FileNotFoundError as exc:
        raise ProcessingError(f"CLI bajarilmadi: {cli}") from exc

    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "").strip()[:2000]
        raise ProcessingError(
            f"Real-ESRGAN xato (code {proc.returncode}): {err}",
            exit_code=proc.returncode,
        )

    if not output_path.is_file():
        # Ba'zi CLI lar boshqa nom bilan yozadi — katalogni qidirish
        candidates = list(out_dir.glob("*"))
        images = [p for p in candidates if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}]
        if not images:
            raise ProcessingError("Real-ESRGAN chiqish fayli topilmadi.")
        return images[0]

    return output_path
