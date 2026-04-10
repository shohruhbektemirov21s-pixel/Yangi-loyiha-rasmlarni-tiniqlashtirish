"""Backward-compatible import shim for OCR service."""

from app.services.ocr import OcrResult, OcrService

__all__ = ["OcrService", "OcrResult"]
