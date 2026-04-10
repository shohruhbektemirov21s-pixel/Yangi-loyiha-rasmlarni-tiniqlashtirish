from datetime import UTC, datetime

from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.health import HealthData, HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    settings = get_settings()

    return HealthResponse(
        success=True,
        message="Service is healthy.",
        data=HealthData(
            status="ok",
            service=settings.app_name,
            version=settings.app_version,
            timestamp=datetime.now(UTC),
        ),
    )
