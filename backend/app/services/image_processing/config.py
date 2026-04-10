from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Mapping


@dataclass(slots=True)
class PreprocessConfig:
    enabled: bool = True
    auto_white_balance: bool = True
    clahe_clip_limit_photo: float = 2.2
    clahe_clip_limit_screenshot: float = 2.4
    clahe_clip_limit_document: float = 3.2
    clahe_clip_limit_text_heavy: float = 2.8
    clahe_grid_size_photo: int = 8
    clahe_grid_size_screenshot: int = 8
    clahe_grid_size_document: int = 10
    clahe_grid_size_text_heavy: int = 8


@dataclass(slots=True)
class DenoiseConfig:
    enabled: bool = True
    photo_strength: int = 8
    screenshot_strength: int = 3
    document_strength: int = 2
    text_heavy_strength: int = 4
    color_strength: int = 8
    template_window_size: int = 7
    search_window_size: int = 21


@dataclass(slots=True)
class SharpenConfig:
    enabled: bool = True
    sigma_photo: float = 1.1
    sigma_screenshot: float = 0.8
    sigma_document: float = 0.75
    sigma_text_heavy: float = 0.78
    amount_photo: float = 1.3
    amount_screenshot: float = 1.65
    amount_document: float = 1.55
    amount_text_heavy: float = 1.7
    threshold: int = 2


@dataclass(slots=True)
class ToneConfig:
    enabled: bool = True
    contrast_factor_photo: float = 1.18
    contrast_factor_screenshot: float = 1.3
    contrast_factor_document: float = 1.42
    contrast_factor_text_heavy: float = 1.36
    brightness_factor_photo: float = 1.04
    brightness_factor_screenshot: float = 1.02
    brightness_factor_document: float = 1.08
    brightness_factor_text_heavy: float = 1.05
    gamma_min: float = 0.82
    gamma_max: float = 1.22


@dataclass(slots=True)
class DeskewConfig:
    enabled: bool = True
    apply_for_document: bool = True
    apply_for_text_heavy: bool = True
    min_angle_degrees: float = 0.35
    max_angle_degrees: float = 15.0


@dataclass(slots=True)
class ReadabilityConfig:
    enabled: bool = True
    edge_boost_photo: float = 0.06
    edge_boost_screenshot: float = 0.22
    edge_boost_document: float = 0.16
    edge_boost_text_heavy: float = 0.2


@dataclass(slots=True)
class UpscaleConfig:
    enabled: bool = False
    min_short_side: int = 900


@dataclass(slots=True)
class OutputConfig:
    format: str = "png"
    jpeg_quality: int = 95


@dataclass(slots=True)
class PipelineConfig:
    preprocess: PreprocessConfig = field(default_factory=PreprocessConfig)
    deskew: DeskewConfig = field(default_factory=DeskewConfig)
    denoise: DenoiseConfig = field(default_factory=DenoiseConfig)
    sharpen: SharpenConfig = field(default_factory=SharpenConfig)
    readability: ReadabilityConfig = field(default_factory=ReadabilityConfig)
    tone: ToneConfig = field(default_factory=ToneConfig)
    upscale: UpscaleConfig = field(default_factory=UpscaleConfig)
    output: OutputConfig = field(default_factory=OutputConfig)

    @classmethod
    def from_dict(cls, raw_data: Mapping[str, Any]) -> "PipelineConfig":
        data = dict(raw_data)
        return cls(
            preprocess=PreprocessConfig(**data.get("preprocess", {})),
            deskew=DeskewConfig(**data.get("deskew", {})),
            denoise=DenoiseConfig(**data.get("denoise", {})),
            sharpen=SharpenConfig(**data.get("sharpen", {})),
            readability=ReadabilityConfig(**data.get("readability", {})),
            tone=ToneConfig(**data.get("tone", {})),
            upscale=UpscaleConfig(**data.get("upscale", {})),
            output=OutputConfig(**data.get("output", {})),
        )

    def with_overrides(self, overrides: Mapping[str, Any] | None) -> "PipelineConfig":
        if not overrides:
            return self

        merged = asdict(self)
        deep_merge(merged, dict(overrides))
        return PipelineConfig.from_dict(merged)


def deep_merge(base: dict[str, Any], updates: dict[str, Any]) -> dict[str, Any]:
    for key, value in updates.items():
        if isinstance(value, dict) and isinstance(base.get(key), dict):
            deep_merge(base[key], value)
        else:
            base[key] = value
    return base
