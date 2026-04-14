from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

import cv2
import numpy as np

from .config import PipelineConfig
from .models import ImageMetrics
from .profiles import (
    DOCUMENT_PROFILE,
    SCREENSHOT_PROFILE,
    TEXT_HEAVY_PROFILE,
    detect_content_mode,
)
from .steps import (
    apply_clahe_on_luminance,
    apply_edge_readability_boost,
    apply_gamma_balance,
    apply_gray_world_white_balance,
    apply_pillow_tone_adjustments,
    apply_unsharp_mask,
    deskew_image,
    denoise_image,
)
from .upscalers import NoopUpscaler, UpscaleAdapter


@dataclass(slots=True)
class PipelineRunResult:
    image_bgr: np.ndarray
    profile: str
    detected_mode: str
    detection_confidence: float
    detection_signals: dict[str, float]
    steps_applied: list[str]
    metrics_before: ImageMetrics
    metrics_after: ImageMetrics
    config: PipelineConfig


class ImageEnhancementPipeline:
    def __init__(
        self,
        config: PipelineConfig | None = None,
        upscaler: UpscaleAdapter | None = None,
    ) -> None:
        self.config = config or PipelineConfig()
        self.upscaler = upscaler or NoopUpscaler()

    def run(
        self,
        image_bgr: np.ndarray,
        config_override: Mapping[str, object] | None = None,
    ) -> PipelineRunResult:
        active_config = self.config.with_overrides(config_override)
        detection = detect_content_mode(image_bgr)
        mode = detection.mode
        working = image_bgr.copy()
        steps_applied: list[str] = []

        metrics_before = calculate_metrics(working)

        if _should_apply_deskew(active_config=active_config, mode=mode):
            working, applied_angle = deskew_image(
                working,
                min_angle_degrees=active_config.deskew.min_angle_degrees,
                max_angle_degrees=active_config.deskew.max_angle_degrees,
            )
            if abs(applied_angle) >= active_config.deskew.min_angle_degrees:
                steps_applied.append(f"preprocess:deskew({applied_angle:.2f}deg)")

        if active_config.preprocess.enabled:
            if active_config.preprocess.auto_white_balance:
                working = apply_gray_world_white_balance(working)
                steps_applied.append("preprocess:white_balance")

            working = apply_clahe_on_luminance(
                working,
                clip_limit=_pick_by_mode(
                    mode=mode,
                    photo=active_config.preprocess.clahe_clip_limit_photo,
                    screenshot=active_config.preprocess.clahe_clip_limit_screenshot,
                    document=active_config.preprocess.clahe_clip_limit_document,
                    text_heavy=active_config.preprocess.clahe_clip_limit_text_heavy,
                ),
                grid_size=_pick_by_mode(
                    mode=mode,
                    photo=active_config.preprocess.clahe_grid_size_photo,
                    screenshot=active_config.preprocess.clahe_grid_size_screenshot,
                    document=active_config.preprocess.clahe_grid_size_document,
                    text_heavy=active_config.preprocess.clahe_grid_size_text_heavy,
                ),
            )
            steps_applied.append(f"preprocess:clahe({mode})")

        if active_config.denoise.enabled:
            denoise_strength = _pick_by_mode(
                mode=mode,
                photo=active_config.denoise.photo_strength,
                screenshot=active_config.denoise.screenshot_strength,
                document=active_config.denoise.document_strength,
                text_heavy=active_config.denoise.text_heavy_strength,
            )
            working = denoise_image(
                working,
                strength=denoise_strength,
                color_strength=active_config.denoise.color_strength,
                template_window_size=active_config.denoise.template_window_size,
                search_window_size=active_config.denoise.search_window_size,
            )
            steps_applied.append(f"denoise:{mode}")

        if active_config.sharpen.enabled:
            sigma = _pick_by_mode(
                mode=mode,
                photo=active_config.sharpen.sigma_photo,
                screenshot=active_config.sharpen.sigma_screenshot,
                document=active_config.sharpen.sigma_document,
                text_heavy=active_config.sharpen.sigma_text_heavy,
            )
            amount = _pick_by_mode(
                mode=mode,
                photo=active_config.sharpen.amount_photo,
                screenshot=active_config.sharpen.amount_screenshot,
                document=active_config.sharpen.amount_document,
                text_heavy=active_config.sharpen.amount_text_heavy,
            )
            working = apply_unsharp_mask(
                working,
                sigma=sigma,
                amount=amount,
                threshold=active_config.sharpen.threshold,
            )
            steps_applied.append(f"sharpen:{mode}")

        if active_config.readability.enabled:
            edge_boost = _pick_by_mode(
                mode=mode,
                photo=active_config.readability.edge_boost_photo,
                screenshot=active_config.readability.edge_boost_screenshot,
                document=active_config.readability.edge_boost_document,
                text_heavy=active_config.readability.edge_boost_text_heavy,
            )
            if edge_boost > 0:
                working = apply_edge_readability_boost(working, weight=edge_boost)
                steps_applied.append(f"readability:edge_boost({mode})")

        if active_config.tone.enabled:
            working = apply_gamma_balance(
                working,
                gamma_min=active_config.tone.gamma_min,
                gamma_max=active_config.tone.gamma_max,
            )

            contrast = _pick_by_mode(
                mode=mode,
                photo=active_config.tone.contrast_factor_photo,
                screenshot=active_config.tone.contrast_factor_screenshot,
                document=active_config.tone.contrast_factor_document,
                text_heavy=active_config.tone.contrast_factor_text_heavy,
            )
            brightness = _pick_by_mode(
                mode=mode,
                photo=active_config.tone.brightness_factor_photo,
                screenshot=active_config.tone.brightness_factor_screenshot,
                document=active_config.tone.brightness_factor_document,
                text_heavy=active_config.tone.brightness_factor_text_heavy,
            )
            working = apply_pillow_tone_adjustments(
                working,
                contrast_factor=contrast,
                brightness_factor=brightness,
            )
            steps_applied.append(f"tone:{mode}")

        did_spatial_upscale = False
        if active_config.upscale.enabled:
            shortest_side = min(working.shape[:2])
            if shortest_side < active_config.upscale.min_short_side:
                upscaled = self.upscaler.upscale(working)
                if upscaled is not None:
                    working = upscaled
                    steps_applied.append(f"upscale:{self.upscaler.name}")
                    did_spatial_upscale = True
                else:
                    scale = active_config.upscale.min_short_side / max(shortest_side, 1)
                    target_w = int(round(working.shape[1] * scale))
                    target_h = int(round(working.shape[0] * scale))
                    working = cv2.resize(
                        working,
                        (max(target_w, 1), max(target_h, 1)),
                        interpolation=cv2.INTER_LANCZOS4,
                    )
                    steps_applied.append("upscale:lanczos_fallback")
                    did_spatial_upscale = True

                if did_spatial_upscale and active_config.upscale.post_sharpen_enabled:
                    working = apply_unsharp_mask(
                        working,
                        sigma=active_config.upscale.post_sharpen_sigma,
                        amount=active_config.upscale.post_sharpen_amount,
                        threshold=active_config.upscale.post_sharpen_threshold,
                    )
                    steps_applied.append("post_upscale:unsharp")

        metrics_after = calculate_metrics(working)

        return PipelineRunResult(
            image_bgr=working,
            profile=mode,
            detected_mode=mode,
            detection_confidence=detection.confidence,
            detection_signals=detection.signals,
            steps_applied=steps_applied,
            metrics_before=metrics_before,
            metrics_after=metrics_after,
            config=active_config,
        )


def calculate_metrics(image_bgr: np.ndarray) -> ImageMetrics:
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, threshold1=80, threshold2=160)

    height, width = image_bgr.shape[:2]
    mean_brightness = float(np.mean(gray))
    contrast_std = float(np.std(gray))
    edge_density = float(np.mean(edges > 0))

    return ImageMetrics(
        width=width,
        height=height,
        mean_brightness=mean_brightness,
        contrast_std=contrast_std,
        edge_density=edge_density,
    )


def _pick_by_mode(
    *,
    mode: str,
    photo: float | int,
    screenshot: float | int,
    document: float | int,
    text_heavy: float | int,
) -> float | int:
    if mode == SCREENSHOT_PROFILE:
        return screenshot
    if mode == DOCUMENT_PROFILE:
        return document
    if mode == TEXT_HEAVY_PROFILE:
        return text_heavy
    return photo


def _should_apply_deskew(*, active_config: PipelineConfig, mode: str) -> bool:
    if not active_config.deskew.enabled:
        return False
    if mode == DOCUMENT_PROFILE:
        return active_config.deskew.apply_for_document
    if mode == TEXT_HEAVY_PROFILE:
        return active_config.deskew.apply_for_text_heavy
    return False
