from __future__ import annotations

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import Settings, get_settings
from app.core.errors import AppError
from app.db.session import get_db
from app.models.user import User
from app.services.auth_service import AuthService
from app.services.billing import BillingService, PlaceholderPaymentProvider, SubscriptionService, UsageService
from app.services.image_job_service import ImageJobService
from app.services.ocr import OcrService
from app.services.ocr.engines import TesseractOcrEngine
from app.services.processing_service import ProcessingService
from app.services.storage_service import StorageService
from app.workers.queue import QueueBackend, get_queue_backend
from sqlalchemy.orm import Session

bearer_scheme = HTTPBearer(auto_error=False)


def get_auth_service(settings: Settings = Depends(get_settings)) -> AuthService:
    return AuthService(settings=settings)


def get_bearer_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise AppError("Authentication required.", status_code=401, code="auth_required")

    token = credentials.credentials.strip()
    if not token:
        raise AppError("Authentication token is missing.", status_code=401, code="auth_required")
    return token


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(get_bearer_token),
    auth_service: AuthService = Depends(get_auth_service),
) -> User:
    return auth_service.get_user_from_token(db=db, token=token)


def get_current_admin_user(
    settings: Settings = Depends(get_settings),
    user: User = Depends(get_current_user),
) -> User:
    allow = settings.admin_email_allowlist
    if not allow:
        raise AppError(
            "Admin API o'chirilgan. Serverda ADMIN_EMAILS o'rnatilmagan.",
            status_code=403,
            code="admin_disabled",
        )
    if user.email.strip().lower() not in allow:
        raise AppError("Admin huquqi yo'q.", status_code=403, code="admin_forbidden")
    return user


def get_storage_service(settings: Settings = Depends(get_settings)) -> StorageService:
    return StorageService(settings=settings)


def get_ocr_service(settings: Settings = Depends(get_settings)) -> OcrService:
    engine = TesseractOcrEngine(
        language=settings.ocr_language,
        psm=settings.ocr_tesseract_psm,
        oem=settings.ocr_tesseract_oem,
    )
    return OcrService(
        enabled=settings.ocr_enabled,
        preprocess_enabled=settings.ocr_preprocess_enabled,
        timeout_sec=settings.ocr_timeout_sec,
        fallback_message=settings.ocr_fallback_message,
        engine=engine,
    )


def get_processing_service(
    settings: Settings = Depends(get_settings),
    ocr_service: OcrService = Depends(get_ocr_service),
) -> ProcessingService:
    return ProcessingService(settings=settings, ocr_service=ocr_service)


def get_billing_service(settings: Settings = Depends(get_settings)) -> BillingService:
    return BillingService(
        settings=settings,
        subscription_service=SubscriptionService(settings=settings),
        usage_service=UsageService(),
        payment_provider=PlaceholderPaymentProvider(provider_name=settings.payment_provider),
    )


def get_image_job_service(
    settings: Settings = Depends(get_settings),
    storage_service: StorageService = Depends(get_storage_service),
    processing_service: ProcessingService = Depends(get_processing_service),
    billing_service: BillingService = Depends(get_billing_service),
) -> ImageJobService:
    queue_backend: QueueBackend = get_queue_backend(settings)
    return ImageJobService(
        settings=settings,
        storage_service=storage_service,
        processing_service=processing_service,
        billing_service=billing_service,
        queue_backend=queue_backend,
    )
