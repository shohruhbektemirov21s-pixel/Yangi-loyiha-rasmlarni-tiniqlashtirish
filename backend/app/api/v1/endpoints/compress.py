import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services.compress_jobs import job_create, job_get, start_video_compress_job

router = APIRouter()

_READ_CHUNK = 32 * 1024 * 1024  # 32 MB


@router.get("/jobs/{job_id}")
async def compress_job_status(
    job_id: str,
    _user: User = Depends(get_current_user),
):
    state = job_get(job_id)
    if not state:
        raise HTTPException(status_code=404, detail="Vazifa topilmadi. / Job not found.")
    return JSONResponse(content={"success": True, "data": state})


@router.post("")
async def compress_media(
    file: UploadFile = File(...),
    _user: User = Depends(get_current_user),
):
    settings = get_settings()
    ext = file.filename.split(".")[-1].lower() if "." in (file.filename or "") else "bin"
    is_video = ext in ["mp4", "mov", "avi", "mkv", "webm"]
    is_image = ext in ["jpg", "jpeg", "png", "webp", "heic", "bmp", "gif", "svg"]

    input_id = uuid.uuid4().hex
    input_path = settings.upload_dir / f"{input_id}.{ext}"

    if is_video:
        out_ext = "mp4"
    elif is_image:
        out_ext = "webp"
    else:
        out_ext = "zip"

    output_path = settings.output_dir / f"{input_id}_compressed.{out_ext}"

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
                            f"Fayl juda katta. Maksimal: {settings.compress_max_upload_mb} MB "
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
        raise HTTPException(status_code=400, detail="Bo'sh fayl yuborildi. / Empty file.")

    original_size = os.path.getsize(input_path)

    if is_video:
        jid = job_create()
        start_video_compress_job(
            jid,
            input_path=input_path,
            output_path=output_path,
            storage_root=settings.storage_root,
            storage_url_prefix=settings.storage_url_prefix,
            original_size=original_size,
        )
        return JSONResponse(
            status_code=202,
            content={
                "success": True,
                "message": "Video qabul qilindi; siqish fon rejimida davom etmoqda.",
                "data": {"job_id": jid, "status": "queued"},
            },
        )

    if is_image:
        from PIL import Image

        try:
            img = Image.open(input_path)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            img.save(output_path, "WEBP", quality=60, optimize=True)
            result_path = output_path
        except Exception:
            result_path = input_path
    else:
        import zipfile

        try:
            with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
                zf.write(input_path, arcname=file.filename or "file")
            result_path = output_path
        except Exception:
            result_path = input_path

    relative_path = (
        result_path.relative_to(settings.storage_root)
        if result_path.is_relative_to(settings.storage_root)
        else Path(result_path).name
    )
    url = (
        f"{settings.storage_url_prefix}/{relative_path}"
        if isinstance(relative_path, str)
        else f"{settings.storage_url_prefix}/{relative_path.as_posix()}"
    )

    final_output_path = result_path if result_path.exists() else input_path

    return JSONResponse(
        content={
            "success": True,
            "message": "Fayl muvaffaqiyatli siqildi (kompressiya)",
            "data": {
                "compressed_url": url,
                "original_size": original_size,
                "compressed_size": os.path.getsize(final_output_path),
            },
        }
    )
