from __future__ import annotations

import cv2
import numpy as np
from PIL import Image, ImageEnhance


def apply_gray_world_white_balance(image_bgr: np.ndarray) -> np.ndarray:
    b, g, r = cv2.split(image_bgr.astype(np.float32))
    mean_b, mean_g, mean_r = np.mean(b), np.mean(g), np.mean(r)
    mean_gray = (mean_b + mean_g + mean_r) / 3.0

    gain_b = mean_gray / (mean_b + 1e-6)
    gain_g = mean_gray / (mean_g + 1e-6)
    gain_r = mean_gray / (mean_r + 1e-6)

    balanced = cv2.merge((b * gain_b, g * gain_g, r * gain_r))
    return np.clip(balanced, 0, 255).astype(np.uint8)


def apply_clahe_on_luminance(
    image_bgr: np.ndarray,
    clip_limit: float,
    grid_size: int,
) -> np.ndarray:
    lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)

    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(grid_size, grid_size))
    l_channel = clahe.apply(l_channel)

    merged = cv2.merge((l_channel, a_channel, b_channel))
    return cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)


def denoise_image(
    image_bgr: np.ndarray,
    strength: int,
    color_strength: int,
    template_window_size: int,
    search_window_size: int,
) -> np.ndarray:
    return cv2.fastNlMeansDenoisingColored(
        image_bgr,
        None,
        h=strength,
        hColor=color_strength,
        templateWindowSize=template_window_size,
        searchWindowSize=search_window_size,
    )


def apply_unsharp_mask(
    image_bgr: np.ndarray,
    sigma: float,
    amount: float,
    threshold: int,
) -> np.ndarray:
    blurred = cv2.GaussianBlur(image_bgr, ksize=(0, 0), sigmaX=sigma)
    sharpened = cv2.addWeighted(image_bgr, 1.0 + amount, blurred, -amount, 0)

    if threshold > 0:
        low_contrast_mask = np.absolute(image_bgr.astype(np.int16) - blurred.astype(np.int16)) < threshold
        sharpened = np.where(low_contrast_mask, image_bgr, sharpened)

    return np.clip(sharpened, 0, 255).astype(np.uint8)


def apply_gamma_balance(
    image_bgr: np.ndarray,
    gamma_min: float,
    gamma_max: float,
) -> np.ndarray:
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    mean_luma = float(np.mean(gray) / 255.0)

    if mean_luma < 0.45:
        gamma = max(gamma_min, 0.95 - (0.45 - mean_luma) * 0.9)
    elif mean_luma > 0.65:
        gamma = min(gamma_max, 1.0 + (mean_luma - 0.65) * 0.8)
    else:
        gamma = 1.0

    lut = np.array([((i / 255.0) ** gamma) * 255 for i in np.arange(256)]).astype("uint8")
    return cv2.LUT(image_bgr, lut)


def apply_pillow_tone_adjustments(
    image_bgr: np.ndarray,
    contrast_factor: float,
    brightness_factor: float,
) -> np.ndarray:
    rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    pil_image = Image.fromarray(rgb)

    pil_image = ImageEnhance.Contrast(pil_image).enhance(contrast_factor)
    pil_image = ImageEnhance.Brightness(pil_image).enhance(brightness_factor)

    back_to_bgr = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
    return back_to_bgr


def apply_edge_readability_boost(image_bgr: np.ndarray, weight: float) -> np.ndarray:
    """
    Add a gentle edge boost to improve UI/text separation.

    This is conservative by design to avoid producing artificial halos.
    """
    if weight <= 0:
        return image_bgr

    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    edge_map = cv2.Laplacian(gray, cv2.CV_16S, ksize=3)
    edge_map = cv2.convertScaleAbs(edge_map)
    edge_map_bgr = cv2.cvtColor(edge_map, cv2.COLOR_GRAY2BGR)

    boosted = cv2.addWeighted(image_bgr, 1.0, edge_map_bgr, weight, 0)
    return np.clip(boosted, 0, 255).astype(np.uint8)


def deskew_image(
    image_bgr: np.ndarray,
    *,
    min_angle_degrees: float = 0.35,
    max_angle_degrees: float = 15.0,
) -> tuple[np.ndarray, float]:
    """
    Correct light geometric skew for document-like images.

    Returns a tuple of (possibly rotated image, applied angle in degrees).
    """
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (3, 3), 0)
    _, binary_inv = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    cleaned = cv2.morphologyEx(binary_inv, cv2.MORPH_OPEN, kernel, iterations=1)
    coords = np.column_stack(np.where(cleaned > 0))

    if coords.shape[0] < 64:
        return image_bgr, 0.0

    angle = float(cv2.minAreaRect(coords.astype(np.float32))[-1])
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle

    if abs(angle) < min_angle_degrees or abs(angle) > max_angle_degrees:
        return image_bgr, 0.0

    height, width = image_bgr.shape[:2]
    center = (width / 2.0, height / 2.0)
    matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(
        image_bgr,
        matrix,
        (width, height),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )

    return rotated, angle
