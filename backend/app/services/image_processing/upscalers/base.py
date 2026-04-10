from __future__ import annotations

from typing import Protocol

import numpy as np


class UpscaleAdapter(Protocol):
    """Contract for optional super-resolution backends."""

    name: str

    def upscale(self, image_bgr: np.ndarray) -> np.ndarray | None:
        """Return an upscaled image or None if no output was produced."""
        ...
