from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from .models import OcrVariantPayload


class OcrPreprocessor:
    """Build OCR-friendly image variants to improve extraction accuracy."""

    def build_variants(self, image_path: Path, mode: str = "standard") -> list[OcrVariantPayload]:
        image = self._read_bgr_image(image_path)

        variants: list[OcrVariantPayload] = []

        variants.append(OcrVariantPayload(name="enhanced_original", image=self._bgr_to_pil(image)))

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        denoised = cv2.fastNlMeansDenoising(gray, None, h=10, templateWindowSize=7, searchWindowSize=21)
        variants.append(OcrVariantPayload(name="grayscale_denoised", image=Image.fromarray(denoised)))

        clahe = cv2.createCLAHE(clipLimit=2.4, tileGridSize=(8, 8)).apply(denoised)
        variants.append(OcrVariantPayload(name="contrast_clahe", image=Image.fromarray(clahe)))

        adaptive = cv2.adaptiveThreshold(
            clahe,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            blockSize=31,
            C=9,
        )
        variants.append(OcrVariantPayload(name="adaptive_threshold", image=Image.fromarray(adaptive)))

        _, otsu = cv2.threshold(clahe, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        variants.append(OcrVariantPayload(name="otsu_binary", image=Image.fromarray(otsu)))

        screenshot_variant = self._build_screenshot_variant(image)
        variants.append(OcrVariantPayload(name="screenshot_sharp", image=Image.fromarray(screenshot_variant)))

        if mode.lower().strip() == "quality":
            upscaled = cv2.resize(
                gray,
                None,
                fx=1.7,
                fy=1.7,
                interpolation=cv2.INTER_CUBIC,
            )
            variants.append(OcrVariantPayload(name="quality_upscaled_gray", image=Image.fromarray(upscaled)))

            bilateral = cv2.bilateralFilter(upscaled, d=7, sigmaColor=65, sigmaSpace=65)
            variants.append(OcrVariantPayload(name="quality_bilateral", image=Image.fromarray(bilateral)))

            adaptive_fine = cv2.adaptiveThreshold(
                bilateral,
                255,
                cv2.ADAPTIVE_THRESH_MEAN_C,
                cv2.THRESH_BINARY,
                blockSize=29,
                C=7,
            )
            variants.append(OcrVariantPayload(name="quality_adaptive_fine", image=Image.fromarray(adaptive_fine)))

            morph = cv2.morphologyEx(adaptive_fine, cv2.MORPH_CLOSE, np.ones((2, 2), np.uint8), iterations=1)
            variants.append(OcrVariantPayload(name="quality_morph_close", image=Image.fromarray(morph)))

        return variants

    @staticmethod
    def _read_bgr_image(path: Path) -> np.ndarray:
        data = np.fromfile(path, dtype=np.uint8)
        image = cv2.imdecode(data, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError(f"Failed to decode image for OCR preprocessing: {path}")
        return image

    @staticmethod
    def _bgr_to_pil(image_bgr: np.ndarray) -> Image.Image:
        rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        return Image.fromarray(rgb)

    @staticmethod
    def _build_screenshot_variant(image_bgr: np.ndarray) -> np.ndarray:
        gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
        laplacian = cv2.Laplacian(gray, ddepth=cv2.CV_16S, ksize=3)
        sharpened = cv2.convertScaleAbs(gray + 0.35 * laplacian)
        normalized = cv2.normalize(sharpened, None, 0, 255, cv2.NORM_MINMAX)
        return normalized
