import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services.ffmpeg_media import enhance_video_to_mp4

router = APIRouter()

_READ_CHUNK = 32 * 1024 * 1024


@router.post("")
async def enhance_video(
    file: UploadFile = File(...),
    _user: User = Depends(get_current_user),
):
    """
    Katta va xira videolarni tiniqlashtirish (FFmpeg).
    4K+: yengil unsharp; kichikroq: qo'shimcha hqdn3d.
    """
    settings = get_settings()
    ext = file.filename.split(".")[-1].lower() if "." in (file.filename or "") else "mp4"

    input_id = uuid.uuid4().hex
    input_path = settings.upload_dir / f"{input_id}_xira.{ext}"
    output_path = settings.output_dir / f"{input_id}_tiniq.mp4"

    max_bytes = settings.compress_max_upload_bytes
    total_written = 0
    try:
        with open(input_path, "wb") as out_f:
            while True:
                chunk = await file.read(_READ_CHUNK)
                if not chunk:
                    break
                next_total = total_written + len(chunk)
                if next_total > max_bytes:
                    raise HTTPException(
                        status_code=413,
                        detail=(
                            f"Video juda katta. Maksimal: {settings.compress_max_upload_mb} MB "
                            f"(~{settings.compress_max_upload_mb // 1024} GB). "
                            f"/ File too large."
                        ),
                    )
                out_f.write(chunk)
                total_written = next_total
    except HTTPException:
        input_path.unlink(missing_ok=True)
        raise
    except Exception:
        input_path.unlink(missing_ok=True)
        raise

    if total_written == 0:
        input_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Bo'sh fayl. / Empty file.")

    final_path = enhance_video_to_mp4(input_path, output_path)
    if final_path.resolve() == output_path.resolve() and output_path.is_file() and input_path.exists():
        input_path.unlink(missing_ok=True)

    relative_path = (
        final_path.relative_to(settings.storage_root)
        if final_path.is_relative_to(settings.storage_root)
        else Path(final_path).name
    )
    url = (
        f"{settings.storage_url_prefix}/{relative_path}"
        if isinstance(relative_path, str)
        else f"{settings.storage_url_prefix}/{relative_path.as_posix()}"
    )

    return JSONResponse(
        content={
            "success": True,
            "message": "Video muvaffaqiyatli tiniqlashtirildi",
            "data": {
                "enhanced_url": url,
            },
        }
    )
