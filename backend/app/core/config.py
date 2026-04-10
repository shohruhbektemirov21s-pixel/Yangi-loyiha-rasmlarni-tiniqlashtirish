from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "ImageClear AI API"
    app_version: str = "0.1.0"
    env: str = "development"
    debug: bool = False

    api_v1_prefix: str = "/api/v1"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    database_url: str = "sqlite:///./imageclear.db"

    storage_root: Path = Path("storage")
    upload_dir: Path = Path("storage/uploads")
    output_dir: Path = Path("storage/outputs")
    storage_url_prefix: str = "/storage"

    max_upload_size_mb: int = 20
    # Kompressiya / video (multipart). 20480 MB ≈ 20 GB.
    compress_max_upload_mb: int = 20480
    allowed_image_types: list[str] = Field(
        default_factory=lambda: [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
        ]
    )

    queue_backend: str = "sync"
    queue_priority_enabled: bool = True

    jwt_secret_key: str = "change-this-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 1440
    auth_password_min_length: int = 8

    ocr_enabled: bool = True
    ocr_language: str = "eng"
    ocr_tesseract_psm: int = 6
    ocr_tesseract_oem: int = 3
    ocr_timeout_sec: int = 12
    ocr_preprocess_enabled: bool = True
    ocr_fallback_message: str = "No readable text could be extracted from the image."

    default_plan_code: str = "free"
    # Obuna chegarasi hozircha yechildi (Limitsiz qilingan)
    free_daily_upload_limit: int = 99999999
    premium_daily_upload_limit: int = 99999999
    free_processing_priority: int = 10
    premium_processing_priority: int = 10
    free_ocr_mode: str = "standard"
    premium_ocr_mode: str = "quality"
    premium_upscale_min_short_side: int = 1400
    premium_monthly_price_usd: int = 19
    payment_provider: str = "placeholder"

    real_esrgan_enabled: bool = False
    real_esrgan_model_path: str = ""

    @field_validator("debug", mode="before")
    @classmethod
    def normalize_debug_flag(cls, value: object) -> bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return bool(value)
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "on", "debug", "development", "dev"}:
                return True
            if normalized in {"0", "false", "no", "off", "release", "prod", "production"}:
                return False
        return False

    def ensure_directories(self) -> None:
        self.storage_root.mkdir(parents=True, exist_ok=True)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    @property
    def compress_max_upload_bytes(self) -> int:
        return self.compress_max_upload_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.ensure_directories()
    return settings
