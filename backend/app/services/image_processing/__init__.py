"""Image enhancement pipeline services."""

from .config import PipelineConfig
from .models import EnhancementResult

__all__ = ["PipelineConfig", "EnhancementResult", "ImageEnhancementService"]


def __getattr__(name: str):
    if name == "ImageEnhancementService":
        from .service import ImageEnhancementService

        return ImageEnhancementService
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
