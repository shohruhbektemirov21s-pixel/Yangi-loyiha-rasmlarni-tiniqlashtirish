import os
import shutil
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


def _safe_arc_basename(filename: str) -> str:
    name = Path(filename or "file").name
    if not name or name in (".", ".."):
        return "file"
    return name


def _is_already_compressed_archive(filename: str, ext: str) -> bool:
    """
    .tar.gz, .zip va shu kabi fayllar allaqachon siqilgan.
    ZIP(DEFLATE) ichiga qayta o'rash hajmni sezilarli kamaytirmaydi (ko'pincha bir xil yoki kattaroq).
    """
    name = (filename or "").lower()
    ex = (ext or "").lower().lstrip(".")
    if name.endswith((".tar.gz", ".tar.bz2", ".tar.xz", ".tar.zst")):
        return True
    if ex in ("gz", "bz2", "xz", "zip", "7z", "rar", "zst", "br", "lz4", "tgz"):
        return True
    return False


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
    elif _is_already_compressed_archive(file.filename or "", ext):
        # Hajmni "kamaytirish" texnik jihatdan mumkin emas — nusxa chiqaramiz, mijoz chalkashmasin.
        out_name = f"{input_id}_{_safe_arc_basename(file.filename or 'archive')}"
        result_path = settings.output_dir / out_name
        shutil.copy2(input_path, result_path)
        input_path.unlink(missing_ok=True)
        relative_path = (
            result_path.relative_to(settings.storage_root)
            if result_path.is_relative_to(settings.storage_root)
            else Path(result_path).name
        )
        url = f"{settings.storage_url_prefix}/{relative_path.as_posix()}"
        final_size = os.path.getsize(result_path)
        return JSONResponse(
            content={
                "success": True,
                "message": "Fayl allaqachon siqilgan formatda; hajm o'zgarmadi (nusxa tayyor).",
                "data": {
                    "compressed_url": url,
                    "original_size": original_size,
                    "compressed_size": final_size,
                    "compression_skipped": True,
                },
            },
        )
    else:
        import zipfile

        try:
            with zipfile.ZipFile(
                output_path,
                "w",
                compression=zipfile.ZIP_DEFLATED,
                compresslevel=9,
                allowZip64=True,
            ) as zf:
                zf.write(input_path, arcname=_safe_arc_basename(file.filename or "file"))
            result_path = output_path
        except Exception as exc:
            input_path.unlink(missing_ok=True)
            if output_path.exists():
                output_path.unlink(missing_ok=True)
            raise HTTPException(
                status_code=500,
                detail=f"ZIP yaratishda xato (katta fayl yoki disk). / ZIP failed: {exc!s}",
            ) from exc
        if input_path.exists() and result_path.exists() and input_path.resolve() != result_path.resolve():
            input_path.unlink(missing_ok=True)

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
                "compression_skipped": False,
            },
        }
    )
