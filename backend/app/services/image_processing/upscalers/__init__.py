from .base import UpscaleAdapter
from .noop import NoopUpscaler
from .realesrgan import RealESRGANUpscaler

__all__ = ["UpscaleAdapter", "NoopUpscaler", "RealESRGANUpscaler"]
