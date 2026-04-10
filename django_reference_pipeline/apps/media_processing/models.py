from django.conf import settings
from django.db import models


class MediaJob(models.Model):
    """Yuklangan fayl va qayta ishlash holati."""

    class FileType(models.TextChoices):
        IMAGE = "image", "Rasm"
        VIDEO = "video", "Video"

    class Status(models.TextChoices):
        PENDING = "pending", "Kutilmoqda"
        PROCESSING = "processing", "Jarayonda"
        COMPLETED = "completed", "Tugallangan"
        FAILED = "failed", "Xato"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="media_jobs",
    )
    file_type = models.CharField(max_length=16, choices=FileType.choices)
    original_filename = models.CharField(max_length=255, blank=True, default="")
    # default_storage (lokal yoki S3) ichidagi kalit / yo'l
    source_key = models.CharField(max_length=512)
    result_key = models.CharField(max_length=512, blank=True, default="")
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    error_message = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"MediaJob({self.pk}, {self.status}, {self.file_type})"
