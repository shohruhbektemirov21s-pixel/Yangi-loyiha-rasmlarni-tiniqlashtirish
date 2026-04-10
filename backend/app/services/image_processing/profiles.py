from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np


PHOTO_PROFILE = "photo"
SCREENSHOT_PROFILE = "screenshot"
DOCUMENT_PROFILE = "document"
TEXT_HEAVY_PROFILE = "text_heavy"


@dataclass(slots=True)
class ModeDetectionResult:
    mode: str
    confidence: float
    signals: dict[str, float]


def detect_content_mode(image_bgr: np.ndarray) -> ModeDetectionResult:
    """
    Detect likely image mode using lightweight vision heuristics.

    The detector is intentionally modular and conservative. It does not claim
    perfect classification and can be expanded with more modes later.
    """
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)

    edges = cv2.Canny(gray, threshold1=90, threshold2=180)
    edge_density = float(np.mean(edges > 0))

    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    mean_saturation = float(np.mean(hsv[:, :, 1]))
    white_ratio = float(np.mean(gray > 215))

    _, otsu_inv = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    foreground_ratio = float(np.mean(otsu_inv > 0))

    text_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 3))
    text_blocks = cv2.morphologyEx(otsu_inv, cv2.MORPH_CLOSE, text_kernel, iterations=1)
    text_block_ratio = float(np.mean(text_blocks > 0))

    color_variance = float(np.std(image_bgr))

    sat_norm = _clamp01(mean_saturation / 255.0)
    edge_norm = _clamp01(edge_density / 0.22)
    sharp_norm = _clamp01(np.log1p(max(laplacian_var, 0.0)) / 8.0)
    white_norm = _clamp01(white_ratio)
    foreground_norm = _clamp01(foreground_ratio / 0.35)
    text_block_norm = _clamp01(text_block_ratio / 0.52)
    color_var_norm = _clamp01(color_variance / 82.0)

    scores = {
        PHOTO_PROFILE: (
            sat_norm * 0.36 + color_var_norm * 0.24 + (1.0 - white_norm) * 0.20 + (1.0 - foreground_norm) * 0.20
        ),
        SCREENSHOT_PROFILE: edge_norm * 0.34 + (1.0 - sat_norm) * 0.26 + sharp_norm * 0.20 + text_block_norm * 0.20,
        DOCUMENT_PROFILE: white_norm * 0.34 + (1.0 - sat_norm) * 0.26 + foreground_norm * 0.20 + text_block_norm * 0.20,
        TEXT_HEAVY_PROFILE: (
            foreground_norm * 0.34 + edge_norm * 0.26 + text_block_norm * 0.20 + (1.0 - sat_norm) * 0.20
        ),
    }

    mode = max(scores, key=scores.get)

    # Tie-breakers for common ambiguities.
    if scores[DOCUMENT_PROFILE] > 0.60 and white_ratio > 0.58 and sat_norm < 0.35:
        mode = DOCUMENT_PROFILE
    elif scores[TEXT_HEAVY_PROFILE] > 0.60 and foreground_ratio > 0.09 and sat_norm < 0.48:
        mode = TEXT_HEAVY_PROFILE
    elif mode == SCREENSHOT_PROFILE and white_ratio > 0.72 and foreground_ratio > 0.06:
        mode = DOCUMENT_PROFILE

    ranked_scores = sorted(scores.values(), reverse=True)
    top_score = ranked_scores[0]
    second_score = ranked_scores[1] if len(ranked_scores) > 1 else 0.0
    confidence = _clamp01(top_score * 0.35 + (top_score - second_score) * 0.65)

    signals = {
        "edge_density": round(edge_density, 5),
        "mean_saturation": round(mean_saturation, 3),
        "laplacian_var": round(laplacian_var, 3),
        "white_ratio": round(white_ratio, 5),
        "foreground_ratio": round(foreground_ratio, 5),
        "text_block_ratio": round(text_block_ratio, 5),
        "color_variance": round(color_variance, 3),
        "score_photo": round(scores[PHOTO_PROFILE], 5),
        "score_screenshot": round(scores[SCREENSHOT_PROFILE], 5),
        "score_document": round(scores[DOCUMENT_PROFILE], 5),
        "score_text_heavy": round(scores[TEXT_HEAVY_PROFILE], 5),
    }

    return ModeDetectionResult(mode=mode, confidence=confidence, signals=signals)


def infer_content_profile(image_bgr: np.ndarray) -> str:
    """
    Backward-compatible wrapper around smart mode detection.
    """
    return detect_content_mode(image_bgr).mode


def _clamp01(value: float) -> float:
    if value < 0.0:
        return 0.0
    if value > 1.0:
        return 1.0
    return value
